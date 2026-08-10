"""SQLAlchemy database engine and session management."""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config.settings import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def build_engine(url: str | None = None):
    settings = get_settings()
    database_url = url or settings.database_url
    # SQLite needs check_same_thread disabled for FastAPI's threadpool.
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, connect_args=connect_args)


engine = build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Import models and create all tables."""
    from app.database import models  # noqa: F401  (register models)

    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
