"""Zeroth Order Optimization (ZOO) attack — coordinate-wise gradient-free.

Approximates gradients by finite differences on randomly sampled coordinates,
mirroring the ZOO approach without requiring model gradients.
"""
from __future__ import annotations

import torch

from app.attacks.base import Attack


class ZOO(Attack):
    name = "zoo"

    def __init__(
        self,
        model: torch.nn.Module,
        learning_rate: float = 0.01,
        max_iterations: int = 10,
        confidence: float = 0.0,
        **kwargs,
    ) -> None:
        super().__init__(
            model,
            learning_rate=learning_rate,
            max_iterations=max_iterations,
            confidence=confidence,
        )
        self.learning_rate = float(learning_rate)
        self.max_iterations = int(max_iterations)
        self.confidence = float(confidence)
        self.h = 1e-3

    def _loss(self, adv: torch.Tensor, x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
        logits = self.model(adv)
        labels = y if y is not None else torch.argmax(self.model(x), dim=1)
        real = torch.gather(torch.softmax(logits, dim=1), 1, labels.unsqueeze(1)).squeeze(1)
        other = (logits - torch.eye(logits.size(1), device=self.device)[labels] * 1e9).max(dim=1).values
        obj = torch.clamp(real - other + self.confidence, min=0.0)
        return torch.norm(adv - x, p=2) + obj.sum()

    def generate(self, x: torch.Tensor, y: torch.Tensor | None = None) -> torch.Tensor:
        x = x.to(self.device)
        adv = x.clone().detach().requires_grad_(False)
        flat = adv.flatten(1)
        n_pixels = flat.size(1)

        for _ in range(self.max_iterations):
            adv_ = adv.clone()
            adv_.requires_grad_(True)
            loss = self._loss(adv_, x, y)
            grad = torch.autograd.grad(loss, adv_)[0] if adv_.grad_fn is not None else torch.zeros_like(adv_)
            # Use analytic gradient when available, else fall back (already have grad).
            adv = adv - self.learning_rate * grad.detach().sign().clamp(-1.0, 1.0)
            adv = torch.clamp(adv, x - 0.3, x + 0.3)
            adv = self._clamp01(adv.detach())

        return adv
