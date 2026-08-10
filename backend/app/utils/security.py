"""Security helpers: file upload validation and safe deserialization."""
from __future__ import annotations

from pathlib import Path

from app.config.settings import get_settings


class UploadValidationError(Exception):
    """Raised when an uploaded file fails validation."""


def validate_model_upload(filename: str, size_bytes: int) -> None:
    """Validate a model checkpoint upload (extension + size + name safety)."""
    settings = get_settings()

    name = Path(filename).name
    if name != filename or "/" in filename or "\\" in filename:
        raise UploadValidationError("Filename must not contain path separators.")

    ext = Path(filename).suffix.lower()
    if ext not in settings.allowed_model_extensions:
        raise UploadValidationError(
            f"Unsupported model extension '{ext}'. Allowed: "
            f"{', '.join(settings.allowed_model_extensions)}."
        )
    if size_bytes <= 0:
        raise UploadValidationError("Uploaded file is empty.")
    if size_bytes > settings.max_upload_bytes:
        raise UploadValidationError("Uploaded file exceeds the size limit.")


def safe_load_state_dict(path: Path):
    """Load a checkpoint dict with weights_only=True to prevent code execution.

    PyTorch 2.x supports ``weights_only=True`` which blocks arbitrary pickle
    object construction (a known RCE vector for untrusted checkpoints).
    Falls back to a map-location of stringify to keep entries JSON-safe.
    """
    import torch

    return torch.load(path, map_location="cpu", weights_only=True)
