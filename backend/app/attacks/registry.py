"""Central registry for adversarial attacks.

New attacks are added here without touching unrelated core code.
"""
from __future__ import annotations

from typing import Any

import torch

from app.attacks.base import Attack
from app.attacks.cw import CarliniWagner
from app.attacks.fgsm import FGSM
from app.attacks.hopskipjump import HopSkipJump
from app.attacks.pgd import PGD
from app.attacks.zoo import ZOO


class AttackRegistry:
    """Static registry mapping attack names to attack classes."""

    _classes: dict[str, type[Attack]] = {
        "fgsm": FGSM,
        "pgd": PGD,
        "cw": CarliniWagner,
        "zoo": ZOO,
        "hopskipjump": HopSkipJump,
    }

    defaults: dict[str, dict[str, Any]] = {
        "fgsm": {"epsilon": 0.1},
        "pgd": {"epsilon": 0.1, "steps": 10, "step_size": None, "random_start": True},
        "cw": {"learning_rate": 0.01, "max_iterations": 10, "confidence": 0.0},
        "zoo": {"learning_rate": 0.01, "max_iterations": 10, "confidence": 0.0},
        "hopskipjump": {"max_iterations": 10, "query_limit": 100},
    }

    @classmethod
    def names(cls) -> list[str]:
        return list(cls._classes.keys())

    @classmethod
    def has(cls, name: str) -> bool:
        return name.lower() in cls._classes

    @classmethod
    def create(cls, name: str, model: torch.nn.Module, params: dict[str, Any] | None = None) -> Attack:
        key = name.lower()
        if key not in cls._classes:
            raise KeyError(f"Unknown attack '{name}'. Available: {cls.names()}")
        merged = dict(cls.defaults.get(key, {}))
        if params:
            merged.update({k: v for k, v in params.items() if v is not None})
        return cls._classes[key](model, **merged)
