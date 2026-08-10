"""Central registry that maps model names to factories.

New models are added here without touching unrelated core code.
"""
from __future__ import annotations

from typing import Callable

from app.models.cnn import CNN
from app.models.mobilenetv2 import build_mobilenetv2
from app.models.resnet18 import build_resnet18


def _build_cnn(num_classes: int, pretrained: bool = False) -> CNN:
    return CNN(in_channels=1, num_classes=num_classes)


class ModelRegistry:
    """Static registry of available model builders."""

    _builders: dict[str, Callable[[int, bool], object]] = {
        "cnn": _build_cnn,
        "resnet18": build_resnet18,
        "mobilenetv2": build_mobilenetv2,
    }

    metadata: dict[str, dict] = {
        "cnn": {"description": "Custom 2-layer CNN (grayscale)", "channels": 1},
        "resnet18": {"description": "ResNet18 (3-channel)", "channels": 3},
        "mobilenetv2": {"description": "MobileNetV2 (3-channel)", "channels": 3},
    }

    # Dataset -> compatible models
    dataset_models: dict[str, list[str]] = {
        "mnist": ["cnn"],
        "cifar10": ["resnet18", "mobilenetv2"],
        "gtsrb": ["resnet18", "mobilenetv2"],
    }

    @classmethod
    def names(cls) -> list[str]:
        return list(cls._builders.keys())

    @classmethod
    def has(cls, name: str) -> bool:
        return name.lower() in cls._builders

    @classmethod
    def build(cls, name: str, num_classes: int, pretrained: bool = False):
        key = name.lower()
        if key not in cls._builders:
            raise KeyError(f"Unknown model '{name}'. Available: {cls.names()}")
        return cls._builders[key](num_classes, pretrained)

    @classmethod
    def channels_for(cls, name: str) -> int:
        return cls.metadata.get(name.lower(), {}).get("channels", 3)

    @classmethod
    def compatible_models(cls, dataset: str) -> list[str]:
        return cls.dataset_models.get(dataset.lower(), ["cnn"])

    @classmethod
    def compatible_datasets(cls, model: str) -> list[str]:
        out = []
        for ds, models in cls.dataset_models.items():
            if model.lower() in models:
                out.append(ds)
        return out

