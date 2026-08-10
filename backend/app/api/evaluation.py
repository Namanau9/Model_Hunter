"""Evaluation API routes."""
from __future__ import annotations

import copy

from fastapi import APIRouter

from app.api.deps import ok
from app.database.schema import EvaluationRequest
from app.evaluation.comparison import compare
from app.evaluation.metrics import MetricsResult
from app.services import evaluation_service, report_service

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.post("/run")
def run_evaluation(req: EvaluationRequest):
    result = evaluation_service.run_evaluation(req)
    return ok(result, message="Evaluation complete")


@router.get("/history")
def history(limit: int = 50):
    return ok({"history": report_service.list_history(limit=limit)})


@router.post("/benchmark")
def benchmark(req: EvaluationRequest):
    """Run the same attack against every compatible model for the dataset."""
    from app.models.registry import ModelRegistry

    results: list[MetricsResult] = []
    runs = []
    for model_name in ModelRegistry.compatible_models(req.dataset_name):
        base = EvaluationRequest.model_validate(copy.deepcopy(req.model_dump()))
        base.model_name = model_name
        base.defense_name = "none"
        try:
            run = evaluation_service.run_evaluation(base)
            runs.append(run)
            m = MetricsResult(**run["metrics"])
            m.parameters = run["parameters"]
            results.append(m)
        except Exception as exc:  # noqa: BLE001 - keep benchmark resilient
            runs.append(
                {
                    "model": model_name,
                    "dataset": req.dataset_name,
                    "attack": req.attack_name,
                    "error": str(exc),
                }
            )
    return ok({"runs": runs, "comparison": compare(results)}, message="Benchmark complete")
