"""Evaluation metrics computed from real predictions."""
from __future__ import annotations

import time
from dataclasses import dataclass, field

import numpy as np
import torch


@dataclass
class MetricsResult:
    """All computed evaluation metrics for a run."""

    clean_accuracy: float = 0.0
    adversarial_accuracy: float = 0.0
    accuracy_drop: float = 0.0
    attack_success_rate: float = 0.0
    confidence_shift: float = 0.0
    transferability_index: float = 0.0
    execution_time: float = 0.0
    robustness_score: float = 0.0
    robustness_class: str = ""
    parameters: dict = field(default_factory=dict)
    n_samples: int = 0

    def as_dict(self) -> dict:
        d = self.__dict__.copy()
        d["parameters"] = dict(self.parameters)
        return d


def evaluate_accuracy(
    model: torch.nn.Module, loader, device: str = "cpu", limit: int | None = None
) -> tuple[float, int]:
    """Compute top-1 accuracy over a loader (real predictions)."""
    model.to(device).eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            pred = model(x).argmax(dim=1)
            correct += (pred == y).sum().item()
            total += y.size(0)
            if limit is not None and total >= limit:
                break
    accuracy = (correct / total) * 100.0 if total else 0.0
    return accuracy, total


def _collect(model, loader, device, limit):
    """Collect logits, labels, preds for a limited number of samples."""
    model.to(device).eval()
    xs, ys, preds, logits_list = [], [], [], []
    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            xs.append(x.cpu())
            ys.append(y.cpu())
            preds.append(logits.argmax(dim=1).cpu())
            logits_list.append(torch.softmax(logits, dim=1).cpu())
            total = sum(t.size(0) for t in ys)
            if limit is not None and total >= limit:
                break
    if not xs:
        return None
    x = torch.cat(xs)
    y = torch.cat(ys)
    pred = torch.cat(preds)
    probs = torch.cat(logits_list)
    if limit is not None:
        x, y, pred, probs = x[:limit], y[:limit], pred[:limit], probs[:limit]
    return x, y, pred, probs


def compute_metrics(
    model: torch.nn.Module,
    attack,
    loader,
    device: str = "cpu",
    limit: int | None = None,
    epsilon: float = 0.1,
    source_model=None,
) -> MetricsResult:
    """Run a full evaluation of ``model`` against ``attack`` on ``loader``."""
    start = time.perf_counter()
    result = MetricsResult()
    collected = _collect(model, loader, device, limit)
    if collected is None:
        result.execution_time = time.perf_counter() - start
        return result

    x, y, clean_pred, clean_probs = collected
    n = x.size(0)

    # Clean accuracy.
    clean_correct = (clean_pred == y).sum().item()
    clean_accuracy = (clean_correct / n) * 100.0
    result.clean_accuracy = clean_accuracy

    # Generate adversarial examples.
    adv = attack.generate(x.to(device), y.to(device))
    with torch.no_grad():
        adv_logits = model(adv)
    adv_pred = adv_logits.argmax(dim=1).cpu()
    adv_probs = torch.softmax(adv_logits, dim=1).cpu()

    adv_correct = (adv_pred == y).sum().item()
    adversarial_accuracy = (adv_correct / n) * 100.0
    result.adversarial_accuracy = adversarial_accuracy
    result.accuracy_drop = clean_accuracy - adversarial_accuracy

    # Attack success rate = fraction of clean-correct samples flipped.
    clean_correct_mask = clean_pred == y
    flipped = (adv_pred != clean_pred) & clean_correct_mask
    asr = (flipped.sum().item() / max(clean_correct_mask.sum().item(), 1)) * 100.0
    result.attack_success_rate = asr

    # Confidence shift: change in model confidence for true label.
    true_conf_clean = clean_probs.gather(1, y.view(-1, 1)).squeeze(1).mean().item()
    true_conf_adv = adv_probs.gather(1, y.view(-1, 1)).squeeze(1).mean().item()
    result.confidence_shift = (true_conf_clean - true_conf_adv) * 100.0

    # Transferability index: how often adv examples fool a different (source) model.
    if source_model is not None:
        source_model.to(device).eval()
        with torch.no_grad():
            src_pred = source_model(adv).argmax(dim=1).cpu()
        # Transfer when source clean-correct, adversarial from origin model flipped it.
        transfer = (src_pred != y) & clean_correct_mask & flipped
        result.transferability_index = (
            transfer.sum().item() / max(clean_correct_mask.sum().item(), 1)
        ) * 100.0

    result.execution_time = time.perf_counter() - start
    result.n_samples = n
    result.parameters = {
        "attack": attack.name,
        "epsilon": epsilon,
        "n_samples": n,
    }
    return result


def robustness_score(result: MetricsResult) -> tuple[float, str]:
    """Compute the robustness score per the SRS formula."""
    adversarial_acc = result.adversarial_accuracy
    asr = result.attack_success_rate
    retained_conf = result.confidence_shift
    # Retained confidence: 100 - drop.
    retained = max(100.0 - retained_conf, 0.0)
    score = (
        0.4 * adversarial_acc
        + 0.3 * (100.0 - asr)
        + 0.3 * retained
    )
    score = float(np.clip(score, 0.0, 100.0))
    if score <= 30:
        klass = "Weak"
    elif score <= 60:
        klass = "Moderate"
    else:
        klass = "Strong"
    return round(score, 2), klass
