"""SQLAlchemy ORM models for persistent storage of evaluations and reports."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EvaluationRecord(Base):
    """A single evaluation run of model/dataset/attack/defense."""

    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(120), index=True)
    dataset_name: Mapped[str] = mapped_column(String(120), index=True)
    attack_name: Mapped[str] = mapped_column(String(120), default="none")
    defense_name: Mapped[str] = mapped_column(String(120), default="none")

    clean_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    adversarial_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    accuracy_drop: Mapped[float] = mapped_column(Float, default=0.0)
    attack_success_rate: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_shift: Mapped[float] = mapped_column(Float, default=0.0)
    transferability_index: Mapped[float] = mapped_column(Float, default=0.0)
    execution_time: Mapped[float] = mapped_column(Float, default=0.0)
    robustness_score: Mapped[float] = mapped_column(Float, default=0.0)
    robustness_class: Mapped[str] = mapped_column(String(20), default="")

    parameters: Mapped[str] = mapped_column(Text, default="{}")
    report_path: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    details: Mapped["EvaluationDetail"] = relationship(
        back_populates="evaluation", cascade="all, delete-orphan", uselist=False
    )


class EvaluationDetail(Base):
    """Additional detail (labels, configs) about an evaluation run."""

    __tablename__ = "evaluation_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("evaluations.id", ondelete="CASCADE"), index=True
    )
    config_json: Mapped[str] = mapped_column(Text, default="{}")
    summary_json: Mapped[str] = mapped_column(Text, default="{}")

    evaluation: Mapped[EvaluationRecord] = relationship(back_populates="details")
