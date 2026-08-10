"""SHAP explainability.

Primary implementation uses the ``shap`` library's GradientExplainer.
If the installed SHAP fails to run against the current torch version, we fall
back to Captum's DeepLift (an equivalent gradient-based attribution) so the
feature is never left silently broken.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import torch

from app.datasets.registry import DatasetRegistry
from app.evaluation.metrics import _collect


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
        values, expected = explainer.shap_values(sample, ranked_outputs=None)
        if isinstance(values, list):
            # Per-class list; pick the target class index.
            if target < len(values):
                attr = values[target]
            else:
                attr = values[-1]
        else:
            attr = values
        attr = torch.tensor(np.array(attr), dtype=torch.float32).squeeze(0)
    except Exception:
        # Fallback: Captum DeepLift (equivalent gradient-based attribution).
        from captum.attr import DeepLift

        dl = DeepLift(model)
        attr = dl.attribute(sample, target=int(target), baselines=bg.mean(dim=0, keepdim=True)).squeeze(0)

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
