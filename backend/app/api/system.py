"""System / health API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import ok
from app.config.settings import get_settings
from app.database.database import engine
from app.models.registry import ModelRegistry
from app.datasets.registry import DatasetRegistry
from app.attacks.registry import AttackRegistry
from app.defenses.registry import DefenseRegistry
from app.utils.device import get_device_info

router = APIRouter()


@router.get("/health")
def health():
    try:
        with engine.connect():
            db_ok = True
    except Exception:
        db_ok = False
    return ok(
        {
            "status": "ok" if db_ok else "degraded",
            "app": get_settings().app_name,
            "database": "connected" if db_ok else "error",
        }
    )


@router.get("/info")
def info():
    settings = get_settings()
    return ok(
        {
            "app": settings.app_name,
            "version": "1.0.0",
            "models": ModelRegistry.names(),
            "datasets": DatasetRegistry.names(),
            "attacks": AttackRegistry.names(),
            "defenses": DefenseRegistry.names,
            "device": get_device_info(),
            "architecture": [
                "React Frontend",
                "FastAPI API",
                "Service Layer",
                "ML Engines",
                "Evaluation",
                "Database / Reports",
            ],
        }
    )
