"""Attack manager service."""
from __future__ import annotations

from typing import Any

from app.attacks.registry import AttackRegistry


def list_attacks() -> list[dict]:
    out = []
    for name in AttackRegistry.names():
        out.append(
            {
                "name": name,
                "label": name.upper(),
                "defaults": {k: v for k, v in AttackRegistry.defaults[name].items() if v is not None},
            }
        )
    return out


def validate_attack_params(name: str, params: dict[str, Any]) -> dict[str, Any]:
    if not AttackRegistry.has(name):
        raise ValueError(f"Unknown attack '{name}'")
    defaults = AttackRegistry.defaults[name]
    merged = dict(defaults)
    for k, v in params.items():
        if v is not None and v != "":
            merged[k] = v
    return merged