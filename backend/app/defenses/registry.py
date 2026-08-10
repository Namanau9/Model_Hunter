"""Central registry for defenses."""
from __future__ import annotations

from typing import Any

import torch

from app.defenses.adversarial_training import AdversarialTraining
from app.defenses.base import Defense
from app.defenses.ensemble import EnsembleDefense
from app.defenses.preprocessing import InputPreprocessing, PREPROCESSORS


class DefenseRegistry:
    """Static registry mapping defense names to factories."""

    names: list[str] = [
        "adversarial_training",
        "ensemble",
        "input_preprocessing",
    ]

    metadata: dict[str, dict] = {
        "adversarial_training": {
            "description": "Fine-tune model on adversarial examples",
            "methods": [],
        },
        "ensemble": {
            "description": "Majority vote across CNN + ResNet18 + MobileNetV2",
            "methods": [],
        },
        "input_preprocessing": {
            "description": "Preprocess inputs to remove perturbations",
            "methods": list(PREPROCESSORS.keys()),
        },
    }

    @classmethod
    def has(cls, name: str) -> bool:
        return name.lower() == "none" or name.lower() in [n.lower() for n in cls.names]

    @classmethod
    def build_default(cls, name: str, model: torch.nn.Module) -> Defense:
        key = name.lower()
        if key == "adversarial_training":
            return AdversarialTraining(model)
        if key == "ensemble":
            return EnsembleDefense([model])
        if key == "input_preprocessing":
            return InputPreprocessing(model, method="gaussian_blur")
        raise KeyError(f"Unknown defense '{name}'")
