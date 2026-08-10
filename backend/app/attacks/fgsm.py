"""Fast Gradient Sign Method (FGSM) attack."""
from __future__ import annotations

import torch

from app.attacks.base import Attack


class FGSM(Attack):
    name = "fgsm"

    def __init__(self, model: torch.nn.Module, epsilon: float = 0.1, **kwargs) -> None:
        super().__init__(model, epsilon=epsilon, **kwargs)
        self.epsilon = float(epsilon)

    def generate(self, x: torch.Tensor, y: torch.Tensor | None = None) -> torch.Tensor:
        x = x.clone().to(self.device)
        x.requires_grad = True
        logits = self.model(x)
        loss = torch.nn.functional.cross_entropy(logits, y)
        grad = torch.autograd.grad(loss, x)[0]
        target = self._target(logits)
        if target is not None:
            adv = x - self.epsilon * grad.sign()
        else:
            adv = x + self.epsilon * grad.sign()
        return self._clamp01(adv.detach())
