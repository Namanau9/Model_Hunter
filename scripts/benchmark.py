"""ModelHunter benchmark suite.

Runs:
1. pytest unit/integration tests
2. Real adversarial evaluation benchmarks across model/dataset/attack combos
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///./benchmark_modelhunter.db")

import torch  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.attacks.registry import AttackRegistry  # noqa: E402
from app.datasets.registry import DatasetRegistry  # noqa: E402
from app.evaluation.metrics import compute_metrics, robustness_score  # noqa: E402
from app.models.registry import ModelRegistry  # noqa: E402
from app.services.model_service import load_model  # noqa: E402
from app.utils.device import get_device, reset_device_cache  # noqa: E402

RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"
RESULTS_DIR.mkdir(exist_ok=True)

BENCHMARK_SAMPLES = 50
ATTACK_PARAMS = {
    "fgsm": {"epsilon": 0.1, "steps": 2},
    "pgd": {"epsilon": 0.1, "steps": 5, "alpha": 0.01},
    "cw": {"c": 1.0, "max_iterations": 10, "learning_rate": 0.01},
    "zoo": {"epsilon": 0.1, "max_iterations": 10, "learning_rate": 0.01},
    "hopskipjump": {"max_iterations": 5, "step_size": 0.1},
}

MODEL_DATASET_PAIRS = [
    ("cnn", "mnist"),
    ("resnet18", "cifar10"),
    ("resnet18", "gtsrb"),
    ("mobilenetv2", "cifar10"),
    ("mobilenetv2", "gtsrb"),
]


def run_pytest() -> dict:
    print("\n=== Running pytest ===")
    import pytest

    exit_code = pytest.main(["-q", str(Path(__file__).resolve().parents[1] / "tests" / "backend")])
    return {
        "test_suite": "backend pytest",
        "passed": exit_code == 0,
        "exit_code": int(exit_code),
    }


def run_api_health_checks() -> dict:
    print("\n=== Running API health checks ===")
    client = TestClient(app)
    endpoints = {
        "health": "/api/health",
        "info": "/api/info",
        "models": "/api/models",
        "datasets": "/api/datasets",
        "attacks": "/api/attacks",
        "defenses": "/api/defenses",
    }
    results = {}
    for name, path in endpoints.items():
        t0 = time.perf_counter()
        r = client.get(path)
        dt = time.perf_counter() - t0
        results[name] = {
            "status_code": r.status_code,
            "success": r.status_code == 200,
            "response_time_ms": round(dt * 1000, 2),
        }
    return results


def run_evaluation_benchmarks() -> list[dict]:
    print("\n=== Running evaluation benchmarks ===")
    reset_device_cache()
    device = str(get_device())
    print(f"Device: {device}")

    rows = []
    for model_name, dataset_name in MODEL_DATASET_PAIRS:
        print(f"\n--- Benchmark: {model_name} on {dataset_name} ---")
        model = load_model(model_name, dataset_name)
        model.to(device).eval()
        loader_cls = DatasetRegistry.get(dataset_name)
        test_loader = loader_cls.dataloader(
            train=False, batch_size=32, limit=BENCHMARK_SAMPLES, pin_memory=False, num_workers=0,
        )

        available_attacks = AttackRegistry.names()
        for attack_name in available_attacks:
            params = ATTACK_PARAMS.get(attack_name, {"epsilon": 0.1, "steps": 3, "max_iterations": 2})
            attack = AttackRegistry.create(attack_name, model, params)

            t0 = time.perf_counter()
            try:
                result = compute_metrics(
                    model, attack, test_loader, device=device, limit=BENCHMARK_SAMPLES,
                    epsilon=params.get("epsilon", 0.1),
                )
                dt = time.perf_counter() - t0
                score, klass = robustness_score(result)
                row = {
                    "model": model_name,
                    "dataset": dataset_name,
                    "attack": attack_name,
                    "device": device,
                    "n_samples": result.n_samples,
                    "clean_accuracy": round(result.clean_accuracy, 2),
                    "adversarial_accuracy": round(result.adversarial_accuracy, 2),
                    "accuracy_drop": round(result.accuracy_drop, 2),
                    "attack_success_rate": round(result.attack_success_rate, 2),
                    "confidence_shift": round(result.confidence_shift, 2),
                    "transferability_index": round(result.transferability_index, 2),
                    "execution_time_sec": round(result.execution_time, 4),
                    "benchmark_time_sec": round(dt, 4),
                    "robustness_score": round(score, 2),
                    "robustness_class": klass,
                    "status": "ok",
                }
                print(
                    f"  {attack_name:15s} | ASR={row['attack_success_rate']:6.2f}% "
                    f"| Acc_drop={row['accuracy_drop']:6.2f}% "
                    f"| Time={row['execution_time_sec']:.3f}s "
                    f"| Score={row['robustness_score']:6.2f} ({klass})"
                )
            except Exception as exc:
                dt = time.perf_counter() - t0
                row = {
                    "model": model_name,
                    "dataset": dataset_name,
                    "attack": attack_name,
                    "device": device,
                    "n_samples": BENCHMARK_SAMPLES,
                    "status": "error",
                    "error": str(exc),
                    "benchmark_time_sec": round(dt, 4),
                }
                print(f"  {attack_name:15s} | ERROR: {exc}")
            rows.append(row)
    return rows


def summarize(rows: list[dict]) -> dict:
    ok = [r for r in rows if r.get("status") == "ok"]
    errors = [r for r in rows if r.get("status") != "ok"]
    return {
        "total_runs": len(rows),
        "successful": len(ok),
        "errors": len(errors),
        "error_details": errors,
        "avg_attack_success_rate": round(sum(r["attack_success_rate"] for r in ok) / max(len(ok), 1), 2),
        "avg_accuracy_drop": round(sum(r["accuracy_drop"] for r in ok) / max(len(ok), 1), 2),
        "avg_execution_time_sec": round(sum(r["execution_time_sec"] for r in ok) / max(len(ok), 1), 4),
        "avg_robustness_score": round(sum(r["robustness_score"] for r in ok) / max(len(ok), 1), 2),
    }


def main() -> None:
    overall_start = time.perf_counter()

    print("=" * 60)
    print("ModelHunter Benchmark Suite")
    print("=" * 60)

    pytest_result = run_pytest()
    api_results = run_api_health_checks()
    eval_rows = run_evaluation_benchmarks()
    summary = summarize(eval_rows)

    total_time = time.perf_counter() - overall_start

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_benchmark_time_sec": round(total_time, 3),
        "pytest": pytest_result,
        "api_health": api_results,
        "evaluations": eval_rows,
        "summary": summary,
    }

    out_path = RESULTS_DIR / f"benchmark_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    out_path.write_text(json.dumps(report, indent=2))
    print(f"\nReport saved to {out_path}")

    print("\n" + "=" * 60)
    print("BENCHMARK SUMMARY")
    print("=" * 60)
    print(f"Total time: {total_time:.2f}s")
    print(f"Pytest: {'PASS' if pytest_result['passed'] else 'FAIL'} (exit_code={pytest_result['exit_code']})")
    print(f"Evaluations: {summary['successful']}/{summary['total_runs']} successful")
    print(f"Avg attack success rate: {summary['avg_attack_success_rate']:.2f}%")
    print(f"Avg accuracy drop:       {summary['avg_accuracy_drop']:.2f}%")
    print(f"Avg execution time:      {summary['avg_execution_time_sec']:.4f}s")
    print(f"Avg robustness score:    {summary['avg_robustness_score']:.2f}")
    if summary["errors"]:
        print(f"Errors: {len(summary['errors'])}")
        for e in summary["error_details"]:
            print(f"  - {e['model']}/{e['dataset']}/{e['attack']}: {e.get('error')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
