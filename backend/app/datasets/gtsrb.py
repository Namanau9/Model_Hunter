"""GTSRB (German Traffic Sign Recognition Benchmark) dataset."""
from __future__ import annotations

import torch
from torch.utils.data import DataLoader, Dataset
from torchvision import datasets, transforms

from app.config.settings import get_settings

GTSRB_MEAN = (0.3403, 0.3121, 0.3214)
GTSRB_STD = (0.2724, 0.2608, 0.2669)


class GTSRBLoader:
    name = "gtsrb"
    num_classes = 43
    channels = 3
    input_size = (32, 32)

    train_transform = transforms.Compose(
        [
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
            transforms.Normalize(GTSRB_MEAN, GTSRB_STD),
        ]
    )
    eval_transform = transforms.Compose(
        [
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
            transforms.Normalize(GTSRB_MEAN, GTSRB_STD),
        ]
    )

    def load(self, train: bool = True) -> Dataset:
        settings = get_settings()
        transform = self.train_transform if train else self.eval_transform
        return datasets.GTSRB(
            root=str(settings.data_dir),
            split="train" if train else "test",
            download=True,
            transform=transform,
        )

    def dataloader(self, train: bool = True, batch_size: int = 64, limit: int | None = None):
        ds = self.load(train)
        if limit is not None:
            ds = torch.utils.data.Subset(ds, range(min(limit, len(ds))))
        return DataLoader(ds, batch_size=batch_size, shuffle=train, num_workers=0)


def unnormalize_gtsrb(t: torch.Tensor) -> torch.Tensor:
    mean = torch.tensor(GTSRB_MEAN).view(1, 3, 1, 1).to(t.device)
    std = torch.tensor(GTSRB_STD).view(1, 3, 1, 1).to(t.device)
    return torch.clamp(t * std + mean, 0.0, 1.0)
