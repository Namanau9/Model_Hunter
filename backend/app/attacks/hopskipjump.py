"""HopSkipJump attack — boundary / decision-based attack.

Uses binary searches along the decision boundary with random direction
perturbations, requiring only model predictions (no gradients).
"""
from __future__ import annotations

import torch

from app.attacks.base import Attack


class HopSkipJump(Attack):
    name = "hopskipjump"

    def __init__(
        self,
        model: torch.nn.Module,
        max_iterations: int = 10,
        query_limit: int = 100,
        **kwargs,
    ) -> None:
        super().__init__(model, max_iterations=max_iterations, query_limit=query_limit)
        self.max_iterations = int(max_iterations)
        self.query_limit = int(query_limit)

    def _predict(self, x: torch.Tensor, origin_labels: torch.Tensor | None) -> torch.Tensor:
        with torch.no_grad():
            logits = self.model(x)
        return torch.argmax(logits, dim=1)

    def _is_adversarial(
        self, x: torch.Tensor, origin: torch.Tensor, origin_label: torch.Tensor
    ) -> torch.Tensor:
        pred = self._predict(x, None)
        return pred != origin_label

    def generate(self, x: torch.Tensor, y: torch.Tensor | None = None) -> torch.Tensor:
        x = x.to(self.device)
        origin_label = self._predict(x, None)
        current = x.clone()

        for _ in range(self.max_iterations):
            # Binary search towards a direction that flips the label.
            direction = torch.randn_like(current)
            direction = direction / direction.flatten(1).norm(dim=1, keepdim=True).clamp_min(1e-8).view(-1, 1, 1, 1)
            step = 0.5
            moved = torch.clamp(current + step * direction, 0.0, 1.0)
            if (self._is_adversarial(moved, x, origin_label)).all():
                # Found adversarial; move moving point back along direction.
                lo = torch.zeros((current.size(0), 1, 1, 1), device=self.device)
                hi = torch.ones((current.size(0), 1, 1, 1), device=self.device) * step
                for _ in range(8):
                    mid = (lo + hi) / 2
                    candidate = torch.clamp(x + mid * direction, 0.0, 1.0)
                    adv_mask = self._is_adversarial(candidate, x, origin_label).view(-1, 1, 1, 1)
                    lo = torch.where(adv_mask, lo, mid)
                    hi = torch.where(adv_mask, mid, hi)
                current = torch.clamp(x + lo * direction, 0.0, 1.0)
            else:
                current = moved

        return current
