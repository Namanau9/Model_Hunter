"""ResNet18 adapted for small image datasets (CIFAR-10 / GTSRB)."""
from __future__ import annotations

import torch.nn as nn
from torchvision.models import resnet18
from torchvision.models import ResNet18_Weights


def build_resnet18(num_classes: int = 10, pretrained: bool = False) -> nn.Module:
    """Return a ResNet18 configured for ``num_classes`` and 3-channel images.

    For small spatial inputs (32x32) ResNet18's first conv/pool is replaced so
    the feature map is not downsampled too aggressively.
    """
    if pretrained:
        weights = ResNet18_Weights.IMAGENET1K_V1
    else:
        weights = None
    net = resnet18(weights=weights)
    net.conv1 = nn.Conv2d(3, 64, kernel_size=3, stride=1, padding=1, bias=False)
    net.maxpool = nn.Identity()
    net.fc = nn.Linear(net.fc.in_features, num_classes)
    net.num_classes = num_classes  # type: ignore[attr-defined]
    return net
