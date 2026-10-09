"""Demo mode API routes.

Runs a full adversarial evaluation sequence automatically:
  1. Clean model baseline (no attack, no defense)
  2. Attack applied (full epsilon, no defense)
  3. Same attack with each available defense

Returns a step-by-step result list so the frontend can render a live timeline.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter

from app.api.deps import ok, err
from app.database.schema import EvaluationRequest
from app.defenses.registry import DefenseRegistry
from app.evaluation.metrics import evaluate_accuracy
from app.models.registry import ModelRegistry
from app.services import model_service
from app.services.evaluation_service import run_evaluation
from app.datasets.registry import DatasetRegistry
from app.config.settings import get_settings
from app.utils.device import get_device, gpu_execution, requires_pin_memory

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/run")
def run_demo(req: EvaluationRequest):
    """Run a full demo sequence: clean -> attack -> each defense, step by step."""
    started = time.perf_counter()
    steps = []

    model_name = req.model_name
    dataset_name = req.dataset_name
    attack_name = req.attack_name
    epsilon = req.attack_params.epsilon

    if model_name not in ModelRegistry.compatible_models(dataset_name):
        return err(400, f"Model '{model_name}' incompatible with dataset '{dataset_name}'")

    device = get_device()
    settings = get_settings()

    try:
        # ---- Step 1: Clean baseline (no attack, no defense) ----
        model = model_service.load_model(model_name, dataset_name)
        model.to(device).eval()
        loader_cls = DatasetRegistry.get(dataset_name)
        test_loader = loader_cls.dataloader(
            train=False,
            batch_size=req.batch_size,
            limit=req.sample_limit,
            pin_memory=requires_pin_memory(device),
            num_workers=settings.num_workers,
        )
        with gpu_execution():
            clean_acc, n = evaluate_accuracy(model, test_loader, device=device, limit=req.sample_limit)

        clean_result = {
            "model": model_name,
            "dataset": dataset_name,
            "attack": "none",
            "defense": "none",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": {
                "clean_accuracy": round(clean_acc, 2),
                "adversarial_accuracy": round(clean_acc, 2),
                "accuracy_drop": 0.0,
                "attack_success_rate": 0.0,
                "confidence_shift": 0.0,
                "transferability_index": 0.0,
                "execution_time": 0.0,
                "robustness_score": round(clean_acc, 2),
                "robustness_class": _score_to_class(clean_acc),
                "n_samples": n,
            },
            "parameters": {"attack": "none", "epsilon": 0.0, "n_samples": n},
            "reports": {"csv": "", "html": "", "pdf": ""},
            "evaluation_id": 0,
            "total_time": 0.0,
        }
        steps.append({
            "step": 1,
            "label": "Clean Baseline",
            "description": f"{model_name} on {dataset_name} — no attack, no defense (clean accuracy)",
            "result": clean_result,
        })

        # ---- Step 2: Attack applied (full epsilon, no defense) ----
        attack_req = EvaluationRequest.model_validate(req.model_dump())
        attack_req.defense_name = None
        attack_result = run_evaluation(attack_req)
        steps.append({
            "step": 2,
            "label": "Attack Applied",
            "description": f"{attack_name.upper()} (eps={epsilon}) — {model_name} under attack",
            "result": attack_result,
        })

        # ---- Step 3..N: Same attack with each defense ----
        defense_names = [d for d in DefenseRegistry.names if d != "none"]
        step_num = 3
        for defense_name in defense_names:
            def_req = EvaluationRequest.model_validate(req.model_dump())
            def_req.defense_name = defense_name
            try:
                def_result = run_evaluation(def_req)
                steps.append({
                    "step": step_num,
                    "label": f"Defense: {defense_name.replace('_', ' ').title()}",
                    "description": f"{attack_name.upper()} + {defense_name}",
                    "result": def_result,
                })
            except Exception as exc:  # noqa: BLE001
                steps.append({
                    "step": step_num,
                    "label": f"Defense: {defense_name.replace('_', ' ').title()}",
                    "description": f"{attack_name.upper()} + {defense_name}",
                    "error": str(exc),
                    "result": None,
                })
            step_num += 1

    except Exception as exc:  # noqa: BLE001
        steps.append({
            "step": -1,
            "label": "Error",
            "description": str(exc),
            "result": None,
        })

    total_time = round(time.perf_counter() - started, 3)

    defense_steps = [s for s in steps if s.get("result") and s["result"].get("defense") not in ("none", None)]
    best_defense = None
    if defense_steps:
        best = max(defense_steps, key=lambda s: s["result"]["metrics"]["robustness_score"])
        best_defense = {
            "name": best["label"],
            "robustness_score": best["result"]["metrics"]["robustness_score"],
            "robustness_class": best["result"]["metrics"]["robustness_class"],
            "adv_accuracy": best["result"]["metrics"]["adversarial_accuracy"],
        }

    summary = {
        "model": model_name,
        "dataset": dataset_name,
        "attack": attack_name,
        "epsilon": epsilon,
        "total_steps": len(steps),
        "total_time": total_time,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "best_defense": best_defense,
        "steps": steps,
    }
    return ok(summary, message="Demo sequence complete")


def _score_to_class(score: float) -> str:
    """Map a 0-100 score to a robustness class label."""
    if score <= 30:
        return "Weak"
    if score <= 60:
        return "Moderate"
    return "Strong"
