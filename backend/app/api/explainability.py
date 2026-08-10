"""Explainability API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import ok
from app.database.schema import ExplainabilityRequest
from app.services.explainability_service import run_explainability

router = APIRouter(prefix="/explainability", tags=["explainability"])


@router.post("")
def explain(req: ExplainabilityRequest):
    result = run_explainability(
        req.model_name,
        req.dataset_name,
        req.technique,
        req.sample_index,
        req.class_index,
    )
    return ok(result, message="Explanation generated")
