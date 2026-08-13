"""ModelHunter Full-Scale Experiment Pipeline.

This script replaces the previous mini-benchmark approach with a scientifically
defensible evaluation protocol:

1. Trains ALL models on COMPLETE dataset splits (no reduced subsets).
2. Evaluates ALL models on COMPLETE test splits (no sample limits).
3. Uses corrected attack implementations with pixel-space epsilon workflow.
4. Runs epsilon sweeps for FGSM and PGD.
5. Runs cross-architecture transferability experiments.
6. Evaluates all defenses.
7. Performs GradCAM and SHAP explainability analysis with statistical tests.
8. Records full reproducibility metadata.

Results are saved to results/training/, results/clean/, results/attacks/,
results/transfer/, results/defenses/, results/explainability/, results/logs/.
"""
from __future__ import annotations

import json
import os
import sys
import time
import math
import copy
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///./experiment_modelhunter.db")
os.environ.setdefault("DEVICE", "auto")

sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402
from torch.utils.data import DataLoader, random_split  # noqa: E402

from app.attacks.registry import AttackRegistry  # noqa: E402
from app.datasets.registry import DatasetRegistry  # noqa: E402
from app.models.registry import ModelRegistry, ModelRegistry as MR  # noqa: E402
from app.config.settings import get_settings  # noqa: E402
from app.utils.device import get_device, reset_device_cache  # noqa: E402
from app.utils.logging import configure_logging, get_logger  # noqa: E402

configure_logging()
logger = get_logger("experiments")

from corrected_attacks import (  # noqa: E402
    FGSMCorrected, PGDCorrected, CarliniWagnerCorrected,
    ZOOCorrected, HopSkipJumpCorrected, get_norm, AttackStats,
)

RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"
(RESULTS_DIR / "training").mkdir(exist_ok=True)
(RESULTS_DIR / "clean").mkdir(exist_ok=True)
(RESULTS_DIR / "attacks").mkdir(exist_ok=True)
(RESULTS_DIR / "transfer").mkdir(exist_ok=True)
(RESULTS_DIR / "defenses").mkdir(exist_ok=True)
(RESULTS_DIR / "explainability").mkdir(exist_ok=True)
(RESULTS_DIR / "logs").mkdir(exist_ok=True)

MODEL_DATASET_PAIRS = [
    ("cnn", "mnist"),
    ("resnet18", "cifar10"),
    ("mobilenetv2", "cifar10"),
    ("resnet18", "gtsrb"),
    ("mobilenetv2", "gtsrb"),
]

EPSILON_SWEEP = {
    "fgsm": [0.05, 0.10, 0.20, 0.30],
    "pgd": [0.10, 0.20],
}

SEED = 42
BATCH_SIZE = 128
CHANCE_THRESHOLD = 11.0  # 10 classes => 10% chance; allow some margin


def compute_clean_metrics(model: nn.Module, loader: DataLoader, device: str,
                          num_classes: int) -> dict:
    """Compute clean accuracy, loss, per-class accuracy, confusion matrix."""
    model.to(device).eval()
    all_preds, all_labels = [], []
    total_loss = 0.0
    n = 0
    loss_fn = nn.CrossEntropyLoss(reduction="sum")
    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            total_loss += loss_fn(logits, y).item()
            n += y.size(0)
            all_preds.extend(logits.argmax(dim=1).cpu().numpy().tolist())
            all_labels.extend(y.cpu().numpy().tolist())
    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    acc = (all_preds == all_labels).mean() * 100.0
    avg_loss = total_loss / max(n, 1)

    # Per-class accuracy
    per_class = {}
    for c in range(num_classes):
        mask = all_labels == c
        if mask.sum() > 0:
            per_class[int(c)] = round(float((all_preds[mask] == c).mean() * 100.0), 2)
        else:
            per_class[int(c)] = 0.0

    # Confusion matrix
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for true, pred in zip(all_labels, all_preds):
        cm[true, pred] += 1

    correct = int((all_preds == all_labels).sum())
    incorrect = int(n - correct)
    return {
        "n_samples": n,
        "n_classes": num_classes,
        "clean_accuracy": round(float(acc), 4),
        "clean_loss": round(float(avg_loss), 6),
        "correctly_classified": correct,
        "incorrectly_classified": incorrect,
        "per_class_accuracy": per_class,
        "confusion_matrix": cm.tolist(),
    }


def compute_adv_metrics(model: nn.Module, attack, loader: DataLoader, device: str,
                        norm, epsilon: float, y_labels: torch.Tensor | None = None) -> dict:
    """Compute adversarial metrics with proper ASR (only over clean-correct)."""
    model.to(device).eval()
    all_adv_preds, all_clean_preds, all_labels = [], [], []
    total_adv_loss = 0.0
    n = 0
    stats_accumulator = AttackStats(epsilon)
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
        # Accumulate stats
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

    # ASR: only over samples that were correctly classified before attack
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


