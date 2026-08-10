"""Attack API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import ok
from app.services.attack_service import list_attacks

router = APIRouter(prefix="/attacks", tags=["attacks"])


@router.get("")
def attacks():
    return ok({"attacks": list_attacks()})


@router.get("/{name}/params")
def attack_params(name: str):
    from app.attacks.registry import AttackRegistry

    if not AttackRegistry.has(name):
        return ok({"name": name, "params": {}})
    return ok({"name": name, "defaults": AttackRegistry.defaults[name]})
