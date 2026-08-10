"""Global exception handling: convert errors into safe API envelopes.

Never leaks stack traces to clients; logs them server-side instead.
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.utils.logging import get_logger

logger = get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An internal error occurred.",
                "data": None,
            },
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        logger.warning("ValueError on %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": str(exc), "data": None},
        )

    @app.exception_handler(KeyError)
    async def key_error_handler(request: Request, exc: KeyError):
        logger.warning("KeyError on %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": str(exc), "data": None},
        )

    @app.exception_handler(FileNotFoundError)
    async def not_found_handler(request: Request, exc: FileNotFoundError):
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Requested resource not found.", "data": None},
        )
