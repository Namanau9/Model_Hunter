"""Dataset API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import ok
from app.services.dataset_service import list_datasets
from app.datasets.registry import DatasetRegistry

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("")
def datasets():
    return ok({"datasets": list_datasets()})


@router.get("/{name}/size")
def dataset_size(name: str):
    if not DatasetRegistry.has(name):
        return ok({"name": name, "size": 0})
    loader = DatasetRegistry.get(name)
    try:
        train = len(loader.load(train=True))
        test = len(loader.load(train=False))
    except Exception:
        train = test = 0
    return ok({"name": name, "train": train, "test": test})
