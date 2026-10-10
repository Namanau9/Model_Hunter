"""ModelHunter FastAPI application entry point."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api import attacks, datasets, defenses, evaluation, explainability, models, reports, system, automated
from app.config.settings import get_settings
from app.database.database import init_db
from app.middleware.error_handler import register_exception_handlers
from app.middleware.middleware import register_cors, register_logging_middleware
from app.utils.logging import configure_logging

configure_logging(logging.INFO)

settings = get_settings()


def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="Autonomous Adversarial Machine Learning Security Evaluation Platform",
    )
    init_db()

    register_cors(app)
    register_logging_middleware(app)
    register_exception_handlers(app)

    api_prefix = settings.api_prefix
    app.include_router(system.router, prefix=api_prefix, tags=["system"])
    app.include_router(automated.router, prefix=api_prefix)
    app.include_router(models.router, prefix=api_prefix)
    app.include_router(datasets.router, prefix=api_prefix)
    app.include_router(attacks.router, prefix=api_prefix)
    app.include_router(defenses.router, prefix=api_prefix)
    app.include_router(evaluation.router, prefix=api_prefix)
    app.include_router(explainability.router, prefix=api_prefix)
    app.include_router(reports.router, prefix=api_prefix)

    @app.get("/")
    def root():
        return {
            "success": True,
            "message": "ModelHunter API",
            "data": {"docs": "/docs", "health": f"{api_prefix}/health"},
        }

    return app


app = create_app()