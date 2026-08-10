"""Adversarial Training defense.

Trains the model on a mix of clean examples and FGSM/PGD adversarial examples
to harden it against attacks.
"""
from __future__ import annotations

import torch
import torch.nn as nn

from app.attacks.fgsm import FGSM
from app.defenses.base import Defense


class AdversarialTraining(Defense):
    name = "adversarial_training"

    def __init__(
        self,
        model: nn.Module,
        epsilon: float = 0.1,
        epochs: int = 1,
        learning_rate: float = 0.001,
        limit: int | None = None,
        **params,
    ) -> None:
        super().__init__(model, epsilon=epsilon, epochs=epochs, learning_rate=learning_rate, limit=limit)
        self.epsilon = float(epsilon)
        self.epochs = int(epochs)
        self.learning_rate = float(learning_rate)
        self.limit = limit

    def train(self, train_loader, device: str = "cpu") -> dict:
        """Run adversarially-trained fine-tuning on the provided loader."""
        model = self.model.to(device)
        optimizer = torch.optim.Adam(model.parameters(), lr=self.learning_rate)
        loss_fn = nn.CrossEntropyLoss()
        fgsm = FGSM(model, epsilon=self.epsilon)
        model.train()
        steps = 0
        for _ in range(self.epochs):
            for x, y in train_loader:
                x, y = x.to(device), y.to(device)
                model.eval()
                adv = fgsm.generate(x, y)
                model.train()
                combined_x = torch.cat([x, adv], dim=0)
                combined_y = torch.cat([y, y], dim=0)
                optimizer.zero_grad()
                loss = loss_fn(model(combined_x), combined_y)
                loss.backward()
                optimizer.step()
                steps += 1
        model.eval()
        return {"epochs": self.epochs, "steps": steps, "epsilon": self.epsilon}
