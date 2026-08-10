"""Pydantic schemas (request/response models) for the API layer."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ApiEnvelope(BaseModel):
    """Standard API response wrapper."""

    success: bool
    message: str
    data: Any = None


class AttackConfig(BaseModel):
    """Configurable parameters for a single attack."""

    epsilon: float = Field(default=0.1, ge=0.0)
    steps: int = Field(default=10, ge=1)
    step_size: float | None = Field(default=None, ge=0.0)
    confidence: float = Field(default=0.0, ge=0.0)
    learning_rate: float = Field(default=0.01, ge=0.0)
    query_limit: int = Field(default=100, ge=1)
    random_start: bool = True
    targeted: bool = False
    target_class: int | None = None
    max_iterations: int = Field(default=10, ge=1)


class EvaluationRequest(BaseModel):
    """Top-level request to run an evaluation pipeline."""

    model_name: str = "cnn"
    dataset_name: str = "mnist"
    attack_name: str = "fgsm"
    defense_name: str | None = None
    attack_params: AttackConfig = AttackConfig()
    sample_limit: int | None = Field(default=None, ge=1)
    batch_size: int = Field(default=64, ge=1)
    seed: int = 42


class TrainRequest(BaseModel):
    """Request to train a model from scratch."""

    model_name: str = "cnn"
    dataset_name: str = "mnist"
    epochs: int = Field(default=1, ge=1)
    batch_size: int = Field(default=64, ge=1)
    learning_rate: float = Field(default=0.001, gt=0.0)
    limit: int | None = Field(default=None, ge=1)


class ReportRequest(BaseModel):
    """Request to generate a report from a stored evaluation."""

    evaluation_id: int
    formats: list[str] = Field(default_factory=lambda: ["csv", "html", "pdf"])


class ExplainabilityRequest(BaseModel):
    """Request to generate explanation images for a sample."""

    model_name: str = "cnn"
    dataset_name: str = "mnist"
    technique: str = "gradcam"  # gradcam | shap
    sample_index: int = Field(default=0, ge=0)
    class_index: int | None = None


class UploadedModelResponse(BaseModel):
    """Metadata describing a model in the registry."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    source: str
    description: str = ""
    classes: int = 0
    input_shape: str = ""
    file_path: str = ""
