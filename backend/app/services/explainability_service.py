"""Explainability service: GradCAM and SHAP."""
from __future__ import annotations

from app.config.settings import get_settings
from app.datasets.registry import DatasetRegistry
from app.explainability.gradcam import generate_gradcam
from app.explainability.shap import generate_shap
from app.services import model_service
from app.utils.logging import get_logger

logger = get_logger(__name__)


def run_explainability(
    model_name: str,
    dataset_name: str,
    technique: str = "gradcam",
    sample_index: int = 0,
    class_index: int | None = None,
) -> dict:
    """Generate an explanation for a sample and return serialized result."""
    settings = get_settings()
    technique = technique.lower()
    if technique not in ("gradcam", "shap"):
        raise ValueError("technique must be 'gradcam' or 'shap'")

    model = model_service.load_model(model_name, dataset_name)
    loader_cls = DatasetRegistry.get(dataset_name)
    loader = loader_cls.dataloader(train=False, batch_size=64, limit=sample_index + 1)

    if technique == "gradcam":
        result = generate_gradcam(
            model,
            dataset_name,
            loader,
            model_name,
            sample_index=sample_index,
            class_index=class_index,
            device=settings.device,
        )
    else:
        result = generate_shap(
            model,
            dataset_name,
            loader,
            sample_index=sample_index,
            class_index=class_index,
            device=settings.device,
        )

    # Store the heatmap + image as PNG bytes for the frontend.
    import base64
    import io

    from matplotlib import pyplot as plt

    buf = io.BytesIO()
    fig, axes = plt.subplots(1, 2, figsize=(6, 3))
    img = result["image"]
    heat = result["heatmap"]
    if img.shape[2] == 1:  # grayscale
        axes[0].imshow(img[:, :, 0], cmap="gray")
    else:
        axes[0].imshow(img)
    axes[0].set_title("Original")
    axes[0].axis("off")
    axes[1].imshow(img, alpha=0.6)
    axes[1].imshow(heat, cmap="jet", alpha=0.5)
    axes[1].set_title(f"{technique.upper()} Map")
    axes[1].axis("off")
    fig.tight_layout()
    plt.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("ascii")

    result["image_base64"] = encoded
    return result