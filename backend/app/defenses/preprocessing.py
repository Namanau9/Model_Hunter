"""Input Preprocessing Defense: Gaussian blur, JPEG compression, feature squeezing."""
from __future__ import annotations

import torch
import torch.nn as nn

from app.defenses.base import Defense


class _PreprocessWrapper(nn.Module):
    def __init__(self, model: nn.Module, transform_fn) -> None:
        super().__init__()
        self.model = model
        self._transform = transform_fn

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self._transform(x)
        self.model.eval()
        return self.model(x)


def _feature_squeeze(x: torch.Tensor, levels: int = 7) -> torch.Tensor:
    """Quantize pixels into ``levels`` bins (feature squeezing defense)."""
    x01 = (x - x.min()) / (x.max() - x.min() + 1e-8)
    q = (x01 * (levels - 1)).round() / (levels - 1)
    # Re-scale back toward original range approximately.
    orig_min, orig_max = x.min(), x.max()
    return q * (orig_max - orig_min) + orig_min


def _gaussian_blur(x: torch.Tensor) -> torch.Tensor:
    return torch.nn.functional.avg_pool2d(x, kernel_size=3, stride=1, padding=1)


def _jpeg_like(x: torch.Tensor) -> torch.Tensor:
    """Approximate JPEG compression via down/up-sampling (blocky)."""
    c = x.size(1)
    h, w = x.size(2), x.size(3)
    small = torch.nn.functional.interpolate(x, size=(h // 2, w // 2), mode="bilinear", align_corners=False)
    return torch.nn.functional.interpolate(small, size=(h, w), mode="bilinear", align_corners=False)


def _none(x: torch.Tensor) -> torch.Tensor:
    return x


PREPROCESSORS = {
    "none": _none,
    "gaussian_blur": _gaussian_blur,
    "jpeg": _jpeg_like,
    "feature_squeezing": _feature_squeeze,
}


class InputPreprocessing(Defense):
    name = "input_preprocessing"

    def __init__(self, model: nn.Module, method: str = "gaussian_blur", **params) -> None:
        super().__init__(model, method=method)
        if method not in PREPROCESSORS:
            raise KeyError(
                f"Unknown preprocessing method '{method}'. "
                f"Available: {list(PREPROCESSORS.keys())}"
            )
        self.method = method
        self.wrapper = _PreprocessWrapper(model, PREPROCESSORS[method])

    def wrap(self) -> nn.Module:
        return self.wrapper
