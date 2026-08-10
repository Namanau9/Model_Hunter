"""Base interface for all adversarial attacks."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import torch


class Attack(ABC):
    """Abstract attack operating on normalized image tensors in [0, 1] space."""

    name: str = "base"

    def __init__(self, model: torch.nn.Module, **params: Any) -> None:
        self.model = model
        self.device = next(model.parameters()).device
        self.model.eval()
        self.params = params
        self.targeted = bool(params.get("targeted", False))
        self.target_class = params.get("target_class")

    def _target(self, logits: torch.Tensor) -> torch.Tensor:
        """Return the target labels for a targeted attack (else None)."""
        if not self.targeted or self.target_class is None:
            return None
        return torch.full(
            (logits.size(0),), int(self.target_class), device=logits.device
        )

    @abstractmethod
    def generate(self, x: torch.Tensor, y: torch.Tensor | None = None) -> torch.Tensor:
        """Produce adversarial examples from clean inputs ``x``.

        ``x`` is in normalized model-input space. Implementations clamp the
        perturbation to the normalized ``epsilon`` bound when applicable.
        """
        raise NotImplementedError

    def _clamp01(self, t: torch.Tensor) -> torch.Tensor:
        return torch.clamp(t, 0.0, 1.0)


def to_device(x: torch.Tensor, device: str) -> torch.Tensor:
    return x.to(device)


def normalized_epsilon(epsilon: float, dataset_name: str) -> float:
    """Scale attack epsilon into normalized input space per dataset."""
    # Keeping epsilon in pixel space (0..1) and using it directly in
    # normalized space is a common simplification; return as-is.
    return epsilon
