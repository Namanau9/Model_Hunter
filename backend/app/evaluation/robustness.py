"""Robustness scoring and comparison helpers."""
from __future__ import annotations

from app.evaluation.metrics import MetricsResult, robustness_score


def score(result: MetricsResult) -> tuple[float, str]:
    """Public entry point returning (score, classification)."""
    return robustness_score(result)


def classify(score_value: float) -> str:
    if score_value <= 30:
        return "Weak"
    if score_value <= 60:
        return "Moderate"
    return "Strong"
