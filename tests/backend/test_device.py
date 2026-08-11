"""Unit tests for device resolution and telemetry.

No physical GPU is required — availability flags are patched so the full
resolution matrix and fallback behaviour can be verified on any host.
"""
from __future__ import annotations

from types import SimpleNamespace

import pytest
import torch

from app.utils import device as device_mod
from app.utils.device import get_device_info, reset_device_cache, resolve_device


@pytest.fixture(autouse=True)
def _reset_cache():
    reset_device_cache()
    yield
    reset_device_cache()


def _patch_backends(monkeypatch, cuda: bool, mps: bool) -> None:
    monkeypatch.setattr(device_mod.torch.cuda, "is_available", lambda: cuda)
    monkeypatch.setattr(device_mod, "mps_available", lambda: mps)


def test_auto_falls_back_to_cpu(monkeypatch):
    _patch_backends(monkeypatch, cuda=False, mps=False)
    assert resolve_device("auto") == torch.device("cpu")


def test_auto_prefers_cuda(monkeypatch):
    _patch_backends(monkeypatch, cuda=True, mps=False)
    assert resolve_device("auto") == torch.device("cuda")


def test_auto_prefers_mps_when_no_cuda(monkeypatch):
    _patch_backends(monkeypatch, cuda=False, mps=True)
    assert resolve_device("auto") == torch.device("mps")


def test_explicit_cpu_stays_cpu(monkeypatch):
    _patch_backends(monkeypatch, cuda=True, mps=True)
    assert resolve_device("cpu") == torch.device("cpu")


def test_unavailable_cuda_falls_back_to_cpu(monkeypatch):
    _patch_backends(monkeypatch, cuda=False, mps=False)
    assert resolve_device("cuda") == torch.device("cpu")


def test_unavailable_mps_falls_back_to_cpu(monkeypatch):
    _patch_backends(monkeypatch, cuda=False, mps=False)
    assert resolve_device("mps") == torch.device("cpu")


def test_valid_cuda_index(monkeypatch):
    monkeypatch.setattr(device_mod.torch.cuda, "is_available", lambda: True)
    monkeypatch.setattr(device_mod.torch.cuda, "device_count", lambda: 2)
    assert resolve_device("cuda:1") == torch.device("cuda:1")


def test_out_of_range_cuda_index_falls_back(monkeypatch):
    monkeypatch.setattr(device_mod.torch.cuda, "is_available", lambda: True)
    monkeypatch.setattr(device_mod.torch.cuda, "device_count", lambda: 1)
    assert resolve_device("cuda:5") == torch.device("cpu")


def test_unknown_preference_falls_back_to_cpu(monkeypatch):
    _patch_backends(monkeypatch, cuda=False, mps=False)
    assert resolve_device("quantum") == torch.device("cpu")


def test_requires_pin_memory_only_for_cuda():
    assert device_mod.requires_pin_memory(torch.device("cuda")) is True
    assert device_mod.requires_pin_memory(torch.device("cpu")) is False
    assert device_mod.requires_pin_memory("mps") is False


def test_device_info_cpu(monkeypatch):
    monkeypatch.setattr(device_mod, "get_device", lambda: torch.device("cpu"))
    monkeypatch.setattr(device_mod.torch.cuda, "is_available", lambda: False)
    monkeypatch.setattr(device_mod, "mps_available", lambda: False)
    info = get_device_info()
    assert info["type"] == "cpu"
    assert info["name"] == "CPU"
    assert info["cuda_available"] is False
    assert info["torch_version"]


def test_device_info_cuda(monkeypatch):
    monkeypatch.setattr(device_mod, "get_device", lambda: torch.device("cuda:0"))
    monkeypatch.setattr(device_mod.torch.cuda, "device_count", lambda: 1)
    monkeypatch.setattr(
        device_mod.torch.cuda,
        "get_device_properties",
        lambda dev: SimpleNamespace(total_memory=8 * 1024**3, major=8, minor=6, name="NVIDIA Fake"),
    )
    monkeypatch.setattr(device_mod.torch.cuda, "get_device_name", lambda dev: "NVIDIA Fake")
    monkeypatch.setattr(device_mod.torch, "version", SimpleNamespace(cuda="12.4"))
    info = get_device_info()
    assert info["type"] == "cuda"
    assert info["name"] == "NVIDIA Fake"
    assert info["vram_gb"] == 8.0
    assert info["compute_capability"] == "8.6"
    assert info["cuda_version"] == "12.4"