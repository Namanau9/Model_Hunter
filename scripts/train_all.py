"""Train all compatible model/dataset checkpoints.

Usage: python scripts/train_all.py --epochs 2 --limit 400
"""
from __future__ import annotations

import argparse

from app.datasets.registry import DatasetRegistry
from app.models.registry import ModelRegistry
from app.services.model_service import train_model
from app.utils.logging import configure_logging, get_logger

logger = get_logger("train_all")


def main(epochs: int, limit: int | None, batch_size: int) -> None:
    for dataset in DatasetRegistry.names():
        for model in ModelRegistry.compatible_models(dataset):
            logger.info("Training %s on %s ...", model, dataset)
            try:
                result = train_model(
                    model, dataset, epochs=epochs, batch_size=batch_size, limit=limit
                )
                logger.info("Done: %s", result)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Failed %s/%s: %s", model, dataset, exc)


if __name__ == "__main__":
    configure_logging()
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=1)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--batch-size", type=int, default=32)
    args = ap.parse_args()
    main(args.epochs, args.limit, args.batch_size)
    logger.info("Training complete.")