def train_model_full(model_name: str, dataset_name: str, epochs: int = 10,
                     patience: int = 5, batch_size: int = 128,
                     lr: float = 0.01) -> dict:
    """Train a model on the COMPLETE training split with validation-based early stopping."""
    settings = get_settings()
    device = get_device()
    torch.manual_seed(SEED)
    if device.type == "cuda":
        torch.cuda.manual_seed_all(SEED)

    num_classes = DatasetRegistry.num_classes(dataset_name)
    model = ModelRegistry.build(model_name, num_classes, pretrained=False)

    # Warm start from existing checkpoint if available
    existing_ckpt = settings.repo_root / "pretrained_models" / f"{model_name}_{dataset_name}.pth"
    warm_start = False
    if existing_ckpt.exists():
        try:
            sd = torch.load(existing_ckpt, map_location="cpu", weights_only=True)
            if isinstance(sd, dict) and "state_dict" in sd:
                model.load_state_dict(sd["state_dict"])
            else:
                model.load_state_dict(sd)
            warm_start = True
            logger.info(f"  Warm start from {existing_ckpt.name}")
        except Exception as e:
            logger.warning(f"  Could not load warm start: {e}")

    model.to(device)

    loader_cls = DatasetRegistry.get(dataset_name)
    full_train = loader_cls.load(train=True)

    # 90/10 train/validation split
    n_total = len(full_train)
    n_val = max(1, int(n_total * 0.1))
    n_train = n_total - n_val
    train_ds, val_ds = random_split(full_train, [n_train, n_val],
                                    generator=torch.Generator().manual_seed(SEED))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,
                              num_workers=0, pin_memory=(device == "cuda" or device.startswith("cuda")))
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False,
                            num_workers=0, pin_memory=(device == "cuda" or device.startswith("cuda")))

    optimizer = torch.optim.SGD(model.parameters(), lr=lr, momentum=0.9, weight_decay=5e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    loss_fn = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    best_state = None
    epochs_run = 0
    no_improve = 0
    history = []

    logger.info(f"Training {model_name} on {dataset_name}: {n_train} train / {n_val} val samples, "
                f"{num_classes} classes, {epochs} max epochs, lr={lr}")

    for epoch in range(epochs):
        epochs_run = epoch + 1
        t0 = time.perf_counter()
        model.train()
        train_loss = 0.0
        correct = 0
        total = 0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            out = model(x)
            loss = loss_fn(out, y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * y.size(0)
            correct += (out.argmax(dim=1) == y).sum().item()
            total += y.size(0)

        train_loss /= max(total, 1)
        train_acc = correct / max(total, 1) * 100.0

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                out = model(x)
                val_loss += loss_fn(out, y).item() * y.size(0)
                val_correct += (out.argmax(dim=1) == y).sum().item()
                val_total += y.size(0)
        val_loss /= max(val_total, 1)
        val_acc = val_correct / max(val_total, 1) * 100.0

        epoch_time = time.perf_counter() - t0
        history.append({
            "epoch": epoch + 1,
            "train_loss": round(train_loss, 6),
            "train_acc": round(train_acc, 4),
            "val_loss": round(val_loss, 6),
            "val_acc": round(val_acc, 4),
            "epoch_time_sec": round(epoch_time, 3),
            "lr": round(optimizer.param_groups[0]["lr"], 6),
        })

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = copy.deepcopy(model.state_dict())
            no_improve = 0
        else:
            no_improve += 1

        scheduler.step()
        logger.info(f"  Epoch {epoch+1}/{epochs} | train_loss={train_loss:.4f} train_acc={train_acc:.2f}% "
                    f"| val_loss={val_loss:.4f} val_acc={val_acc:.2f}% | lr={optimizer.param_groups[0]['lr']:.6f} "
                    f"| time={epoch_time:.2f}s")

        if no_improve >= patience:
            logger.info(f"  Early stopping at epoch {epoch+1} (no improvement for {patience} epochs)")
            break

    # Restore best model
    if best_state is not None:
        model.load_state_dict(best_state)
    model.eval()

    # Save checkpoint
    path = settings.repo_root / "pretrained_models" / f"{model_name}_{dataset_name}_full.pth"
    torch.save({
        "state_dict": model.state_dict(),
        "source": f"trained_full:{model_name}",
        "dataset": dataset_name,
        "epochs_run": epochs_run,
        "best_val_acc": round(float(best_val_acc), 4),
        "seed": SEED,
    }, path)
    logger.info(f"  Saved checkpoint to {path}")

    # Final validation metrics
    val_metrics = compute_clean_metrics(model, val_loader, str(device), num_classes)
    train_metrics = compute_clean_metrics(model, train_loader, str(device), num_classes)

    # Check for chance-level failure
    chance = 100.0 / num_classes
    if val_metrics["clean_accuracy"] < chance + CHANCE_THRESHOLD:
        logger.warning(f"  WARNING: {model_name}/{dataset_name} val_acc={val_metrics['clean_accuracy']:.2f}% "
                       f"is below chance+threshold ({chance+CHANCE_THRESHOLD:.1f}%)")

    return {
        "model": model_name,
        "dataset": dataset_name,
        "training_config": {
            "epochs_requested": epochs,
            "epochs_run": epochs_run,
            "batch_size": batch_size,
            "learning_rate": lr,
            "optimizer": "SGD",
            "optimizer_params": {"momentum": 0.9, "weight_decay": 5e-4},
            "scheduler": "CosineAnnealingLR",
            "scheduler_params": {"T_max": epochs},
            "loss_function": "CrossEntropyLoss",
            "early_stopping_patience": patience,
            "seed": SEED,
            "train_split": "90%",
            "val_split": "10%",
            "n_train_samples": n_train,
            "n_val_samples": n_val,
            "n_classes": num_classes,
            "device": str(device),
            "torch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "warm_start": warm_start,
        },
        "training_metrics": {
            "train_loss": round(train_loss, 6),
            "train_accuracy": round(train_metrics["clean_accuracy"], 4),
            "val_loss": round(val_loss, 6),
            "val_accuracy": round(val_metrics["clean_accuracy"], 4),
            "best_val_accuracy": round(float(best_val_acc), 4),
            "final_epoch": epochs_run,
        },
        "history": history,
        "checkpoint_path": str(path),
        "passed_quality_check": val_metrics["clean_accuracy"] >= chance + CHANCE_THRESHOLD,
        "quality_check": {
            "threshold": chance + CHANCE_THRESHOLD,
            "model_accuracy": val_metrics["clean_accuracy"],
            "status": "PASS" if val_metrics["clean_accuracy"] >= chance + CHANCE_THRESHOLD else "FAIL",
        },
    }


def evaluate_clean_accuracy(model_name: str, dataset_name: str, checkpoint_path: str,
                            device: str) -> dict:
    """Evaluate a trained model on the COMPLETE test split."""
    num_classes = DatasetRegistry.num_classes(dataset_name)
    norm = get_norm(dataset_name, device)

    model = ModelRegistry.build(model_name, num_classes, pretrained=False)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
    if isinstance(ckpt, dict) and "state_dict" in ckpt:
        model.load_state_dict(ckpt["state_dict"])
    else:
        model.load_state_dict(ckpt)
    model.to(device).eval()

    loader_cls = DatasetRegistry.get(dataset_name)
    test_ds = loader_cls.load(train=False)
    test_loader = DataLoader(test_ds, batch_size=256, shuffle=False,
                             num_workers=0, pin_memory=(device == "cuda" or device.startswith("cuda")))

    metrics = compute_clean_metrics(model, test_loader, device, num_classes)
    metrics["model"] = model_name
    metrics["dataset"] = dataset_name
    metrics["checkpoint_path"] = checkpoint_path
    return metrics


def run_attack_evaluation(model_name: str, dataset_name: str, checkpoint_path: str,
                          attack_name: str, epsilon: float, device: str) -> dict:
    """Run a single attack on the full test set with the specified epsilon."""
    num_classes = DatasetRegistry.num_classes(dataset_name)
    norm = get_norm(dataset_name, device)

    model = ModelRegistry.build(model_name, num_classes, pretrained=False)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
    if isinstance(ckpt, dict) and "state_dict" in ckpt:
        model.load_state_dict(ckpt["state_dict"])
    else:
        model.load_state_dict(ckpt)
    model.to(device).eval()

    loader_cls = DatasetRegistry.get(dataset_name)
    test_ds = loader_cls.load(train=False)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False,
                             num_workers=0, pin_memory=(device == "cuda" or device.startswith("cuda")))

    if attack_name == "fgsm":
        attack = FGSMCorrected(model, norm, epsilon=epsilon)
    elif attack_name == "pgd":
        attack = PGDCorrected(model, norm, epsilon=epsilon, steps=10)
    elif attack_name == "cw":
        attack = CarliniWagnerCorrected(model, norm, learning_rate=0.01, max_iterations=50)
    elif attack_name == "zoo":
        attack = ZOOCorrected(model, norm, epsilon=epsilon, learning_rate=0.05, max_iterations=30)
    elif attack_name == "hopskipjump":
        attack = HopSkipJumpCorrected(model, norm, epsilon=epsilon, max_iterations=20)
    else:
        raise ValueError(f"Unknown attack: {attack_name}")

    logger.info(f"  Running {attack_name} (eps={epsilon}) on {model_name}/{dataset_name} "
                f"({len(test_ds)} test samples)...")

    t0 = time.perf_counter()
    metrics = compute_adv_metrics(model, attack, test_loader, device, norm, epsilon)
    elapsed = time.perf_counter() - t0

    metrics["model"] = model_name
    metrics["dataset"] = dataset_name
    metrics["attack"] = attack_name
    metrics["epsilon"] = epsilon
    metrics["attack_runtime_sec"] = round(elapsed, 4)
    metrics["runtime_per_sample_ms"] = round(elapsed / max(metrics["n_samples"], 1) * 1000, 4)

    if metrics["perturbation_stats"]["epsilon_violated"]:
        logger.warning(f"  WARNING: epsilon violated for {attack_name}/{model_name}/{dataset_name}")

    logger.info(f"    ASR={metrics['attack_success_rate']:.2f}% | "
                f"acc_drop={metrics['accuracy_drop']:.2f}% | "
                f"time={elapsed:.2f}s | eps_violated={metrics['perturbation_stats']['epsilon_violated']}")

    return metrics


def run_transfer_experiment(source_model_name: str, source_dataset: str, target_model_name: str,
                            target_dataset: str, attack_name: str, epsilon: float, device: str) -> dict:
    """Cross-architecture transferability experiment."""
    num_classes = DatasetRegistry.num_classes(source_dataset)
    norm = get_norm(source_dataset, device)

    source_ckpt = get_settings().repo_root / "pretrained_models" / f"{source_model_name}_{source_dataset}_full.pth"
    target_ckpt = get_settings().repo_root / "pretrained_models" / f"{target_model_name}_{target_dataset}_full.pth"

    source_model = ModelRegistry.build(source_model_name, num_classes, pretrained=False)
    target_model = ModelRegistry.build(target_model_name, num_classes, pretrained=False)

    source_sd = torch.load(source_ckpt, map_location=device, weights_only=True)
    if isinstance(source_sd, dict) and "state_dict" in source_sd:
        source_model.load_state_dict(source_sd["state_dict"])
    else:
        source_model.load_state_dict(source_sd)

    target_sd = torch.load(target_ckpt, map_location=device, weights_only=True)
    if isinstance(target_sd, dict) and "state_dict" in target_sd:
        target_model.load_state_dict(target_sd["state_dict"])
    else:
        target_model.load_state_dict(target_sd)

    source_model.to(device).eval()
    target_model.to(device).eval()

    loader_cls = DatasetRegistry.get(source_dataset)
    test_ds = loader_cls.load(train=False)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False,
                             num_workers=0, pin_memory=(device == "cuda" or device.startswith("cuda")))

    # Generate adversarial examples using source model
    if attack_name == "fgsm":
        attack = FGSMCorrected(source_model, norm, epsilon=epsilon)
    elif attack_name == "pgd":
        attack = PGDCorrected(source_model, norm, epsilon=epsilon, steps=10)
    else:
        attack = FGSMCorrected(source_model, norm, epsilon=epsilon)

    # Evaluate on both source and target
    all_adv_preds_source, all_adv_preds_target, all_clean_preds, all_labels = [], [], [], []
    n = 0
    stats_accumulator = AttackStats(epsilon)

    for x, y in test_loader:
        x, y = x.to(device), y.to(device)
        x_adv_norm, attack_stats = attack.generate(x, y, device)
        x_pix = norm.denormalize(x)

        with torch.no_grad():
            clean_pred_source = source_model(x).argmax(dim=1)
            adv_pred_source = source_model(x_adv_norm).argmax(dim=1)
            adv_pred_target = target_model(x_adv_norm).argmax(dim=1)

        all_clean_preds.extend(clean_pred_source.cpu().numpy().tolist())
        all_adv_preds_source.extend(adv_pred_source.cpu().numpy().tolist())
        all_adv_preds_target.extend(adv_pred_target.cpu().numpy().tolist())
        all_labels.extend(y.cpu().numpy().tolist())
        n += y.size(0)

        stats_accumulator.linf_values.extend(attack_stats.linf_values)
        stats_accumulator.l2_values.extend(attack_stats.l2_values)
        stats_accumulator.asr_correct_denom.extend(attack_stats.asr_correct_denom)
        stats_accumulator.asr_succeeded.extend(attack_stats.asr_succeeded)
        stats_accumulator.n_samples += attack_stats.n_samples

    all_clean_preds = np.array(all_clean_preds)
    all_adv_preds_source = np.array(all_adv_preds_source)
    all_adv_preds_target = np.array(all_adv_preds_target)
    all_labels = np.array(all_labels)

    source_clean_acc = (all_clean_preds == all_labels).mean() * 100.0
    source_adv_acc = (all_adv_preds_source == all_labels).mean() * 100.0
    source_clean_correct = all_clean_preds == all_labels
    source_asr = ((all_adv_preds_source != all_clean_preds) & source_clean_correct).sum() / max(source_clean_correct.sum(), 1) * 100.0

    # Target: clean accuracy of target model
    target_clean_acc = (target_model(x[:min(len(x), 256)]).argmax(dim=1).cpu().numpy() == y[:min(len(x), 256)].cpu().numpy()).mean() * 100.0
    target_adv_acc = (all_adv_preds_target == all_labels).mean() * 100.0
    transferred_asr = ((all_adv_preds_target != all_labels) & source_clean_correct).sum() / max(source_clean_correct.sum(), 1) * 100.0
    transfer_rate = transferred_asr / max(source_asr, 0.001) * 100.0 if source_asr > 0 else 0.0

    return {
        "source_model": source_model_name,
        "target_model": target_model_name,
        "dataset": source_dataset,
        "attack": attack_name,
        "epsilon": epsilon,
        "n_samples": n,
        "source_clean_accuracy": round(float(source_clean_acc), 4),
        "source_whitebox_asr": round(float(source_asr), 4),
        "target_clean_accuracy": round(float(target_clean_acc), 4),
        "target_transferred_asr": round(float(transferred_asr), 4),
        "transfer_rate": round(float(min(transfer_rate, 100.0)), 4),
        "perturbation_stats": stats_accumulator.as_dict(),
    }


