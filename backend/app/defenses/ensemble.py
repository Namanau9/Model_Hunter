"""Ensemble Defense — majority voting across CNN + ResNet18 + MobileNetV2."""
from __future__ import annotations

import torch
import torch.nn as nn

from app.defenses.base import Defense


class _EnsembleWrapper(nn.Module):
    """Combines several models via majority vote of hard predictions."""

    def __init__(self, models: list[nn.Module]) -> None:
        super().__init__()
        self.models = nn.ModuleList(models)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        logits_sum = None
        for model in self.models:
            model.eval()
            logits = model(x)
            if logits_sum is None:
                logits_sum = torch.zeros_like(logits)
            logits_sum = logits_sum + logits
        return logits_sum


class EnsembleDefense(Defense):
    name = "ensemble"

    def __init__(self, models: list[nn.Module], **params) -> None:
        # models is a list; base expects a single model but we store the list.
        self.models = models
        self.wrapper = _EnsembleWrapper(models)
        super().__init__(self.wrapper, **params)

    def wrap(self) -> nn.Module:
        return self.wrapper
