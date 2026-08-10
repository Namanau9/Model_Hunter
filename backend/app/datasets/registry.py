"""Central registry for datasets.

New datasets are added here without touching unrelated core code.
"""
from __future__ import annotations

from app.datasets.cifar10 import CIFAR10Loader, unnormalize_cifar10
from app.datasets.gtsrb import GTSRBLoader, unnormalize_gtsrb
from app.datasets.mnist import MNISTLoader, unnormalize_mnist


class DatasetRegistry:
    """Static registry mapping dataset names to loader classes."""

    _loaders: dict[str, type] = {
        "mnist": MNISTLoader,
        "cifar10": CIFAR10Loader,
        "gtsrb": GTSRBLoader,
    }

    _unnormalizers = {
        "mnist": unnormalize_mnist,
        "cifar10": unnormalize_cifar10,
        "gtsrb": unnormalize_gtsrb,
    }

    metadata: dict[str, dict] = {
        "mnist": {"description": "Handwritten digits 0-9", "classes": 10, "channels": 1},
        "cifar10": {"description": "10 classes of small colour images", "classes": 10, "channels": 3},
        "gtsrb": {"description": "German traffic signs", "classes": 43, "channels": 3},
    }

    @classmethod
    def names(cls) -> list[str]:
        return list(cls._loaders.keys())

    @classmethod
    def has(cls, name: str) -> bool:
        return name.lower() in cls._loaders

    @classmethod
    def get(cls, name: str):
        key = name.lower()
        if key not in cls._loaders:
            raise KeyError(f"Unknown dataset '{name}'. Available: {cls.names()}")
        return cls._loaders[key]()

    @classmethod
    def num_classes(cls, name: str) -> int:
        key = name.lower()
        return cls.metadata.get(key, {}).get("classes", 10)

    @classmethod
    def unnormalize(cls, name: str):
        return cls._unnormalizers.get(name.lower(), unnormalize_cifar10)
