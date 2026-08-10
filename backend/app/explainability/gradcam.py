"""GradCAM explainability using Captum's LayerGradCam.

Generates a CAM heatmap overlaid on the input image for a target class.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import torch

from captum.attr import LayerGradCam, LayerAttribution

from app.evaluation.metrics import _collect


def _target_conv_layer(module_name: str, model: torch.nn.Module):
    """Return the last convolutional layer appropriate for a model family."""
    if module_name == "cnn":
        return model.features[3]
    if module_name == "resnet18":
        return model.layer4[-1]
    if module_name == "mobilenetv2":
        return model.features[-1]
    # Generic fallback: last Conv2d module.
    last_conv = None
    for mod in model.modules():
        if isinstance(mod, torch.nn.Conv2d):
            last_conv = mod
    if last_conv is None:
        raise ValueError("No Conv2d layer found for GradCAM")
    return last_conv


def generate_gradcam(
    model: torch.nn.Module,
    dataset_name: str,
    loader,
    module_name: str,
    sample_index: int = 0,
    class_index: int | None = None,
    device: str = "cpu",
) -> dict[str, Any]:
    """Produce a GradCAM heatmap for a single sample."""
    from app.datasets.registry import DatasetRegistry

    model = model.to(device).eval()
    collected = _collect(model, loader, device, limit=sample_index + 1)
    if collected is None:
        raise ValueError("No samples available")
    x, y, pred, probs = collected
    sample = x[sample_index].unsqueeze(0).to(device)

    target = class_index if class_index is not None else pred[sample_index].item()
    layer = _target_conv_layer(module_name, model)
    lgc = LayerGradCam(model, layer)

    # Resize attributions to the input spatial size.
    with torch.no_grad():
        heat = lgc.attribute(sample, target=int(target))
    heat = LayerAttribution.interpolate(heat, sample.shape[2:]).squeeze().cpu()
    heat = torch.relu(heat)
    if heat.max() > 0:
        heat = heat / heat.max()
    heat_np = heat.detach().numpy()

    unnorm = DatasetRegistry.unnormalize(dataset_name)
    img = unnorm(sample).squeeze(0).permute(1, 2, 0).clamp(0, 1).detach().cpu().numpy()

    return {
        "technique": "gradcam",
        "sample_index": int(sample_index),
        "true_label": int(y[sample_index].item()),
        "predicted_label": int(pred[sample_index].item()),
        "target_class": int(target),
        "confidence": float(probs[sample_index, target].item()),
        "heatmap": heat_np,
        "image": img,
        "shape": list(heat_np.shape),
    }
