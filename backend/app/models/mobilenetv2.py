"""MobileNetV2 adapted for small image datasets (CIFAR-10 / GTSRB)."""
from __future__ import annotations

import torch.nn as nn
from torchvision.models import mobilenet_v2
from torchvision.models import MobileNet_V2_Weights


def build_mobilenetv2(num_classes: int = 10, pretrained: bool = False) -> nn.Module:
    """Return a MobileNetV2 configured for ``num_classes`` and 3-channel images."""
    if pretrained:
        weights = MobileNet_V2_Weights.IMAGENET1K_V1
    else:
        weights = None
    net = mobilenet_v2(weights=weights)
    net.classifier[1] = nn.Linear(net.classifier[1].in_features, num_classes)
    net.num_classes = num_classes  # type: ignore[attr-defined]
    return net
