"""Download all supported datasets (MNIST, CIFAR-10, GTSRB).

Usage: python scripts/prepare_data.py [--train]
"""
from __future__ import annotations

import argparse

from app.datasets.registry import DatasetRegistry
from app.utils.logging import configure_logging, get_logger

logger = get_logger("prepare_data")


def main(train: bool = False) -> None:
    for name in DatasetRegistry.names():
        loader = DatasetRegistry.get(name)
        logger.info("Loading %s (train=%s)...", name, train)
        ds = loader.load(train=train)
        logger.info("%s samples=%d", name, len(ds))


if __name__ == "__main__":
    configure_logging()
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", action="store_true", help="Download train splits too")
    args = ap.parse_args()
    main(train=args.train)
    logger.info("Data preparation complete.")