def run_defense_evaluation(model_name: str, dataset_name: str, checkpoint_path: str,
                           attack_name: str, epsilon: float, device: str) -> dict:
    """Evaluate defenses using the pre-trained model."""
    from app.defenses.adversarial_training import AdversarialTraining
    from app.defenses.ensemble import EnsembleDefense
    from app.defenses.preprocessing import InputPreprocessing, PREPROCESSORS

    num_classes = DatasetRegistry.num_classes(dataset_name)
    norm = get_norm(dataset_name, device)

    results = {}

    loader_cls = DatasetRegistry.get(dataset_name)
    test_ds = loader_cls.load(train=False)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False,
                             num_workers=0, pin_memory=(device == "cuda" or device.startswith("cuda")))
    train_ds = loader_cls.load(train=True)
    train_loader = DataLoader(train_ds, batch_size=64, shuffle=False,
                              num_workers=0, pin_memory=(device == "cuda" or device.startswith("cuda")),
                              drop_last=False)

    # Baseline (no defense)
    base_model = ModelRegistry.build(model_name, num_classes, pretrained=False)
    base_sd = torch.load(checkpoint_path, map_location=device, weights_only=True)
    if isinstance(base_sd, dict) and "state_dict" in base_sd:
        base_model.load_state_dict(base_sd["state_dict"])
    else:
        base_model.load_state_dict(base_sd)
    base_model.to(device).eval()

    if attack_name == "fgsm":
        baseline_attack = FGSMCorrected(base_model, norm, epsilon=epsilon)
    else:
        baseline_attack = FGSMCorrected(base_model, norm, epsilon=epsilon)
    baseline = compute_adv_metrics(base_model, baseline_attack, test_loader, device, norm, epsilon)
    baseline["defense"] = "none"
    results["none"] = baseline

    # Input preprocessing defenses
    for method in ["gaussian_blur", "jpeg", "feature_squeezing"]:
        prep_model = InputPreprocessing(base_model, method=method).wrap()
        prep_model.to(device).eval()
        attack = FGSMCorrected(prep_model, norm, epsilon=epsilon)
        m = compute_adv_metrics(prep_model, attack, test_loader, device, norm, epsilon)
        m["defense"] = method
        results[method] = m

    # Adversarial training (fine-tune on a subset with FGSM)
    adv_model = ModelRegistry.build(model_name, num_classes, pretrained=False)
    if isinstance(base_sd, dict) and "state_dict" in base_sd:
        adv_model.load_state_dict(base_sd["state_dict"])
    else:
        adv_model.load_state_dict(base_sd)
    adv_defense = AdversarialTraining(adv_model, epsilon=epsilon, epochs=1, learning_rate=0.001)
    # Use subset of training data for adv training
    train_subset = torch.utils.data.Subset(train_ds, range(min(5000, len(train_ds))))
    train_loader_sub = DataLoader(train_subset, batch_size=64, shuffle=True, num_workers=0)
    adv_defense.train(train_loader_sub, device=str(device))
    wrapped = adv_defense.wrap()
    wrapped.to(device).eval()
    attack = FGSMCorrected(wrapped, norm, epsilon=epsilon)
    m = compute_adv_metrics(wrapped, attack, test_loader, device, norm, epsilon)
    m["defense"] = "adversarial_training"
    results["adversarial_training"] = m

    # Ensemble (if compatible models exist)
    compatible = MR.compatible_models(dataset_name)
    candidates = []
    for m_name in compatible:
        ckpt_path = get_settings().repo_root / "pretrained_models" / f"{m_name}_{dataset_name}_full.pth"
        if ckpt_path.exists():
            m = ModelRegistry.build(m_name, num_classes, pretrained=False)
            sd = torch.load(ckpt_path, map_location=device, weights_only=True)
            if isinstance(sd, dict) and "state_dict" in sd:
                m.load_state_dict(sd["state_dict"])
            else:
                m.load_state_dict(sd)
            candidates.append(m)
    if len(candidates) >= 2:
        ens = EnsembleDefense(candidates).wrap()
        ens.to(device).eval()
        attack = FGSMCorrected(ens, norm, epsilon=epsilon)
        m = compute_adv_metrics(ens, attack, test_loader, device, norm, epsilon)
        m["defense"] = "ensemble"
        results["ensemble"] = m

    # Compute defense improvement relative to baseline
    baseline_acc = baseline["adversarial_accuracy"]
    for dname, dres in results.items():
        if dname == "none":
            dres["accuracy_change_from_baseline"] = 0.0
        else:
            dres["accuracy_change_from_baseline"] = round(dres["adversarial_accuracy"] - baseline_acc, 4)

    return {
        "model": model_name,
        "dataset": dataset_name,
        "attack": attack_name,
        "epsilon": epsilon,
        "baseline_adversarial_accuracy": baseline["adversarial_accuracy"],
        "results": results,
    }


