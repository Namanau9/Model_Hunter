"""Shared API helpers."""
from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse

from app.database.schema import ApiEnvelope


def ok(data: Any = None, message: str = "OK") -> JSONResponse:
    """Standard success envelope."""
    return JSONResponse(
        content=ApiEnvelope(success=True, message=message, data=data).model_dump()
    )


def err(status: int, message: str) -> JSONResponse:
    """Standard error envelope."""
    return JSONResponse(
        status_code=status,
        content=ApiEnvelope(success=False, message=message, data=None).model_dump(),
    )
