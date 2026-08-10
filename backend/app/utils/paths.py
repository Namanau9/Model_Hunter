"""Filesystem and path helpers. Never hardcode paths outside settings."""
from __future__ import annotations

from pathlib import Path


def safe_join(root: Path, *parts: str) -> Path:
    """Join path parts under root, rejecting traversal outside root."""
    candidate = root.joinpath(*parts).resolve()
    root_resolved = root.resolve()
    if root_resolved != candidate and root_resolved not in candidate.parents:
        raise ValueError("Path traversal attempt blocked")
    return candidate
