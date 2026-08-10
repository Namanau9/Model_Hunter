"""Structured logging configuration for the application."""
from __future__ import annotations

import logging
import sys
from typing import Any


def _build_formatter() -> logging.Formatter:
    return logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def configure_logging(level: int = logging.INFO) -> None:
    """Configure the root logger with a consistent structured format."""
    root = logging.getLogger()
    if root.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_build_formatter())
    root.addHandler(handler)
    root.setLevel(level)


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced logger with the standard format."""
    return logging.getLogger(name)


def log_exception(logger: logging.Logger, err: Exception, context: str = "") -> None:
    """Log an exception with an optional context label."""
    prefix = f"[{context}] " if context else ""
    logger.exception("%s%s", prefix, type(err).__name__)