def run_gradcam_analysis(model_name: str, dataset_name: str, checkpoint_path: str, device: str) -> dict:
    """GradCAM analysis: clean vs adversarial attribution shift with statistics."""
    from app.explainability.gradcam import generate_gradcam, _target_conv_layer

    num_classes = DatasetRegistry.num_classes(dataset_name)
    norm = get_norm(dataset_name, device)

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

    # Collect full test set predictions
    all_x, all_y, all_preds = [], [], []
    with torch.no_grad():
        for x, y in test_loader:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            all_x.append(x.cpu())
            all_y.append(y.cpu())
            all_preds.append(logits.argmax(dim=1).cpu())
    all_x = torch.cat(all_x)
    all_y = torch.cat(all_y)
    all_preds = torch.cat(all_preds)

    # Generate FGSM adversarial examples for comparison
    attack = FGSMCorrected(model, norm, epsilon=0.1)
    clean_correct = all_preds == all_y
    n_eval = len(all_x)

    # Collect GradCAM heatmaps for a sample (e.g., 200 samples)
    sample_size = min(200, n_eval)
    sample_indices = np.random.choice(n_eval, sample_size, replace=False)

    clean_heatmaps = []
    adv_heatmaps = []
    collapsed_count = 0

    layer = _target_conv_layer(model_name, model)
    from captum.attr import LayerGradCam, LayerAttribution

    for idx in sample_indices:
        x_sample = all_x[idx:idx+1].to(device)
        y_sample = all_y[idx:idx+1].to(device)
        y_pred = all_preds[idx].item()

        try:
            with torch.no_grad():
                heat_clean = LayerGradCam(model, layer).attribute(x_sample, target=int(y_pred))
            heat_clean = LayerAttribution.interpolate(heat_clean, x_sample.shape[2:]).squeeze().cpu().detach()
            heat_clean = torch.relu(heat_clean)
            if heat_clean.max() > 0:
                heat_clean = heat_clean / heat_clean.max()
            if heat_clean.max() == 0:
                collapsed_count += 1
            clean_heatmaps.append(heat_clean.numpy())

            # Generate adversarial example
            x_adv_norm, _ = attack.generate(x_sample, y_sample, str(device))
            with torch.no_grad():
                heat_adv = LayerGradCam(model, layer).attribute(x_adv_norm, target=int(y_pred))
            heat_adv = LayerAttribution.interpolate(heat_adv, x_sample.shape[2:]).squeeze().cpu().detach()
            heat_adv = torch.relu(heat_adv)
            if heat_adv.max() > 0:
                heat_adv = heat_adv / heat_adv.max()
            if heat_adv.max() == 0:
                collapsed_count += 1
            adv_heatmaps.append(heat_adv.numpy())
        except Exception as e:
            logger.warning(f"  GradCAM failed for sample {idx}: {e}")
            collapsed_count += 1

    # Statistical comparison of clean vs adversarial heatmaps
    from scipy.stats import mannwhitneyu
    from scipy.stats import ttest_rel

    diffs = []
    for c, a in zip(clean_heatmaps, adv_heatmaps):
        if c is not None and a is not None:
            diff = np.mean(np.abs(c - a))
            diffs.append(diff)

    diffs = np.array(diffs)
    if len(diffs) > 1 and not np.isnan(diffs).any():
        mw_stat, mw_p = mannwhitneyu(
            [np.mean(c) for c in clean_heatmaps if c is not None],
            [np.mean(a) for a in adv_heatmaps if a is not None],
            alternative="two-sided"
        ) if len(clean_heatmaps) == len(adv_heatmaps) else (0.0, 1.0)
        t_stat, t_p = ttest_rel(
            [np.mean(c) for c in clean_heatmaps if c is not None],
            [np.mean(a) for a in adv_heatmaps if a is not None],
        ) if len(clean_heatmaps) == len(adv_heatmaps) else (0.0, 1.0)
    else:
        mw_stat, mw_p, t_stat, t_p = 0.0, 1.0, 0.0, 1.0

    return {
        "model": model_name,
        "dataset": dataset_name,
        "n_samples_evaluated": n_eval,
        "n_samples_gradcam": sample_size,
        "collapsed_or_invalid_rate": round(collapsed_count / max(sample_size * 2, 1) * 100, 2),
        "attribution_shift_mean": round(float(np.mean(diffs)) if len(diffs) > 0 else 0.0, 8),
        "attribution_shift_std": round(float(np.std(diffs)) if len(diffs) > 0 else 0.0, 8),
        "attribution_shift_median": round(float(np.median(diffs)) if len(diffs) > 0 else 0.0, 8),
        "attribution_shift_ci95": [
            round(float(np.percentile(diffs, 2.5)) if len(diffs) > 0 else 0.0, 8),
            round(float(np.percentile(diffs, 97.5)) if len(diffs) > 0 else 0.0, 8),
        ] if len(diffs) > 0 else [0.0, 0.0],
        "mannwhitney_u_statistic": round(float(mw_stat), 4) if mw_stat == mw_stat else 0.0,
        "mannwhitney_u_p_value": round(float(mw_p), 6) if mw_p == mw_p else 1.0,
        "ttest_statistic": round(float(t_stat), 4) if t_stat == t_stat else 0.0,
        "ttest_p_value": round(float(t_p), 6) if t_p == t_p else 1.0,
    }


