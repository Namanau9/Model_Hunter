"""CORS and request logging middleware."""
from __future__ import annotations

import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.utils.logging import get_logger

logger = get_logger(__name__)


def register_cors(app: FastAPI) -> None:
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def register_logging_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = (time.perf_counter() - start) * 1000
        if request.url.path.startswith("/api"):
            logger.info(
                "%s %s -> %s (%.1f ms)",
                request.method,
                request.url.path,
                response.status_code,
                duration,
            )
        return response
