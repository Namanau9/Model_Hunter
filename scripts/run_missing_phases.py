"""Supplemental experiment phase: run missing SHAP for 3 models and defenses for 2 GTSRB models.

This script only runs the parts that were missing from the previous full run:
- SHAP explainability for: mobilenetv2/cifar10, resnet18/gtsrb, mobilenetv2/gtsrb
- Defense evaluation for: resnet18/gtsrb, mobilenetv2/gtsrb

Training was already completed; all attack/transfer/defense/gradcam results are already saved.
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone

import numpy as np
import torch
from torch.utils.data import DataLoader

_scripts_dir = str(__import__("pathlib").Path(__file__).resolve().parent)
_backend_dir = str(__import__("pathlib").Path(__file__).resolve().parent.parent / "backend")
sys.path.insert(0, _scripts_dir)
sys.path.insert(0, _backend_dir)

from app.datasets.registry import DatasetRegistry  # noqa: E402
from app.models.registry import ModelRegistry, ModelRegistry as MR  # noqa: E402
from app.config.settings import get_settings  # noqa: E402
from corrected_attacks import get_norm, FGSMCorrected, AttackStats  # noqa: E402
from app.evaluation.metrics import _collect  # noqa: E402
from app.defenses.preprocessing import InputPreprocessing  # noqa: E402
from app.defenses.adversarial_training import AdversarialTraining  # noqa: E402
from app.defenses.ensemble import EnsembleDefense  # noqa: E402

import torch.nn as nn  # noqa: E402

import logging
logger = logging.getLogger(__name__)

RESULTS_DIR = __import__("pathlib").Path(__file__).resolve().parent.parent / "results"

MISSING_SHAP = [
    ("mobilenetv2", "cifar10"),
    ("resnet18", "gtsrb"),
    ("mobilenetv2", "gtsrb"),
]

MISSING_DEFENSES = [
    ("resnet18", "gtsrb"),
    ("mobilenetv2", "gtsrb"),
]


def attack_name_attr(attack) -> str:
    return getattr(attack, "name", "unknown")


def compute_adv_metrics(model: nn.Module, attack, loader: DataLoader, device: str,
                        norm, epsilon: float, y_labels: torch.Tensor | None = None) -> dict:
    """Compute adversarial metrics with proper ASR (only over clean-correct)."""
    model.to(device).eval()
    all_adv_preds, all_clean_preds, all_labels = [], [], []
    total_adv_loss = 0.0
    n = 0
    is_l2_attack = attack_name_attr(attack) in ("cw",)
    check_epsilon = epsilon if not is_l2_attack else 2.0
    stats_accumulator = AttackStats(check_epsilon)
    loss_fn = nn.CrossEntropyLoss(reduction="sum")

    for x, y in loader:
        x, y = x.to(device), y.to(device)
        x_adv_norm, attack_stats = attack.generate(x, y, device)
        with torch.no_grad():
            logits_clean = model(x)
            logits_adv = model(x_adv_norm)
            total_adv_loss += loss_fn(logits_adv, y).item()
        n += y.size(0)
        all_adv_preds.extend(logits_adv.argmax(dim=1).cpu().numpy().tolist())
        all_clean_preds.extend(logits_clean.argmax(dim=1).cpu().numpy().tolist())
        all_labels.extend(y.cpu().numpy().tolist())
        stats_accumulator.linf_values.extend(attack_stats.linf_values)
        stats_accumulator.l2_values.extend(attack_stats.l2_values)
        stats_accumulator.asr_correct_denom.extend(attack_stats.asr_correct_denom)
        stats_accumulator.asr_succeeded.extend(attack_stats.asr_succeeded)
        stats_accumulator.n_samples += attack_stats.n_samples

    all_adv_preds = np.array(all_adv_preds)
    all_clean_preds = np.array(all_clean_preds)
    all_labels = np.array(all_labels)
    clean_acc = (all_clean_preds == all_labels).mean() * 100.0
    adv_acc = (all_adv_preds == all_labels).mean() * 100.0
    acc_drop = clean_acc - adv_acc
    clean_correct = all_clean_preds == all_labels
    flipped = (all_adv_preds != all_clean_preds) & clean_correct
    asr = (flipped.sum() / max(clean_correct.sum(), 1)) * 100.0
    adv_loss = total_adv_loss / max(n, 1)
    stats_dict = stats_accumulator.as_dict()
    stats_dict["epsilon_violated"] = not stats_accumulator.verify_epsilon()

    return {
        "n_samples": n,
        "clean_accuracy": round(float(clean_acc), 4),
        "adversarial_accuracy": round(float(adv_acc), 4),
        "accuracy_drop": round(float(acc_drop), 4),
        "attack_success_rate": round(float(asr), 4),
        "adversarial_loss": round(float(adv_loss), 6),
        "num_clean_correct": int(clean_correct.sum()),
        "num_attacks_succeeded": int(flipped.sum()),
        "num_attacks_failed": int(clean_correct.sum() - flipped.sum()),
        "perturbation_stats": stats_dict,
    }


def run_explainability_shap(model_name: str, dataset_name: str, checkpoint_path: str, device: str) -> dict:
    from app.explainability.shap import generate_shap
    num_classes = DatasetRegistry.num_classes(dataset_name)
    model = ModelRegistry.build(model_name, num_classes, pretrained=False)
    sd = torch.load(checkpoint_path, map_location=device, weights_only=True)
    if isinstance(sd, dict) and "state_dict" in sd:
        model.load_state_dict(sd["state_dict"])
    else:
        model.load_state_dict(sd)
    model.to(device).eval()

    loader_cls = DatasetRegistry.get(dataset_name)
    test_ds = loader_cls.load(train=False)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False, num_workers=0)

    sample_size = min(100, len(test_ds))
    results = []
    method_used = "shap"
    fallback_count = 0

    for i in range(sample_size):
        try:
            r = generate_shap(model, dataset_name, test_loader, i, None, device=str(device))
            results.append(r)
        except Exception as e:
            fallback_count += 1
            if i == 0:
                method_used = "shap_with_fallback"
            try:
                r = generate_shap(model, dataset_name, test_loader, i, None, device=str(device), background_size=10)
                results.append(r)
            except Exception:
                continue

    attributions = [r["heatmap"] for r in results if "heatmap" in r]
    if not attributions:
        return {
            "model": model_name, "dataset": dataset_name,
            "method": "none", "n_samples": 0, "n_successful": 0,
            "n_failed": sample_size, "mean_attribution": 0, "std_attribution": 0,
            "sparsity_mean": 0,
        }

    all_attrs = np.stack(attributions) if attributions else np.array([])
    mean_attr = float(np.mean(np.abs(all_attrs)))
    std_attr = float(np.std(np.abs(all_attrs)))
    nonzero_pixels = (all_attrs > 0).sum(axis=(1, 2)) if all_attrs.ndim == 3 else np.ones(len(all_attrs))
    total_pixels = all_attrs[0].size if all_attrs.size > 0 else 1
    sparsity = float(np.mean(1 - nonzero_pixels / total_pixels)) if total_pixels > 0 else 0

    return {
        "model": model_name,
        "dataset": dataset_name,
        "n_samples": sample_size,
        "n_successful": len(results),
        "n_failed": sample_size - len(results),
        "method": method_used,
        "fallback_count": fallback_count,
        "mean_attribution": round(mean_attr, 6),
        "std_attribution": round(std_attr, 6),
        "sparsity_mean": round(sparsity, 6),
    }


def run_defense_evaluation(model_name: str, dataset_name: str, checkpoint_path: str,
                           attack_name: str, epsilon: float, device: str) -> dict:
    norm = get_norm(dataset_name, device)
    results = {}

    loader_cls = DatasetRegistry.get(dataset_name)
    test_ds = loader_cls.load(train=False)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False, num_workers=0,
                             pin_memory=(device == "cuda" or device.startswith("cuda")))
    train_ds = loader_cls.load(train=True)
    train_loader = DataLoader(train_ds, batch_size=64, shuffle=False, num_workers=0,
                              pin_memory=(device == "cuda" or device.startswith("cuda")), drop_last=False)

    num_classes = DatasetRegistry.num_classes(dataset_name)
    base_model = ModelRegistry.build(model_name, num_classes, pretrained=False)
    base_sd = torch.load(checkpoint_path, map_location=device, weights_only=True)
    if isinstance(base_sd, dict) and "state_dict" in base_sd:
        base_model.load_state_dict(base_sd["state_dict"])
    else:
        base_model.load_state_dict(base_sd)
    base_model.to(device).eval()

    baseline_attack = FGSMCorrected(base_model, norm, epsilon=epsilon)
    baseline = compute_adv_metrics(base_model, baseline_attack, test_loader, device, norm, epsilon)
    baseline["defense"] = "none"
    baseline["computational_note"] = "Full test set (no subset)"
    results["none"] = baseline

    for method in ["gaussian_blur", "jpeg", "feature_squeezing"]:
        prep_model = InputPreprocessing(base_model, method=method).wrap()
        prep_model.to(device).eval()
        attack = FGSMCorrected(prep_model, norm, epsilon=epsilon)
        m = compute_adv_metrics(prep_model, attack, test_loader, device, norm, epsilon)
        m["defense"] = method
        m["computational_note"] = "Full test set (no subset)"
        results[method] = m

    adv_model = ModelRegistry.build(model_name, num_classes, pretrained=False)
    if isinstance(base_sd, dict) and "state_dict" in base_sd:
        adv_model.load_state_dict(base_sd["state_dict"])
    else:
        adv_model.load_state_dict(base_sd)
    adv_defense = AdversarialTraining(adv_model, epsilon=epsilon, epochs=1, learning_rate=0.001)
    train_subset = torch.utils.data.Subset(train_ds, range(min(5000, len(train_ds))))
    train_loader_sub = DataLoader(train_subset, batch_size=64, shuffle=True, num_workers=0)
    adv_defense.train(train_loader_sub, device=str(device))
    wrapped = adv_defense.wrap()
    wrapped.to(device).eval()
    attack = FGSMCorrected(wrapped, norm, epsilon=epsilon)
    m = compute_adv_metrics(wrapped, attack, test_loader, device, norm, epsilon)
    m["defense"] = "adversarial_training"
    m["computational_note"] = "Full test set (no subset)"
    results["adversarial_training"] = m

    compatible = ModelRegistry.compatible_models(dataset_name) if hasattr(ModelRegistry, 'compatible_models') else []
    candidates = []
    for m_name in compatible:
        ckpt = __import__("pathlib").Path(checkpoint_path).parent / f"{m_name}_{dataset_name}_full.pth"
        if ckpt.exists():
            m = ModelRegistry.build(m_name, num_classes, pretrained=False)
            sd2 = torch.load(ckpt, map_location=device, weights_only=True)
            if isinstance(sd2, dict) and "state_dict" in sd2:
                m.load_state_dict(sd2["state_dict"])
            else:
                m.load_state_dict(sd2)
            candidates.append(m)
    if len(candidates) >= 2:
        ens = EnsembleDefense(candidates).wrap()
        ens.to(device).eval()
        attack = FGSMCorrected(ens, norm, epsilon=epsilon)
        m = compute_adv_metrics(ens, attack, test_loader, device, norm, epsilon)
        m["defense"] = "ensemble"
        m["computational_note"] = "Full test set (no subset)"
        results["ensemble"] = m

    baseline_adv_acc = baseline.get("adversarial_accuracy", 0)
    for dname, dres in results.items():
        if "adversarial_accuracy" in dres:
            dres["accuracy_change_from_baseline"] = round(dres["adversarial_accuracy"] - baseline_adv_acc, 2)

    return {
        "model": model_name,
        "dataset": dataset_name,
        "attack": attack_name,
        "epsilon": epsilon,
        "n_samples": len(test_ds),
        "baseline_adversarial_accuracy": round(float(baseline_adv_acc), 4),
        "results": results,
    }


if __name__ == "__main__":
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    print(f"GPU: {torch.cuda.get_device_name() if torch.cuda.is_available() else 'CPU'}")

    settings = get_settings()

    trained_models = {}
    for model_name, dataset_name in [("cnn", "mnist"), ("resnet18", "cifar10"), ("mobilenetv2", "cifar10"), ("resnet18", "gtsrb"), ("mobilenetv2", "gtsrb")]:
        key = f"{model_name}_{dataset_name}"
        ckpt_path = settings.repo_root / "pretrained_models" / f"{key}_full.pth"
        if ckpt_path.exists():
            trained_models[key] = str(ckpt_path)

    # SHAP for missing models
    print("\n=== SHAP Explainability (Missing Models) ===\n")
    for model_name, dataset_name in MISSING_SHAP:
        key = f"{model_name}_{dataset_name}"
        ckpt_path = trained_models.get(key)
        if not ckpt_path:
            print(f"  {key}: checkpoint not found, skipping")
            continue
        try:
            t0 = time.perf_counter()
            shap_result = run_explainability_shap(model_name, dataset_name, ckpt_path, str(device))
            t1 = time.perf_counter()
            print(f"  SHAP {model_name}/{dataset_name}: mean_attr={shap_result['mean_attribution']:.6f} "
                  f"sparsity={shap_result['sparsity_mean']:.4f} time={t1-t0:.1f}s")
            shap_path = RESULTS_DIR / "explainability" / f"{key}_shap.json"
            shap_path.write_text(json.dumps(shap_result, indent=2, default=str))
        except Exception as e:
            logger.error(f"SHAP failed for {model_name}/{dataset_name}: {e}")
            print(f"  SHAP {model_name}/{dataset_name}: FAILED - {e}")

    # Defenses for missing models
    print("\n=== Defense Evaluation (Missing Models) ===\n")
    for model_name, dataset_name in MISSING_DEFENSES:
        key = f"{model_name}_{dataset_name}"
        ckpt_path = trained_models.get(key)
        if not ckpt_path:
            print(f"  {key}: checkpoint not found, skipping")
            continue
        try:
            t0 = time.perf_counter()
            def_result = run_defense_evaluation(model_name, dataset_name, ckpt_path, "fgsm", 0.1, str(device))
            t1 = time.perf_counter()
            print(f"  {model_name}/{dataset_name}/:")
            for dname, dres in def_result["results"].items():
                if "adversarial_accuracy" in dres:
                    change = dres.get("accuracy_change_from_baseline", 0)
                    print(f"    {dname}: adv_acc={dres['adversarial_accuracy']:.2f}% change={change:+.2f}% time={t1-t0:.1f}s")
            def_path = RESULTS_DIR / "defenses" / f"{key}_fgsm_eps0.1.json"
            def_path.write_text(json.dumps(def_result, indent=2, default=str))
        except Exception as e:
            logger.error(f"Defense eval failed for {model_name}/{dataset_name}: {e}")
            print(f"  Defense {model_name}/{dataset_name}: FAILED - {e}")

    print("\nDone!")
