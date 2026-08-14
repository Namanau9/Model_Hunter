"""Device resolution and telemetry for ML workloads.

ModelHunter supports three backends: CPU, NVIDIA CUDA GPUs and Apple Silicon
MPS (Metal). Selection is driven by the ``DEVICE`` setting (``auto`` by
default) and resolved at runtime with a graceful CPU fallback so the
application always boots — even when a requested accelerator is absent.

The module also exposes a small reentrant lock (``gpu_execution``) so long
GPU-heavy jobs (training / adversarial generation) can serialize against each
other and avoid exhausting the accelerator's memory pool.
"""
from __future__ import annotations

import functools
import logging
import threading
from contextlib import contextmanager
from typing import Optional

import torch

from app.config.settings import get_settings

logger = logging.getLogger("modelhunter.device")

# Serialises heavy ML jobs so concurrent API calls don't overflow GPU memory.
_ml_lock = threading.RLock()


def mps_available() -> bool:
    """Whether the Apple Silicon Metal Performance Shaders backend is usable."""
    mps_backend = getattr(torch.backends, "mps", None)
    return bool(mps_backend is not None and mps_backend.is_available())


def resolve_device(preference: Optional[str] = None) -> torch.device:
    """Resolve a torch device from a preference string.

    Supported values: ``auto``, ``cpu``, ``cuda``, ``cuda:<index>``, ``mps``.

    - ``auto`` selects the fastest available backend: CUDA > MPS > CPU.
    - An explicitly requested accelerator that is unavailable (or an unknown
      value) logs a warning and falls back to ``cpu`` instead of failing.
    """
    pref = (preference or get_settings().device or "auto").strip().lower()
    try:
        if pref in ("", "auto"):
            if torch.cuda.is_available():
                return torch.device("cuda")
            if mps_available():
                return torch.device("mps")
            return torch.device("cpu")

        if pref == "cpu":
            return torch.device("cpu")

        if pref in ("cuda", "cuda:0"):  # shorthand
            if not torch.cuda.is_available():
                raise RuntimeError("CUDA is not available on this host")
            return torch.device("cuda" if pref == "cuda" else "cuda:0")

        if pref.startswith("cuda:"):
            if not torch.cuda.is_available():
                raise RuntimeError("CUDA is not available on this host")
            index = int(pref.split(":", 1)[1])
            if index >= torch.cuda.device_count():
                raise IndexError(
                    f"CUDA device index {index} out of range (device_count={torch.cuda.device_count()})"
                )
            return torch.device(pref)

        if pref == "mps":
            if not mps_available():
                raise RuntimeError("MPS is not available on this host")
            return torch.device("mps")

        raise ValueError(f"Unknown DEVICE value '{pref}'")
    except Exception as exc:  # noqa: BLE001 - fallback must never crash boot
        logger.warning("Device '%s' unavailable (%s); falling back to CPU", pref, exc)
        return torch.device("cpu")


@functools.lru_cache(maxsize=1)
def get_device() -> torch.device:
    """Return the resolved runtime device (cached for the process lifetime)."""
    device = resolve_device()
    logger.info("ML device resolved: %s", device)
    return device


def reset_device_cache() -> None:
    """Clear the cached device (useful in tests and env re-configuration)."""
    get_device.cache_clear()


def requires_pin_memory(device) -> bool:
    """Whether DataLoaders should use pinned host memory for this device."""
    dev = device if isinstance(device, torch.device) else torch.device(str(device))
    return dev.type == "cuda"


def get_device_info() -> dict:
    """Return a serializable telemetry block for the active device."""
    device = get_device()
    settings = get_settings()
    info: dict = {
        "preference": settings.device or "auto",
        "active": str(device),
        "type": device.type,
        "torch_version": torch.__version__,
    }

    if device.type == "cuda":
        props = torch.cuda.get_device_properties(device)
        info.update(
            {
                "cuda_available": True,
                "mps_available": False,
                "device_count": torch.cuda.device_count(),
                "name": torch.cuda.get_device_name(device),
                "compute_capability": f"{props.major}.{props.minor}",
                "vram_gb": round(props.total_memory / (1024**3), 2),
                "cuda_version": torch.version.cuda or "unknown",
            }
        )
    elif device.type == "mps":
        info.update(
            {
                "cuda_available": False,
                "mps_available": True,
                "device_count": 1,
                "name": "Apple Silicon (Metal)",
                "compute_capability": None,
                "vram_gb": None,
                "cuda_version": None,
            }
        )
    else:
        info.update(
            {
                "cuda_available": bool(torch.cuda.is_available()),
                "mps_available": mps_available(),
                "device_count": 1,
                "name": "CPU",
                "compute_capability": None,
                "vram_gb": None,
                "cuda_version": None,
            }
        )

    # cudnn version is best-effort (not present on all builds).
    try:
        cudnn = torch.backends.cudnn.version() if torch.backends.cudnn.is_available() else None
    except Exception:  # noqa: BLE001
        cudnn = None
    info["cudnn_version"] = cudnn
    return info


@contextmanager
def gpu_execution():
    """Serialize heavy ML work so parallel requests can't exhaust accelerator memory."""
    with _ml_lock:
        yield