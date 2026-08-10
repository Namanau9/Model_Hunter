"""Projected Gradient Descent (PGD) attack."""
from __future__ import annotations

import torch

from app.attacks.base import Attack


class PGD(Attack):
    name = "pgd"

    def __init__(
        self,
        model: torch.nn.Module,
        epsilon: float = 0.1,
        steps: int = 10,
        step_size: float | None = None,
        random_start: bool = True,
        **kwargs,
    ) -> None:
        super().__init__(
            model, epsilon=epsilon, steps=steps, step_size=step_size,
            random_start=random_start, **kwargs
        )
        self.epsilon = float(epsilon)
        self.steps = int(steps)
        self.step_size = float(step_size) if step_size else float(epsilon) / max(self.steps, 1) * 2.0
        self.random_start = bool(random_start)

    def generate(self, x: torch.Tensor, y: torch.Tensor | None = None) -> torch.Tensor:
        x = self._clamp01(x.clone().to(self.device))
        adv = x.clone()
        if self.random_start:
            adv = adv + (torch.empty_like(adv).uniform_(-self.epsilon, self.epsilon))
            adv = self._clamp01(adv)

        target = None
        if self.targeted and self.target_class is not None:
            target = torch.full((x.size(0),), int(self.target_class), device=self.device)
        for _ in range(self.steps):
            adv_ = adv.clone().requires_grad_(True)
            logits = self.model(adv_)
            if target is not None:
                loss = torch.nn.functional.cross_entropy(logits, target)
                grad = torch.autograd.grad(loss, adv_)[0]
                adv = adv_ - self.step_size * grad.sign()
            else:
                loss = torch.nn.functional.cross_entropy(logits, y)
                grad = torch.autograd.grad(loss, adv_)[0]
                adv = adv_ + self.step_size * grad.sign()
            # Project back into the epsilon ball around x and [0,1].
            adv = torch.clamp(adv, x - self.epsilon, x + self.epsilon)
            adv = self._clamp01(adv.detach())

        return adv
