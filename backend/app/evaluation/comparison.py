"""Comparison of multiple MetricsResult objects across models."""

from __future__ import annotations

from app.evaluation.metrics import MetricsResult


def compare(results: list[MetricsResult]) -> dict:
    """Build a comparison summary keyed by model/run description."""
    out = {"count": len(results), "best_robustness": None, "rows": []}
    best = None
    for r in results:
        row = {
            "model": r.parameters.get("model", ""),
            "dataset": r.parameters.get("dataset", ""),
            "attack": r.parameters.get("attack", ""),
            "defense": r.parameters.get("defense", "none"),
            "clean_accuracy": round(r.clean_accuracy, 2),
            "adversarial_accuracy": round(r.adversarial_accuracy, 2),
            "accuracy_drop": round(r.accuracy_drop, 2),
            "attack_success_rate": round(r.attack_success_rate, 2),
            "confidence_shift": round(r.confidence_shift, 2),
            "execution_time": round(r.execution_time, 3),
            "robustness_score": r.robustness_score,
            "robustness_class": r.robustness_class,
        }
        out["rows"].append(row)
        if best is None or r.robustness_score > best.robustness_score:
            best = r
    if best is not None:
        out["best_robustness"] = {
            "model": best.parameters.get("model", ""),
            "score": best.robustness_score,
            "class": best.robustness_class,
        }
    return out