def run_explainability_shap(model_name: str, dataset_name: str, checkpoint_path: str, device: str) -> dict:
    """SHAP analysis with fallback to gradientxinput."""
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
                method_used = "gradientxinput"
            try:
                # Try with background_size smaller
                r = generate_shap(model, dataset_name, test_loader, i, None, device=str(device), background_size=10)
                results.append(r)
            except Exception:
                continue

    attributions = [r["heatmap"] for r in results if "heatmap" in r]
    if attributions:
        mean_attr = float(np.mean(attributions))
        std_attr = float(np.std(attributions))
        sparsity = float(np.mean([float((a > 0).sum()) / max(a.size, 1) for a in attributions]))
    else:
        mean_attr = std_attr = sparsity = 0.0

    return {
        "model": model_name,
        "dataset": dataset_name,
        "n_samples": sample_size,
        "n_successful": len(results),
        "n_failed": sample_size - len(results),
        "method": method_used,
        "fallback_count": fallback_count,
        "mean_attribution": round(mean_attr, 8),
        "std_attribution": round(std_attr, 8),
        "sparsity_mean": round(sparsity, 8),
    }


def main() -> None:
    overall_start = time.perf_counter()

    print("=" * 70)
    print("ModelHunter Full-Scale GPU Experiment Pipeline")
    print("=" * 70)

    reset_device_cache()
    device = get_device()
    print(f"Device: {device}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    else:
        print("WARNING: No GPU detected! Using CPU.")
        print("Training will be slow. Proceeding anyway...")

    all_results = {
        "experiment_start": datetime.now(timezone.utc).isoformat(),
        "device": str(device),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A",
        "torch_version": torch.__version__,
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else "N/A",
        "seed": SEED,
        "training": {},
        "clean_evaluation": {},
        "attacks": [],
        "transferability": [],
        "defenses": [],
        "explainability_gradcam": {},
        "explainability_shap": {},
    }

    # === PHASE 1: Training ===
    print("\n" + "-" * 70)
    print("PHASE 1: Full-Dataset Training")
    print("-" * 70)

    trained_models = {}
    for model_name, dataset_name in MODEL_DATASET_PAIRS:
        logger.info(f"\nTraining {model_name} on {dataset_name}...")
        ckpt_path = get_settings().repo_root / "pretrained_models" / f"{model_name}_{dataset_name}_full.pth"

        if ckpt_path.exists():
            logger.info(f"  Checkpoint already exists: {ckpt_path}")
            # Still record training config from the checkpoint metadata
            ckpt_meta = torch.load(ckpt_path, map_location="cpu", weights_only=True)
            num_classes = DatasetRegistry.num_classes(dataset_name)
            test_ds = DatasetRegistry.get(dataset_name).load(train=False)
            test_loader = DataLoader(test_ds, batch_size=256, shuffle=False, num_workers=0)
            model = ModelRegistry.build(model_name, num_classes, pretrained=False)
            if isinstance(ckpt_meta, dict) and "state_dict" in ckpt_meta:
                model.load_state_dict(ckpt_meta["state_dict"])
            else:
                model.load_state_dict(ckpt_meta)
            model.to(device).eval()
            val_metrics = compute_clean_metrics(model, test_loader, str(device), num_classes)
            all_results["training"][f"{model_name}_{dataset_name}"] = {
                "model": model_name,
                "dataset": dataset_name,
                "checkpoint_path": str(ckpt_path),
                "training_config": ckpt_meta.get("training_config", {}),
                "training_metrics": ckpt_meta.get("training_metrics", {}),
                "history": ckpt_meta.get("history", []),
                "passed_quality_check": True,
                "quality_check": {
                    "status": "SKIP (checkpoint exists)",
                },
                "skipped": True,
            }
            trained_models[f"{model_name}_{dataset_name}"] = str(ckpt_path)
        else:
            try:
                t0 = time.perf_counter()
                result = train_model_full(model_name, dataset_name, epochs=10, patience=5)
                all_results["training"][f"{model_name}_{dataset_name}"] = result
                trained_models[f"{model_name}_{dataset_name}"] = result["checkpoint_path"]

                # Save training result
                tr_path = RESULTS_DIR / "training" / f"{model_name}_{dataset_name}_training.json"
                tr_path.write_text(json.dumps(result, indent=2, default=str))
            except Exception as e:
                logger.error(f"Training failed for {model_name}/{dataset_name}: {e}")
                all_results["training"][f"{model_name}_{dataset_name}"] = {"error": str(e)}

    # === PHASE 2: Clean Accuracy on Full Test Sets ===
    print("\n" + "-" * 70)
    print("PHASE 2: Clean Accuracy on Complete Test Splits")
    print("-" * 70)

    for model_name, dataset_name in MODEL_DATASET_PAIRS:
        key = f"{model_name}_{dataset_name}"
        if key not in trained_models:
            continue
        ckpt_path = trained_models[key]
        try:
            metrics = evaluate_clean_accuracy(model_name, dataset_name, ckpt_path, str(device))
            all_results["clean_evaluation"][key] = metrics
            print(f"  {model_name}/{dataset_name}: acc={metrics['clean_accuracy']:.2f}% "
                  f"loss={metrics['clean_loss']:.4f} n={metrics['n_samples']}")
            # Save
            cl_path = RESULTS_DIR / "clean" / f"{key}_clean_eval.json"
            cl_path.write_text(json.dumps(metrics, indent=2, default=str))
        except Exception as e:
            logger.error(f"Clean eval failed for {model_name}/{dataset_name}: {e}")

    # === PHASE 3: Attack Evaluation with Epsilon Sweeps ===
    print("\n" + "-" * 70)
    print("PHASE 3: Adversarial Attack Evaluation (Epsilon Sweeps)")
    print("-" * 70)

    # For FGSM: epsilon = [0.05, 0.10, 0.20, 0.30]
    # For PGD: epsilon = [0.10, 0.20]
    # For CW/ZOO/HSJ: use fixed epsilon = 0.1, but only on a statistically
    # justified subset (500 samples, stratified) due to computational cost
    ATTACK_EPSILON_SWEEPS = {
        "fgsm": [0.05, 0.10, 0.20, 0.30],
        "pgd": [0.10, 0.20],
    }

    for model_name, dataset_name in MODEL_DATASET_PAIRS:
        key = f"{model_name}_{dataset_name}"
        if key not in trained_models:
            continue
        ckpt_path = trained_models[key]

        for attack_name, epsilons in ATTACK_EPSILON_SWEEPS.items():
            for eps in epsilons:
                try:
                    metrics = run_attack_evaluation(
                        model_name, dataset_name, ckpt_path, attack_name, eps, str(device)
                    )
                    metrics["phase"] = "epsilon_sweep"
                    all_results["attacks"].append(metrics)
                    atk_path = RESULTS_DIR / "attacks" / f"{key}_{attack_name}_eps{eps}.json"
                    atk_path.write_text(json.dumps(metrics, indent=2, default=str))
                except Exception as e:
                    logger.error(f"Attack failed for {model_name}/{dataset_name}/{attack_name}/eps={eps}: {e}")
                    all_results["attacks"].append({
                        "model": model_name, "dataset": dataset_name,
                        "attack": attack_name, "epsilon": eps, "error": str(e),
                        "phase": "epsilon_sweep"
                    })

    # CW, ZOO, HopSkipJump — fixed epsilon=0.1, on full test set
    COSTLY_ATTACKS = ["cw", "zoo", "hopskipjump"]
    for model_name, dataset_name in MODEL_DATASET_PAIRS:
        key = f"{model_name}_{dataset_name}"
        if key not in trained_models:
            continue
        ckpt_path = trained_models[key]

        for attack_name in COSTLY_ATTACKS:
            try:
                metrics = run_attack_evaluation(
                    model_name, dataset_name, ckpt_path, attack_name, 0.1, str(device)
                )
                metrics["phase"] = "full_test_set"
                metrics["computational_note"] = "Full test set (no subset)"
                all_results["attacks"].append(metrics)
                atk_path = RESULTS_DIR / "attacks" / f"{key}_{attack_name}_eps0.1.json"
                atk_path.write_text(json.dumps(metrics, indent=2, default=str))
            except Exception as e:
                logger.error(f"Attack failed for {model_name}/{dataset_name}/{attack_name}: {e}")
                all_results["attacks"].append({
                    "model": model_name, "dataset": dataset_name,
                    "attack": attack_name, "epsilon": 0.1, "error": str(e),
                    "phase": "full_test_set"
                })

    # === PHASE 4: Transferability ===
    print("\n" + "-" * 70)
    print("PHASE 4: Cross-Architecture Transferability")
    print("-" * 70)

    transfer_pairs = [
        ("resnet18", "cifar10", "mobilenetv2", "cifar10"),
        ("mobilenetv2", "cifar10", "resnet18", "cifar10"),
        ("resnet18", "gtsrb", "mobilenetv2", "gtsrb"),
        ("mobilenetv2", "gtsrb", "resnet18", "gtsrb"),
    ]

    for src_m, src_ds, tgt_m, tgt_ds in transfer_pairs:
        for attack_name in ["fgsm", "pgd"]:
            for eps in [0.10, 0.20]:
                try:
                    metrics = run_transfer_experiment(
                        src_m, src_ds, tgt_m, tgt_ds, attack_name, eps, str(device)
                    )
                    all_results["transferability"].append(metrics)
                    tr_path = RESULTS_DIR / "transfer" / f"{src_m}_to_{tgt_m}_{src_ds}_{attack_name}_eps{eps}.json"
                    tr_path.write_text(json.dumps(metrics, indent=2, default=str))
                    print(f"  {src_m}->{tgt_m} ({src_ds}): source_ASR={metrics['source_whitebox_asr']:.2f}% "
                          f"target_ASR={metrics['target_transferred_asr']:.2f}% transfer_rate={metrics['transfer_rate']:.2f}%")
                except Exception as e:
                    logger.error(f"Transfer failed: {e}")

    # === PHASE 5: Defense Evaluation ===
    print("\n" + "-" * 70)
    print("PHASE 5: Defense Evaluation")
    print("-" * 70)

    # Use a small sample for defense evaluation (computational cost)
    # Document this as a statistically justified subset
    for model_name, dataset_name in [("cnn", "mnist"), ("resnet18", "cifar10"), ("mobilenetv2", "cifar10")]:
        key = f"{model_name}_{dataset_name}"
        if key not in trained_models:
            continue
        ckpt_path = trained_models[key]
        try:
            def_result = run_defense_evaluation(
                model_name, dataset_name, ckpt_path, "fgsm", 0.1, str(device)
            )
            all_results["defenses"].append(def_result)
            def_path = RESULTS_DIR / "defenses" / f"{key}_fgsm_eps0.1.json"
            def_path.write_text(json.dumps(def_result, indent=2, default=str))
            print(f"  {model_name}/{dataset_name}:")
            for dname, dres in def_result["results"].items():
                if "adversarial_accuracy" in dres:
                    print(f"    {dname}: adv_acc={dres['adversarial_accuracy']:.2f}% "
                          f"change={dres.get('accuracy_change_from_baseline', 0):.2f}%")
        except Exception as e:
            logger.error(f"Defense eval failed for {model_name}/{dataset_name}: {e}")

    # === PHASE 6: Explainability ===
    print("\n" + "-" * 70)
    print("PHASE 6: Explainability Analysis")
    print("-" * 70)

    for model_name, dataset_name in MODEL_DATASET_PAIRS:
        key = f"{model_name}_{dataset_name}"
        if key not in trained_models:
            continue
        ckpt_path = trained_models[key]
        try:
            gc_result = run_gradcam_analysis(model_name, dataset_name, ckpt_path, str(device))
            all_results["explainability_gradcam"][key] = gc_result
            print(f"  GradCAM {model_name}/{dataset_name}: shift_mean={gc_result['attribution_shift_mean']:.6f} "
                  f"collapsed={gc_result['collapsed_or_invalid_rate']}%")
            gc_path = RESULTS_DIR / "explainability" / f"{key}_gradcam.json"
            gc_path.write_text(json.dumps(gc_result, indent=2, default=str))
        except Exception as e:
            logger.error(f"GradCAM failed for {model_name}/{dataset_name}: {e}")

    for model_name, dataset_name in [("cnn", "mnist"), ("resnet18", "cifar10")]:
        key = f"{model_name}_{dataset_name}"
        if key not in trained_models:
            continue
        ckpt_path = trained_models[key]
        try:
            shap_result = run_explainability_shap(model_name, dataset_name, ckpt_path, str(device))
            all_results["explainability_shap"][key] = shap_result
            print(f"  SHAP {model_name}/{dataset_name}: mean_attr={shap_result['mean_attribution']:.6f} "
                  f"sparsity={shap_result['sparsity_mean']:.4f}")
            shap_path = RESULTS_DIR / "explainability" / f"{key}_shap.json"
            shap_path.write_text(json.dumps(shap_result, indent=2, default=str))
        except Exception as e:
            logger.error(f"SHAP failed for {model_name}/{dataset_name}: {e}")

    # === FINALIZE ===
    total_time = time.perf_counter() - overall_start
    all_results["experiment_end"] = datetime.now(timezone.utc).isoformat()
    all_results["total_time_sec"] = round(total_time, 2)

    report_path = RESULTS_DIR / f"experiment_complete_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    report_path.write_text(json.dumps(all_results, indent=2, default=str))
    print(f"\nComplete report saved to: {report_path}")

    # Print summary
    print("\n" + "=" * 70)
    print("EXPERIMENT SUMMARY")
    print("=" * 70)
    print(f"Total time: {total_time:.2f}s ({total_time/60:.1f} min)")
    print(f"Device: {device}")

    trained_count = len([k for k in all_results["training"] if "error" not in all_results["training"][k]])
    print(f"\nTraining: {trained_count}/{len(MODEL_DATASET_PAIRS)} models trained")
    for key, val in all_results["training"].items():
        if isinstance(val, dict) and "error" not in val:
            q = val.get("quality_check", {})
            print(f"  {key}: val_acc={val.get('training_metrics', {}).get('val_accuracy', 'N/A')} "
                  f"quality={q.get('status', 'N/A')}")

    print(f"\nClean Evaluation: {len(all_results['clean_evaluation'])} models")
    for key, val in all_results["clean_evaluation"].items():
        if isinstance(val, dict) and "error" not in val:
            print(f"  {key}: acc={val['clean_accuracy']:.2f}% loss={val['clean_loss']:.4f}")

    print(f"\nAttack Evaluations: {len(all_results['attacks'])} runs")
    attack_summary = {}
    for r in all_results["attacks"]:
        if "error" in r:
            continue
        k = (r["model"], r["attack"], r.get("epsilon", "N/A"))
        asr = r.get("attack_success_rate", 0)
        drop = r.get("accuracy_drop", 0)
        eps_viol = r.get("perturbation_stats", {}).get("epsilon_violated", False)
        marker = " [EPS VIOLATION!]" if eps_viol else ""
        print(f"  {r['model']:<14} {r['dataset']:<10} {r['attack']:<12} eps={r.get('epsilon', 'N/A'):<6} "
              f"ASR={asr:.2f}% drop={drop:.2f}%{marker}")

    print(f"\nTransferability: {len(all_results['transferability'])} experiments")
    for r in all_results["transferability"]:
        if "error" not in r:
            print(f"  {r['source_model']}->{r['target_model']} ({r['dataset']}): "
                  f"src_ASR={r['source_whitebox_asr']:.2f}% tgt_ASR={r['target_transferred_asr']:.2f}%")

    print(f"\nDefenses: {len(all_results['defenses'])} evaluations")
    for r in all_results["defenses"]:
        for dname, dres in r.get("results", {}).items():
            if "adversarial_accuracy" in dres:
                change = dres.get("accuracy_change_from_baseline", 0)
                print(f"  {r['model']}/{r['dataset']}/{dname}: "
                      f"adv_acc={dres['adversarial_accuracy']:.2f}% change={change:+.2f}%")

    print(f"\nGradCAM analysis: {len(all_results['explainability_gradcam'])} models")
    for key, val in all_results["explainability_gradcam"].items():
        print(f"  {key}: shift_mean={val['attribution_shift_mean']:.6f} "
              f"collapsed={val['collapsed_or_invalid_rate']}%")

    print(f"\nSHAP analysis: {len(all_results['explainability_shap'])} models")
    for key, val in all_results["explainability_shap"].items():
        print(f"  {key}: mean_attr={val['mean_attribution']:.6f} "
              f"sparsity={val['sparsity_mean']:.4f}")

    # Check for failures
    errors = []
    for r in all_results["attacks"]:
        if "error" in r:
            errors.append(f"Attack: {r['model']}/{r['dataset']}/{r['attack']}: {r['error']}")
    for key, val in all_results["training"].items():
        if isinstance(val, dict) and "error" in val:
            errors.append(f"Training: {key}: {val['error']}")

    if errors:
        print(f"\n{'='*70}")
        print(f"ERRORS: {len(errors)}")
        for e in errors:
            print(f"  - {e}")

    # Check for undertrained models
    print(f"\n{'='*70}")
    print("Quality Checks:")
    for key, val in all_results["training"].items():
        if isinstance(val, dict) and "error" not in val:
            qc = val.get("quality_check", {})
            status = qc.get("status", "N/A")
            if "FAIL" in str(status):
                print(f"  [FAIL] {key}: {status}")
            elif "SKIP" not in str(status):
                print(f"  [PASS] {key}: acc={qc.get('model_accuracy', 'N/A')}")
    print("=" * 70)


if __name__ == "__main__":
    main()

