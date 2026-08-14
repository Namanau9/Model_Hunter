"""SHAP explainability.

Primary implementation uses the ``shap`` library's GradientExplainer.
Selection of the target-class attribution handles both the SHAP 0.51+ output
(a 5D array ``[batch, C, H, W, classes]`` with one class already selected) and
the older per-class-list format.

If the installed SHAP fails to run against the current torch version we fall
back to a manual input x gradient attribution (equivalent gradient-based
method). We deliberately avoid Captum's DeepLift as a fallback because it
cannot handle ``ReLU(inplace=True)`` modules used by ResNet/MobileNet.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import torch

from app.datasets.registry import DatasetRegistry
from app.evaluation.metrics import _collect


def _extract_shap_target(values: Any, target: int) -> torch.Tensor:
    """Select the target-class attribution from SHAP's various return shapes.

    SHAP 0.51 returns a numpy array of shape ``(batch, C, H, W, classes)``.
    Some versions / models return a list of per-class arrays, or a plain
    ``(batch, C, H, W)`` array when a single class was requested.
    """
    if isinstance(values, list):
        arr = values[target] if target < len(values) else values[-1]
    elif isinstance(values, np.ndarray):
        if values.ndim == 5:  # (batch, C, H, W, classes)
            arr = values[0, :, :, :, target]
        elif values.ndim == 4:  # (batch, C, H, W)
            arr = values[0]
        else:
            arr = values
    else:
        arr = values
    return torch.tensor(np.array(arr), dtype=torch.float32).squeeze(0)


def _gradient_x_input(model: torch.nn.Module, sample: torch.Tensor, target: int) -> torch.Tensor:
    """Robust gradient-based attribution that works on any differentiable
    model, including those with in-place ReLU (no activation hooks needed).
    """
    x = sample.clone().detach().requires_grad_(True)
    logits = model(x)
    model.zero_grad()
    logits[0, target].backward()
    grad = x.grad
    if grad is None:
        raise RuntimeError("No gradient computed for attribution")
    return (x * grad).detach().squeeze(0)  # (C, H, W)


def generate_shap(
    model: torch.nn.Module,
    dataset_name: str,
    loader,
    sample_index: int = 0,
    class_index: int | None = None,
    device: str = "cpu",
    background_size: int = 25,
) -> dict[str, Any]:
    model = model.to(device).eval()
    collected = _collect(model, loader, device, limit=sample_index + 1)
    if collected is None:
        raise ValueError("No samples available")
    x, y, pred, probs = collected
    sample = x[sample_index].unsqueeze(0).to(device)
    target = class_index if class_index is not None else pred[sample_index].item()

    # Background comes from the start of the same loader.
    bg, _, _, _ = _collect(model, loader, device, limit=background_size)
    if bg is None:
        bg = sample
    else:
        bg = bg[:background_size].to(device)

    try:
        import shap

        explainer = shap.GradientExplainer(model, bg)
        values = explainer.shap_values(sample, ranked_outputs=None)
        attr = _extract_shap_target(values, target)
    except Exception:
        # Fallback: input x gradient (works on all architectures, including
        # in-place ReLU that Captum's DeepLift cannot handle).
        attr = _gradient_x_input(model, sample, target)

    # Aggregate attributions across channels into a 2D importance map.
    if attr.ndim == 3:
        importance = attr.abs().mean(dim=0)
    else:
        importance = attr.abs()
    importance_np = importance.detach().cpu().numpy().astype(np.float32)
    if importance_np.max() > 0:
        importance_np = importance_np / importance_np.max()

    unnorm = DatasetRegistry.unnormalize(dataset_name)
    img = unnorm(sample).squeeze(0).permute(1, 2, 0).clamp(0, 1).detach().cpu().numpy()

    return {
        "technique": "shap",
        "sample_index": int(sample_index),
        "true_label": int(y[sample_index].item()),
        "predicted_label": int(pred[sample_index].item()),
        "target_class": int(target),
        "confidence": float(probs[sample_index, target].item()),
        "heatmap": importance_np,
        "image": img,
        "shape": list(importance_np.shape),
    }

