"""Application configuration using Pydantic settings.

Central place for all tunable environment-driven settings.
Paths are resolved relative to the repository root and never hardcoded.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the ModelHunter platform."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Paths ---------------------------------------------------------
    # Repository root is backend/app/config -> up 3 levels = repo root.
    repo_root: Path = Field(
        default=Path(__file__).resolve().parents[3]
    )
    backend_root: Path = Field(
        default=Path(__file__).resolve().parents[2]
    )
    data_dir: Optional[Path] = Field(default=None)
    models_dir: Optional[Path] = Field(default=None)
    reports_dir: Optional[Path] = Field(default=None)
    results_dir: Optional[Path] = Field(default=None)

    # --- API / server --------------------------------------------------
    app_name: str = "ModelHunter"
    api_prefix: str = "/api"
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # --- CORS ----------------------------------------------------------
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
    )

    # --- Security ------------------------------------------------------
    secret_key: str = "modelhunter-dev-secret-change-in-prod"
    max_upload_bytes: int = 512 * 1024 * 1024  # 512 MB
    allowed_model_extensions: list[str] = Field(
        default_factory=lambda: [".pth", ".pt", ".ckpt"]
    )

    # --- Database ------------------------------------------------------
    database_url: str = "sqlite:///./modelhunter.db"

    # --- ML defaults ---------------------------------------------------
    device: str = "cpu"
    seed: int = 42
    default_batch_size: int = 64
    cnn_epochs: int = 1
    cnn_lr: float = 0.001

    def model_post_init(self, __context: object) -> None:
        """Resolve relative path defaults once real field values exist."""
        self.data_dir = self.repo_root / "datasets"
        self.models_dir = self.repo_root / "pretrained_models"
        self.reports_dir = self.repo_root / "reports"
        self.results_dir = self.repo_root / "results"
        for p in (self.data_dir, self.models_dir, self.reports_dir, self.results_dir):
            p.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
