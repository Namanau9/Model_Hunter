"""Quick training + attack generation for a single model/dataset pair.
Usage: python scripts/quick_train.py --model mobilenetv2 --dataset cifar10 --epochs 50
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import torch
from torch.utils.data import DataLoader

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config.settings import get_settings
from app.datasets.registry import DatasetRegistry
from app.evaluation.metrics import MetricsResult, robustness_score
from app.services.model_service import train_model
from app.utils.device import get_device
from app.utils.logging import configure_logging, get_logger
from corrected_attacks import (
    FGSMCorrected, PGDCorrected, CarliniWagnerCorrected,
    ZOOCorrected, HopSkipJumpCorrected, get_norm, AttackStats,
)

configure_logging()
logger = get_logger("quick_train")
SEED = 42


def compute_metrics_with_corrected_attack(model, attack, loader, device, epsilon, attack_name):
    """Compute metrics using the corrected attack implementation."""
    import numpy as np
    model.to(device).eval()
    all_adv_preds, all_clean_preds, all_labels = [], [], []
    all_clean_probs, all_adv_probs = [], []
    total_adv_loss = 0.0
    n = 0
    loss_fn = torch.nn.CrossEntropyLoss(reduction="sum")
    stats = AttackStats(epsilon)
    device_str = str(device)

    for x, y in loader:
        x, y = x.to(device), y.to(device)
        x_adv_norm, attack_stats = attack.generate(x, y, device_str)
        with torch.no_grad():
            logits_clean = model(x)
            logits_adv = model(x_adv_norm)
            total_adv_loss += loss_fn(logits_adv, y).item()
        n += y.size(0)
        all_adv_preds.extend(logits_adv.argmax(dim=1).cpu().numpy().tolist())
        all_clean_preds.extend(logits_clean.argmax(dim=1).cpu().numpy().tolist())
        all_labels.extend(y.cpu().numpy().tolist())
        all_clean_probs.append(torch.softmax(logits_clean, dim=1).cpu())
        all_adv_probs.append(torch.softmax(logits_adv, dim=1).cpu())
        stats.linf_values.extend(attack_stats.linf_values)
        stats.l2_values.extend(attack_stats.l2_values)
        stats.asr_correct_denom.extend(attack_stats.asr_correct_denom)
        stats.asr_succeeded.extend(attack_stats.asr_succeeded)

    all_adv_preds = np.array(all_adv_preds)
    all_clean_preds = np.array(all_clean_preds)
    all_labels = np.array(all_labels)
    clean_probs = torch.cat(all_clean_probs)
    adv_probs = torch.cat(all_adv_probs)
    y_tensor = torch.tensor(all_labels)

    clean_acc = (all_clean_preds == all_labels).mean() * 100.0
    adv_acc = (all_adv_preds == all_labels).mean() * 100.0
    acc_drop = clean_acc - adv_acc

    clean_correct = all_clean_preds == all_labels
    flipped = (all_adv_preds != all_clean_preds) & clean_correct
    asr = (flipped.sum() / max(clean_correct.sum(), 1)) * 100.0

    if clean_correct.sum() > 0:
        cc = clean_probs[clean_correct]
        ac = adv_probs[clean_correct]
        yt = y_tensor[clean_correct]
        true_conf_clean = cc.gather(1, yt.view(-1, 1)).squeeze(1).mean().item()
        true_conf_adv = ac.gather(1, yt.view(-1, 1)).squeeze(1).mean().item()
        conf_shift = (true_conf_clean - true_conf_adv) * 100.0
    else:
        conf_shift = 0.0

    stats_dict = stats.as_dict()
    stats_dict["epsilon_violated"] = not stats.verify_epsilon()

    return {
        "n_samples": n,
        "clean_accuracy": round(float(clean_acc), 4),
        "adversarial_accuracy": round(float(adv_acc), 4),
        "accuracy_drop": round(float(acc_drop), 4),
        "attack_success_rate": round(float(asr), 4),
        "adversarial_loss": round(float(total_adv_loss / max(n, 1)), 6),
        "num_clean_correct": int(clean_correct.sum()),
        "num_attacks_succeeded": int(flipped.sum()),
        "num_attacks_failed": int(clean_correct.sum() - flipped.sum()),
        "perturbation_stats": stats_dict,
        "confidence_shift": round(float(conf_shift), 4),
        "confidence_shift_note": "computed over clean-correct subset",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--batch-size", type=int, default=128)
    ap.add_argument("--lr", type=float, default=0.001)
    ap.add_argument("--patience", type=int, default=7)
    ap.add_argument("--skip-attacks", action="store_true")
    args = ap.parse_args()

    device = get_device()
    settings = get_settings()
    torch.manual_seed(SEED)
    if device.type == "cuda":
        torch.cuda.manual_seed_all(SEED)

    # === Phase 1: Train (or load existing checkpoint) ===
    from app.services.model_service import train_model as train
    from app.services.model_service import load_model, checkpoint_path

    ckpt = checkpoint_path(args.model, args.dataset)
    if ckpt.exists():
        logger.info(f"  Checkpoint exists at {ckpt.name}, loading (set --retrain to force retraining)")
    else:
        logger.info(f"Training {args.model} on {args.dataset} ({args.epochs} epochs, lr={args.lr})...")
        result = train(args.model, args.dataset, epochs=args.epochs, batch_size=args.batch_size,
                       learning_rate=args.lr)
        logger.info(f"  Training done: {result}")

    # Load the model
    model = load_model(args.model, args.dataset)
    model = model.to(device)
    model.eval()
    logger.info(f"  Model loaded on {device}")

    # === Phase 2: Clean accuracy on full test set ===
    loader_cls = DatasetRegistry.get(args.dataset)
    test_ds = loader_cls.load(train=False)
    test_loader = DataLoader(test_ds, batch_size=256, shuffle=False, num_workers=0)
    correct = 0
    total = 0
    with torch.no_grad():
        for x, y in test_loader:
            x, y = x.to(device), y.to(device)
            correct += (model(x).argmax(dim=1) == y).sum().item()
            total += y.size(0)
    clean_acc = correct / max(total, 1) * 100.0
    logger.info(f"  Clean accuracy on full test set: {clean_acc:.2f}%")

    if args.skip_attacks:
        logger.info("  Skipping attack evaluation (--skip-attacks)")
        return

    # === Phase 3: Run attacks ===
    norm = get_norm(args.dataset, str(device))
    attack_classes = {
        "fgsm": FGSMCorrected,
        "pgd": PGDCorrected,
        "cw": CarliniWagnerCorrected,
        "zoo": ZOOCorrected,
        "hopskipjump": HopSkipJumpCorrected,
    }
    attacks_to_run = [
        ("fgsm", [0.05, 0.10, 0.20, 0.30]),
        ("pgd", [0.10, 0.20]),
        ("cw", [0.1]),
        ("zoo", [0.1]),
        ("hopskipjump", [0.1]),
    ]

    results_dir = settings.repo_root / "results" / "attacks"
    for attack_name, epsilons in attacks_to_run:
        for eps in epsilons:
            logger.info(f"  Running {attack_name} (eps={eps}) on {args.model}/{args.dataset} ({total} samples)...")
            t0 = time.perf_counter()
            if attack_name == "cw":
                attack = attack_classes[attack_name](model, norm)
            else:
                attack = attack_classes[attack_name](model, norm, epsilon=eps)
            metrics = compute_metrics_with_corrected_attack(model, attack, test_loader, device, eps, attack_name)
            metrics["model"] = args.model
            metrics["dataset"] = args.dataset
            metrics["attack"] = attack_name
            metrics["epsilon"] = eps
            metrics["phase"] = "epsilon_sweep" if attack_name in ("fgsm", "pgd") else "full_test_set"
            if attack_name not in ("fgsm", "pgd"):
                metrics["computational_note"] = "Full test set (no subset)"
            metrics["attack_runtime_sec"] = round(time.perf_counter() - t0, 4)
            metrics["runtime_per_sample_ms"] = round(metrics["attack_runtime_sec"] / max(metrics["n_samples"], 1) * 1000, 4)

            mr = MetricsResult(
                clean_accuracy=metrics["clean_accuracy"],
                adversarial_accuracy=metrics["adversarial_accuracy"],
                accuracy_drop=metrics["accuracy_drop"],
                attack_success_rate=metrics["attack_success_rate"],
                confidence_shift=metrics["confidence_shift"],
                transferability_index=metrics.get("transferability_index", 0.0),
                execution_time=metrics["attack_runtime_sec"],
                n_samples=metrics["n_samples"],
            )
            score, klass = robustness_score(mr)
            metrics["robustness_score"] = score
            metrics["robustness_class"] = klass

            atk_path = results_dir / f"{args.model}_{args.dataset}_{attack_name}_eps{eps}.json"
            atk_path.write_text(json.dumps(metrics, indent=2, default=str))
            logger.info(f"    ASR={metrics['attack_success_rate']:.2f}% acc_drop={metrics['accuracy_drop']:.2f}% "
                        f"robustness={score}({klass}) time={metrics['attack_runtime_sec']:.2f}s")

    logger.info("Training and attack evaluation complete!")


if __name__ == "__main__":
    main()
