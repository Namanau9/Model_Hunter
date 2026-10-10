"""Train all compatible model/dataset checkpoints.

Usage: python scripts/train_all.py --epochs 20 --limit 400

Default epochs are tuned per model/dataset pair so a single run produces
realistic accuracy (MobileNetV2 on CIFAR-10 needs ~30 epochs to exceed 90%).
Override with --epochs to force a single value for all pairs.
"""
from __future__ import annotations

import argparse

from app.datasets.registry import DatasetRegistry
from app.models.registry import ModelRegistry
from app.services.model_service import train_model
from app.utils.logging import configure_logging, get_logger

logger = get_logger("train_all")

DEFAULT_EPOCHS = {
    # model: { dataset: epochs }
    "cnn": {"mnist": 20},
    "resnet18": {"cifar10": 30, "gtsrb": 30},
    "mobilenetv2": {"cifar10": 30, "gtsrb": 30},
}


def _epochs_for(model: str, dataset: str, override: int | None) -> int:
    if override is not None and override > 0:
        return override
    return DEFAULT_EPOCHS.get(model, {}).get(dataset, 20)


def main(epochs: int | None, limit: int | None, batch_size: int) -> None:
    for dataset in DatasetRegistry.names():
        for model in ModelRegistry.compatible_models(dataset):
            n = _epochs_for(model, dataset, epochs)
            logger.info("Training %s on %s (%d epochs, limit=%s)...", model, dataset, n, limit)
            try:
                result = train_model(
                    model, dataset, epochs=n, batch_size=batch_size, limit=limit,
                    learning_rate=1e-3 if model == "cnn" else 5e-4,
                )
                logger.info("Done: %s", result)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Failed %s/%s: %s", model, dataset, exc)


if __name__ == "__main__":
    configure_logging()
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=None, help="Override epochs for all model/dataset pairs")
    ap.add_argument("--limit", type=int, default=None, help="Limit training samples (0 = all)")
    ap.add_argument("--batch-size", type=int, default=64)
    args = ap.parse_args()
    main(args.epochs, args.limit, args.batch_size)
    logger.info("Training complete.")
