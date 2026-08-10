"""Defense API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import ok
from app.defenses.registry import DefenseRegistry

router = APIRouter(prefix="/defenses", tags=["defenses"])


@router.get("")
def defenses():
    return ok(
        {
            "defenses": [
                {"name": n, "description": DefenseRegistry.metadata[n]["description"], "methods": DefenseRegistry.metadata[n]["methods"]}
                for n in DefenseRegistry.names
            ]
        }
    )
