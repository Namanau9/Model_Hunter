"""CIFAR-10 dataset definitions and loaders."""
from __future__ import annotations

import torch
from torch.utils.data import DataLoader, Dataset
from torchvision import datasets, transforms

from app.config.settings import get_settings

CIFAR_MEAN = (0.4914, 0.4822, 0.4465)
CIFAR_STD = (0.2470, 0.2435, 0.2616)


class CIFAR10Loader:
    name = "cifar10"
    num_classes = 10
    channels = 3
    input_size = (32, 32)

    train_transform = transforms.Compose(
        [
            transforms.RandomCrop(32, padding=4),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize(CIFAR_MEAN, CIFAR_STD),
        ]
    )
    eval_transform = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize(CIFAR_MEAN, CIFAR_STD),
        ]
    )

    def load(self, train: bool = True) -> Dataset:
        settings = get_settings()
        transform = self.train_transform if train else self.eval_transform
        return datasets.CIFAR10(
            root=str(settings.data_dir),
            train=train,
            download=True,
            transform=transform,
        )

    def dataloader(self, train: bool = True, batch_size: int = 64, limit: int | None = None):
        ds = self.load(train)
        if limit is not None:
            ds = torch.utils.data.Subset(ds, range(min(limit, len(ds))))
        return DataLoader(ds, batch_size=batch_size, shuffle=train, num_workers=0)


def unnormalize_cifar10(t: torch.Tensor) -> torch.Tensor:
    """Convert normalized CIFAR-10 tensor back to 0..1 for display."""
    mean = torch.tensor(CIFAR_MEAN).view(1, 3, 1, 1).to(t.device)
    std = torch.tensor(CIFAR_STD).view(1, 3, 1, 1).to(t.device)
    return torch.clamp(t * std + mean, 0.0, 1.0)
