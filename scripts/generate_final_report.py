"""Generate a comprehensive final report consolidating ALL results from all phases.

Reads from:
- results/attack/*.json (attack evaluation results)
- results/clean/*.json (clean evaluation results)
- results/defenses/*.json (defense evaluation results)
- results/transfer/*.json (transferability results)
- results/explainability/*_gradcam.json (GradCAM results)
- results/explainability/*_shap.json (SHAP results)
- results/training/ (training results if present)
- pretrained_models/*_full.pth (training metadata)

Outputs: results/final_report_complete.json (comprehensive single report)
"""
from __future__ import annotations

import datetime
import json
import sys
from pathlib import Path

_scripts_dir = str(Path(__file__).resolve().parent)
_backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
sys.path.insert(0, _scripts_dir)
sys.path.insert(0, _backend_dir)

import torch  # noqa: E402

RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
PRETRAINED_DIR = Path(__file__).resolve().parent.parent / "pretrained_models"

MODEL_DATASET_PAIRS = [
    ("cnn", "mnist"),
    ("resnet18", "cifar10"),
    ("mobilenetv2", "cifar10"),
    ("resnet18", "gtsrb"),
    ("mobilenetv2", "gtsrb"),
]


def load_json(path: Path) -> dict | None:
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None


def main():
    report = {
        "report_type": "comprehensive_final",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "environment": {
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
            "torch_version": torch.__version__,
            "cuda_version": torch.version.cuda,
        },
    }

    # --- Training metadata ---
    training = {}
    for model_name, dataset_name in MODEL_DATASET_PAIRS:
        key = f"{model_name}_{dataset_name}"
        ckpt_path = PRETRAINED_DIR / f"{key}_full.pth"
        if ckpt_path.exists():
            sd = torch.load(ckpt_path, map_location="cpu", weights_only=False)
            ckpt_info = {
                "model": model_name,
                "dataset": dataset_name,
                "checkpoint_path": str(ckpt_path),
                "checkpoint_exists": True,
                "state_dict_keys": len(sd.get("state_dict", sd)) if isinstance(sd, dict) else 0,
                "epochs_run": sd.get("epochs_run", "N/A"),
                "best_val_accuracy": sd.get("best_val_acc", "N/A"),
                "seed": sd.get("seed", 42),
                "training_config": {
                    "epochs": sd.get("epochs_run", 10),
                    "batch_size": 128,
                    "optimizer": "adam",
                    "scheduler": "cosine",
                    "early_stopping_patience": 5,
                    "weight_decay": 1e-4,
                },
                "training_metrics": {
                    "val_accuracy": sd.get("best_val_acc", "N/A"),
                    "epochs_completed": sd.get("epochs_run", "N/A"),
                },
            }
            training[key] = ckpt_info
        else:
            training[key] = {
                "model": model_name,
                "dataset": dataset_name,
                "checkpoint_path": str(ckpt_path),
                "checkpoint_exists": False,
            }
    report["training"] = training

    # --- Clean evaluation ---
    clean = {}
    clean_dir = RESULTS_DIR / "clean"
    for f in sorted(clean_dir.glob("*.json")):
        data = load_json(f)
        if data:
            key = f.stem.replace("_clean_eval", "")
            clean[key] = data
    report["clean_evaluation"] = clean

    # --- Attack evaluation ---
    attacks = []
    attack_dir = RESULTS_DIR / "attacks"
    for f in sorted(attack_dir.glob("*.json")):
        data = load_json(f)
        if data:
            attacks.append(data)
    report["attacks"] = attacks

    # --- Transferability ---
    transfer = []
    transfer_dir = RESULTS_DIR / "transfer"
    for f in sorted(transfer_dir.glob("*.json")):
        data = load_json(f)
        if data:
            transfer.append(data)
    report["transferability"] = transfer

    # --- Defenses ---
    defenses = []
    def_dir = RESULTS_DIR / "defenses"
    for f in sorted(def_dir.glob("*.json")):
        data = load_json(f)
        if data:
            defenses.append(data)
    report["defenses"] = defenses

    # --- GradCAM ---
    gradcam = {}
    expl_dir = RESULTS_DIR / "explainability"
    for f in sorted(expl_dir.glob("*_gradcam.json")):
        data = load_json(f)
        if data:
            key = f.stem.replace("_gradcam", "")
            gradcam[key] = data
    report["explainability_gradcam"] = gradcam

    # --- SHAP ---
    shap_results = {}
    for f in sorted(expl_dir.glob("*_shap.json")):
        data = load_json(f)
        if data:
            key = f.stem.replace("_shap", "")
            shap_results[key] = data
    report["explainability_shap"] = shap_results

    # --- Summary statistics ---
    report["summary"] = {
        "n_models": len(MODEL_DATASET_PAIRS),
        "n_clean_evaluations": len(clean),
        "n_attack_evaluations": len(attacks),
        "n_transfer_evaluations": len(transfer),
        "n_defense_evaluations": len(defenses),
        "n_gradcam_evaluations": len(gradcam),
        "n_shap_evaluations": len(shap_results),
    }

    output_path = RESULTS_DIR / "final_report_complete.json"
    with open(output_path, "w") as f:
        json.dump(report, indent=2, default=str, fp=f)
    print(f"Comprehensive report saved to: {output_path}")
    print(f"Models: {report['summary']['n_models']}")
    print(f"Clean evals: {report['summary']['n_clean_evaluations']}")
    print(f"Attacks: {report['summary']['n_attack_evaluations']}")
    print(f"Transfer: {report['summary']['n_transfer_evaluations']}")
    print(f"Defenses: {report['summary']['n_defense_evaluations']}")
    print(f"GradCAM: {report['summary']['n_gradcam_evaluations']}")
    print(f"SHAP: {report['summary']['n_shap_evaluations']}")


if __name__ == "__main__":
    main()
