"""Base interface for defenses."""
from __future__ import annotations

from abc import ABC
from typing import Any

import torch


class Defense(ABC):
    """A defense wraps a model and optionally transforms inputs/improves it."""

    name: str = "base"

    def __init__(self, model: torch.nn.Module, **params: Any) -> None:
        self.model = model
        self.params = params

    def wrap(self) -> torch.nn.Module:
        """Return the (possibly wrapped) model to be used for evaluation."""
        return self.model

    def transform(self, x: torch.Tensor) -> torch.Tensor:
        """Apply input-space preprocessing if the defense uses it."""
        return x
