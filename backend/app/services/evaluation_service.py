"""Evaluation service: orchestrates the full adversarial evaluation pipeline.

Runs: load model -> load dataset -> (optional defense) -> attack ->
compute metrics -> robustness score -> persist -> generate reports.
All numbers come from real execution.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone

import torch

from app.attacks.registry import AttackRegistry
from app.config.settings import get_settings
from app.database.database import SessionLocal
from app.database.models import EvaluationDetail, EvaluationRecord
from app.database.schema import EvaluationRequest
from app.datasets.registry import DatasetRegistry
from app.defenses.adversarial_training import AdversarialTraining
from app.defenses.ensemble import EnsembleDefense
from app.defenses.preprocessing import InputPreprocessing
from app.evaluation.metrics import compute_metrics, robustness_score
from app.models.registry import ModelRegistry
from app.reports.generators import generate_csv, generate_html, generate_pdf
from app.services import model_service
from app.utils.device import get_device, gpu_execution, requires_pin_memory
from app.utils.logging import get_logger

logger = get_logger(__name__)


def _build_defended_model(req: EvaluationRequest, device: str):
    """Return (model, defense_label) applying the requested defense."""
    defense = (req.defense_name or "none").lower()
    if defense in ("", "none"):
        return model_service.load_model(req.model_name, req.dataset_name), "none"

    if defense == "adversarial_training":
        model = model_service.load_model(req.model_name, req.dataset_name)
        loader_cls = DatasetRegistry.get(req.dataset_name)
        train_loader = loader_cls.dataloader(
            train=True,
            batch_size=req.batch_size,
            limit=req.sample_limit or 64,
            pin_memory=requires_pin_memory(device),
            num_workers=get_settings().num_workers,
        )
        adv = AdversarialTraining(
            model,
            epsilon=req.attack_params.epsilon,
            epochs=req.attack_params.max_iterations,
            learning_rate=req.attack_params.learning_rate,
        )
        adv.train(train_loader, device=device)
        return adv.wrap(), defense

    if defense == "ensemble":
        # Build an ensemble from all checkpoints compatible with the dataset.
        candidates = []
        for m in ModelRegistry.compatible_models(req.dataset_name):
            try:
                candidates.append(model_service.load_model(m, req.dataset_name))
            except Exception:
                continue
        if not candidates:
            candidates = [model_service.load_model(req.model_name, req.dataset_name)]
        ens = EnsembleDefense(candidates)
        return ens.wrap(), defense

    if defense == "input_preprocessing":
        model = model_service.load_model(req.model_name, req.dataset_name)
        pre = InputPreprocessing(model, method="gaussian_blur")
        return pre.wrap(), defense

    raise ValueError(f"Unknown defense '{req.defense_name}'")


def run_evaluation(req: EvaluationRequest) -> dict:
    """Execute a full evaluation and return a serializable result dict."""
    settings = get_settings()
    device = get_device()
    torch.manual_seed(req.seed)
    if device.type == "cuda":
        torch.cuda.manual_seed_all(req.seed)
    started = time.perf_counter()

    if not ModelRegistry.has(req.model_name):
        raise ValueError(f"Unknown model '{req.model_name}'")
    if not DatasetRegistry.has(req.dataset_name):
        raise ValueError(f"Unknown dataset '{req.dataset_name}'")
    if req.model_name not in ModelRegistry.compatible_models(req.dataset_name):
        raise ValueError(
            f"Model '{req.model_name}' incompatible with '{req.dataset_name}'. "
            f"Compatible: {ModelRegistry.compatible_models(req.dataset_name)}"
        )

    model, defense_label = _build_defended_model(req, device)
    model.to(device).eval()

    loader_cls = DatasetRegistry.get(req.dataset_name)
    test_loader = loader_cls.dataloader(
        train=False,
        batch_size=req.batch_size,
        limit=req.sample_limit,
        pin_memory=requires_pin_memory(device),
        num_workers=settings.num_workers,
    )

    params = req.attack_params.model_dump()
    attack = AttackRegistry.create(req.attack_name, model, params)

    # Optional source model for transferability.
    source_model = None
    if defense_label == "none":
        other = [m for m in ModelRegistry.compatible_models(req.dataset_name) if m != req.model_name]
        if other:
            try:
                source_model = model_service.load_model(other[0], req.dataset_name)
            except Exception:
                source_model = None

    with gpu_execution():
        result = compute_metrics(
            model,
            attack,
            test_loader,
            device=device,
            limit=req.sample_limit,
            epsilon=req.attack_params.epsilon,
            source_model=source_model,
        )
    score, klass = robustness_score(result)
    result.robustness_score = score
    result.robustness_class = klass
    result.parameters.update(
        {
            "model": req.model_name,
            "dataset": req.dataset_name,
            "defense": defense_label,
        }
    )

    metrics = result.as_dict()
    metrics.pop("parameters", None)
    eval_dict = {
        "model": req.model_name,
        "dataset": req.dataset_name,
        "attack": req.attack_name,
        "defense": defense_label,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "clean_accuracy": round(result.clean_accuracy, 2),
            "adversarial_accuracy": round(result.adversarial_accuracy, 2),
            "accuracy_drop": round(result.accuracy_drop, 2),
            "attack_success_rate": round(result.attack_success_rate, 2),
            "confidence_shift": round(result.confidence_shift, 2),
            "transferability_index": round(result.transferability_index, 2),
            "execution_time": round(result.execution_time, 3),
            "robustness_score": result.robustness_score,
            "robustness_class": result.robustness_class,
            "n_samples": result.n_samples,
        },
        "parameters": result.parameters,
    }

    # Reports.
    report_paths = {
        "csv": generate_csv(eval_dict),
        "html": generate_html(eval_dict),
        "pdf": generate_pdf(eval_dict),
    }
    eval_dict["reports"] = report_paths

    # Persist.
    record = _persist(result, req, defense_label, report_paths)
    eval_dict["evaluation_id"] = record.id
    eval_dict["total_time"] = round(time.perf_counter() - started, 3)
    logger.info(
        "Evaluation done model=%s dataset=%s attack=%s robustness=%.2f (%s) id=%s",
        req.model_name, req.dataset_name, req.attack_name, score, klass, record.id,
    )
    return eval_dict


def _persist(result, req: EvaluationRequest, defense_label: str, report_paths: dict) -> EvaluationRecord:
    db = SessionLocal()
    try:
        record = EvaluationRecord(
            model_name=req.model_name,
            dataset_name=req.dataset_name,
            attack_name=req.attack_name,
            defense_name=defense_label,
            clean_accuracy=result.clean_accuracy,
            adversarial_accuracy=result.adversarial_accuracy,
            accuracy_drop=result.accuracy_drop,
            attack_success_rate=result.attack_success_rate,
            confidence_shift=result.confidence_shift,
            transferability_index=result.transferability_index,
            execution_time=result.execution_time,
            robustness_score=result.robustness_score,
            robustness_class=result.robustness_class,
            parameters=json.dumps(req.attack_params.model_dump()),
            report_path=report_paths.get("html", ""),
        )
        detail = EvaluationDetail(
            config_json=json.dumps(req.model_dump()),
            summary_json=json.dumps(result.as_dict(), default=str),
        )
        record.details = detail
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    finally:
        db.close()

