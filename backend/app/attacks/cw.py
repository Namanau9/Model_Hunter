"""Carlini-Wagner L2 attack (simplified gradient-based optimization).

Maximizes a confidence-weighted hinge loss with an L2 distortion penalty.
"""
from __future__ import annotations

import torch
import torch.nn.functional as F

from app.attacks.base import Attack


class CarliniWagner(Attack):
    name = "cw"

    def __init__(
        self,
        model: torch.nn.Module,
        learning_rate: float = 0.01,
        max_iterations: int = 10,
        confidence: float = 0.0,
        targeted: bool = False,
        target_class: int | None = None,
        **kwargs,
    ) -> None:
        super().__init__(
            model,
            learning_rate=learning_rate,
            max_iterations=max_iterations,
            confidence=confidence,
            targeted=targeted,
            target_class=target_class,
        )
        self.learning_rate = float(learning_rate)
        self.max_iterations = int(max_iterations)
        self.confidence = float(confidence)
        self.targeted = bool(targeted)

    def generate(self, x: torch.Tensor, y: torch.Tensor | None = None) -> torch.Tensor:
        x = x.to(self.device)
        batch = x.size(0)
        c = 1.0

        # Train a perturbation in logit space w = 0.5 * atanh(2x-1).
        w = (0.5 * torch.log((1.0 + x) / ((1.0 - x).clamp_min(1e-8)))).clone().detach().requires_grad_(True)

        optimizer = torch.optim.Adam([w], lr=self.learning_rate)
        adv = x

        for _ in range(self.max_iterations):
            optimizer.zero_grad()
            adv_ = 0.5 * (torch.tanh(w) + 1.0)
            logits = self.model(adv_)

            if self.targeted:
                target = torch.full((batch,), self.params.get("target_class", 0), device=self.device)
                real = torch.gather(F.softmax(logits, dim=1), 1, target.unsqueeze(1)).squeeze(1)
                other = logits.max(dim=1).values
                # For targeted: want logits[target] high.
                loss_obj = torch.clamp(other - real + self.confidence, min=0.0)
                loss_obj = loss_obj.sum()
            else:
                y_hot = torch.argmax(logits, dim=1)
                real = torch.gather(F.softmax(logits, dim=1), 1, y_hot.unsqueeze(1)).squeeze(1)
                other = (logits - torch.eye(logits.size(1), device=self.device)[y_hot] * 1e9).max(dim=1).values
                loss_obj = torch.clamp(real - other + self.confidence, min=0.0)
                loss_obj = loss_obj.sum()

            loss = torch.norm(adv_ - x, p=2) + c * loss_obj
            loss.backward()
            optimizer.step()

        adv = 0.5 * (torch.tanh(w.detach()) + 1.0)
        return self._clamp01(adv)
