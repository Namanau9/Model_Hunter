"""Dataset manager service."""
from __future__ import annotations

from app.datasets.registry import DatasetRegistry
from app.models.registry import ModelRegistry


def list_datasets() -> list[dict]:
    rows = []
    for name in DatasetRegistry.names():
        meta = DatasetRegistry.metadata[name]
        rows.append(
            {
                "name": name,
                "description": meta["description"],
                "classes": meta["classes"],
                "channels": meta["channels"],
                "compatible_models": ModelRegistry.compatible_models(name),
            }
        )
    return rows