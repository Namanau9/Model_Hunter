"""ModelHunter GPU Accuracy Benchmark.

Runs actual accuracy benchmarks on GPU across all models and their
compatible datasets, including clean accuracy and adversarial accuracy
with FGSM and PGD attacks.
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///./benchmark_gpu_modelhunter.db")
os.environ.setdefault("DEVICE", "auto")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import torch  # noqa: E402

from app.attacks.registry import AttackRegistry  # noqa: E402
from app.datasets.registry import DatasetRegistry  # noqa: E402
from app.evaluation.metrics import compute_metrics, robustness_score  # noqa: E402
from app.services.model_service import load_model  # noqa: E402
from app.utils.device import get_device, reset_device_cache, gpu_execution  # noqa: E402

RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"
RESULTS_DIR.mkdir(exist_ok=True)

MODEL_DATASET_PAIRS = [
    ("cnn", "mnist"),
    ("resnet18", "cifar10"),
    ("resnet18", "gtsrb"),
    ("mobilenetv2", "cifar10"),
    ("mobilenetv2", "gtsrb"),
]

SAMPLE_LIMITS = [100, 500]

ATTACKS = ["fgsm", "pgd"]
ATTACK_PARAMS = {
    "fgsm": {"epsilon": 0.1, "steps": 2},
    "pgd": {"epsilon": 0.1, "steps": 5, "alpha": 0.01},
}


def main() -> None:
    overall_start = time.perf_counter()

    print("=" * 70)
    print("ModelHunter GPU Accuracy Benchmark")
    print("=" * 70)

    reset_device_cache()
    device = get_device()
    print(f"GPU device: {device}")
    if device.type == "cuda":
        print(f"GPU name: {torch.cuda.get_device_name(0)}")
        print(f"GPU total memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    else:
        print("WARNING: No GPU detected! Running on CPU.")
        return

    rows = []
    print(f"\n{'Model':<14} {'Dataset':<10} {'Attack':<12} {'Samples':<8} {'Clean%':<9} {'Adv%':<9} {'AccDrop%':<11} {'ASR%':<9} {'Time(s)':<10}")
    print("-" * 105)

    for model_name, dataset_name in MODEL_DATASET_PAIRS:
        print(f"\nLoading {model_name} on {dataset_name}...")
        t_load = time.perf_counter()
        model = load_model(model_name, dataset_name)
        model.to(device).eval()
        load_time = time.perf_counter() - t_load
        print(f"  Loaded checkpoint in {load_time:.2f}s")

        for sl in SAMPLE_LIMITS:
            loader_cls = DatasetRegistry.get(dataset_name)
            test_loader = loader_cls.dataloader(
                train=False, batch_size=64, limit=sl, pin_memory=True, num_workers=0,
            )

            # Clean accuracy only (no attack)
            from app.evaluation.metrics import evaluate_accuracy
            t0 = time.perf_counter()
            clean_acc, n = evaluate_accuracy(model, test_loader, device=str(device), limit=sl)
            clean_time = time.perf_counter() - t0

            row = {
                "model": model_name,
                "dataset": dataset_name,
                "attack": "none",
                "n_samples": n,
                "clean_accuracy": round(clean_acc, 2),
                "adversarial_accuracy": round(clean_acc, 2),
                "accuracy_drop": 0.0,
                "attack_success_rate": 0.0,
                "confidence_shift": 0.0,
                "execution_time_sec": round(clean_time, 4),
                "robustness_score": 0.0,
                "robustness_class": "N/A",
            }
            rows.append(row)
            print(f"{model_name:<14} {dataset_name:<10} {'none':<12} {n:<8} {clean_acc:<9.2f} {clean_acc:<9.2f} {'0.00':<11} {'0.00':<9} {clean_time:<10.4f}")

            # With attacks
            for attack_name in ATTACKS:
                params = ATTACK_PARAMS.get(attack_name, {"epsilon": 0.1})
                attack = AttackRegistry.create(attack_name, model, params)

                t0 = time.perf_counter()
                try:
                    result = compute_metrics(
                        model, attack, test_loader, device=str(device), limit=sl,
                        epsilon=params.get("epsilon", 0.1),
                    )
                    dt = time.perf_counter() - t0
                    score, klass = robustness_score(result)

                    # Guard against NaN
                    if result.confidence_shift != result.confidence_shift:
                        result.confidence_shift = 0.0
                    if score != score:
                        score = 0.0
                        klass = "N/A"

                    row = {
                        "model": model_name,
                        "dataset": dataset_name,
                        "attack": attack_name,
                        "n_samples": result.n_samples,
                        "clean_accuracy": round(result.clean_accuracy, 2),
                        "adversarial_accuracy": round(result.adversarial_accuracy, 2),
                        "accuracy_drop": round(result.accuracy_drop, 2),
                        "attack_success_rate": round(result.attack_success_rate, 2),
                        "confidence_shift": round(result.confidence_shift, 2),
                        "execution_time_sec": round(result.execution_time, 4),
                        "robustness_score": round(score, 2) if score == score else 0.0,
                        "robustness_class": klass,
                    }
                    rows.append(row)
                    print(
                        f"{model_name:<14} {dataset_name:<10} {attack_name:<12} {result.n_samples:<8} "
                        f"{result.clean_accuracy:<9.2f} {result.adversarial_accuracy:<9.2f} "
                        f"{result.accuracy_drop:<11.2f} {result.attack_success_rate:<9.2f} {result.execution_time:<10.4f}"
                    )
                except Exception as exc:
                    row = {
                        "model": model_name,
                        "dataset": dataset_name,
                        "attack": attack_name,
                        "n_samples": sl,
                        "error": str(exc),
                    }
                    rows.append(row)
                    print(f"  ERROR: {exc}")

        # Free GPU memory
        torch.cuda.empty_cache() if torch.cuda.is_available() else None

    total_time = time.perf_counter() - overall_start

    # Build summary
    ok_rows = [r for r in rows if "error" not in r]
    summary = {
        "total_time_sec": round(total_time, 2),
        "device": str(device),
        "gpu_name": torch.cuda.get_device_name(0) if device.type == "cuda" else "N/A",
        "total_runs": len(rows),
        "successful": len(ok_rows),
        "errors": len(rows) - len(ok_rows),
    }

    # Per-model averages (clean accuracy)
    model_accs = {}
    for r in ok_rows:
        if r["attack"] == "none":
            key = r["model"]
            if key not in model_accs:
                model_accs[key] = []
            model_accs[key].append(r)

    print("\n" + "=" * 70)
    print("GPU ACCELERATION SUMMARY")
    print("=" * 70)
    print(f"Total benchmark time: {total_time:.2f}s")
    print(f"Device: {device} ({'NVIDIA GeForce RTX 4050' if device.type == 'cuda' else 'CPU'})")

    print("\n--- Clean Accuracy (GPU) ---")
    for r in ok_rows:
        if r["attack"] == "none":
            print(f"  {r['model']:<14} / {r['dataset']:<10} / {r['n_samples']:<4} samples: "
                  f"{r['clean_accuracy']:.2f}% in {r['execution_time_sec']:.4f}s")

    print("\n--- Adversarial Accuracy (FGSM, 500 samples) ---")
    for r in ok_rows:
        if r["attack"] == "fgsm" and r["n_samples"] >= 500:
            print(f"  {r['model']:<14} / {r['dataset']:<10}: "
                  f"clean={r['clean_accuracy']:.2f}% adv={r['adversarial_accuracy']:.2f}% "
                  f"drop={r['accuracy_drop']:.2f}% ASR={r['attack_success_rate']:.2f}% "
                  f"time={r['execution_time_sec']:.4f}s")

    print("\n--- Timing Comparison (100 vs 500 samples) ---")
    for r in ok_rows:
        if r["attack"] == "none":
            m = r["model"]
            ds = r["dataset"]
            if r["n_samples"] == 100:
                for r2 in ok_rows:
                    if r2["model"] == m and r2["dataset"] == ds and r2["n_samples"] == 500:
                        print(f"  {m:<14} / {ds:<10}: 100 samples={r['execution_time_sec']:.4f}s "
                              f"({r['execution_time_sec']/100*1000:.2f} ms/sample) | "
                              f"500 samples={r2['execution_time_sec']:.4f}s "
                              f"({r2['execution_time_sec']/500*1000:.2f} ms/sample)")

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "per_model_clean_accuracy": {},
        "results": rows,
    }

    for m, accs in model_accs.items():
        for a in accs:
            key = f"{m}_{a['dataset']}"
            if key not in report["per_model_clean_accuracy"]:
                report["per_model_clean_accuracy"][key] = []
            report["per_model_clean_accuracy"][key].append(a)

    out_path = RESULTS_DIR / f"benchmark_gpu_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    out_path.write_text(json.dumps(report, indent=2))
    print(f"\nFull report saved to: {out_path}")


if __name__ == "__main__":
    main()
