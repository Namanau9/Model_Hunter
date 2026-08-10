"""MNIST dataset definitions and loaders."""
from __future__ import annotations

import torch
from torch.utils.data import DataLoader, Dataset
from torchvision import datasets, transforms

from app.config.settings import get_settings


class MNISTLoader:
    name = "mnist"
    num_classes = 10
    channels = 1
    input_size = (28, 28)

    train_transform = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize((0.1307,), (0.3081,)),
        ]
    )
    eval_transform = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize((0.1307,), (0.3081,)),
        ]
    )

    def load(self, train: bool = True) -> Dataset:
        settings = get_settings()
        transform = self.train_transform if train else self.eval_transform
        return datasets.MNIST(
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


def unnormalize_mnist(t: torch.Tensor) -> torch.Tensor:
    """Convert normalized (0..1 expected) tensor back to 0..1 for display."""
    mean = torch.tensor(0.1307).to(t.device)
    std = torch.tensor(0.3081).to(t.device)
    return torch.clamp(t * std.view(1, 1, 1, 1) + mean.view(1, 1, 1, 1), 0.0, 1.0)
