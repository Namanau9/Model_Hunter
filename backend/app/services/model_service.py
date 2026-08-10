"""Model manager service: train, load, persist and upload models."""
from __future__ import annotations

import shutil
from pathlib import Path

import torch

from app.config.settings import get_settings
from app.datasets.registry import DatasetRegistry
from app.models.registry import ModelRegistry
from app.utils.logging import get_logger
from app.utils.security import safe_load_state_dict, validate_model_upload

logger = get_logger(__name__)

# Model name -> dataset-specific checkpoint property.
_STATE_EXT = ".pth"


def checkpoint_path(model_name: str, dataset_name: str) -> Path:
    settings = get_settings()
    return settings.models_dir / f"{model_name}_{dataset_name}{_STATE_EXT}"


def list_models() -> list[dict]:
    """List all supported models with status of persisted checkpoints."""
    settings = get_settings()
    rows = []
    for name in ModelRegistry.names():
        meta = ModelRegistry.metadata.get(name, {})
        datasets_with = []
        for ds in ModelRegistry.compatible_datasets(name):
            if checkpoint_path(name, ds).exists():
                datasets_with.append(ds)
        rows.append(
            {
                "name": name,
                "description": meta.get("description", ""),
                "datasets": ModelRegistry.compatible_datasets(name),
                "checkpoints": datasets_with,
                "available": bool(datasets_with),
                "source": "builtin" if name in ModelRegistry.names() else "upload",
            }
        )
    return rows


def list_uploads() -> list[dict]:
    """List user-uploaded model files stored in the models directory."""
    settings = get_settings()
    out = []
    for f in sorted(settings.models_dir.glob(f"upload*{_STATE_EXT}")):
        out.append(
            {
                "name": f.stem,
                "file": str(f),
                "size_bytes": f.stat().st_size,
            }
        )
    return out


def build_model(model_name: str, dataset_name: str, pretrained: bool = False) -> torch.nn.Module:
    """Instantiate a model architecture matching a dataset."""
    if not ModelRegistry.has(model_name):
        raise ValueError(f"Unknown model '{model_name}'. Available: {ModelRegistry.names()}")
    num_classes = DatasetRegistry.num_classes(dataset_name)
    channel_count = ModelRegistry.channels_for(model_name)
    ds_channels = DatasetRegistry.metadata[dataset_name]["channels"]
    if ds_channels != channel_count:
        raise ValueError(
            f"Model '{model_name}' expects {channel_count} channels but dataset "
            f"'{dataset_name}' has {ds_channels}. Use a compatible pairing."
        )
    return ModelRegistry.build(model_name, num_classes, pretrained=pretrained)


def load_model(model_name: str, dataset_name: str) -> torch.nn.Module:
    """Load a model, preferring a persisted checkpoint over a fresh build."""
    if not ModelRegistry.has(model_name):
        raise ValueError(f"Unknown model '{model_name}'")
    path = checkpoint_path(model_name, dataset_name)
    if path.exists():
        model = build_model(model_name, dataset_name)
        state = safe_load_state_dict(path)
        if isinstance(state, dict) and "state_dict" in state:
            state = state["state_dict"]
        model.load_state_dict(state)
        logger.info("Loaded checkpoint %s", path.name)
    else:
        logger.warning("No checkpoint for %s/%s; returning untrained model", model_name, dataset_name)
        model = build_model(model_name, dataset_name)
    model.eval()
    return model


def train_model(
    model_name: str,
    dataset_name: str,
    epochs: int = 1,
    batch_size: int = 64,
    learning_rate: float = 0.001,
    limit: int | None = None,
    device: str = "cpu",
) -> dict:
    """Train a model on a dataset and persist the checkpoint."""
    if model_name not in ModelRegistry.compatible_models(dataset_name):
        raise ValueError(
            f"Model '{model_name}' is not compatible with dataset '{dataset_name}'. "
            f"Compatible: {ModelRegistry.compatible_models(dataset_name)}"
        )
    loader_cls = DatasetRegistry.get(dataset_name)
    train_loader = loader_cls.dataloader(train=True, batch_size=batch_size, limit=limit)
    test_loader = loader_cls.dataloader(train=False, batch_size=batch_size, limit=min(200, limit or 200))

    model = build_model(model_name, dataset_name).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    loss_fn = torch.nn.CrossEntropyLoss()
    model.train()

    steps = 0
    for _ in range(epochs):
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            out = model(x)
            loss = loss_fn(out, y)
            loss.backward()
            optimizer.step()
            steps += 1

    model.eval()
    correct = total = 0
    with torch.no_grad():
        for x, y in test_loader:
            x, y = x.to(device), y.to(device)
            correct += (model(x).argmax(dim=1) == y).sum().item()
            total += y.size(0)
    accuracy = correct / max(total, 1) * 100.0

    path = checkpoint_path(model_name, dataset_name)
    torch.save({"state_dict": model.state_dict(), "source": f"trained:{model_name}"}, path)
    logger.info("Saved checkpoint %s (acc %.2f%%)", path.name, accuracy)
    return {
        "model": model_name,
        "dataset": dataset_name,
        "epochs": epochs,
        "steps": steps,
        "test_accuracy": round(accuracy, 2),
        "checkpoint": str(path),
    }


def save_upload(file_bytes: bytes, filename: str) -> dict:
    """Validate and persist an uploaded model checkpoint."""
    validate_model_upload(filename, len(file_bytes))
    settings = get_settings()
    dest = settings.models_dir / f"upload_{Path(filename).stem}{_STATE_EXT}"
    dest.write_bytes(file_bytes)
    logger.info("Stored upload %s", dest.name)
    return {"name": dest.stem, "file": str(dest), "size_bytes": len(file_bytes)}