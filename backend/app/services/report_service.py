"""Report and history service."""
from __future__ import annotations

from app.config.settings import get_settings
from app.database.database import SessionLocal
from app.database.models import EvaluationRecord
from app.utils.logging import get_logger

logger = get_logger(__name__)


def list_history(limit: int = 50) -> list[dict]:
    db = SessionLocal()
    try:
        records = (
            db.query(EvaluationRecord)
            .order_by(EvaluationRecord.created_at.desc())
            .limit(limit)
            .all()
        )
        out = []
        for r in records:
            out.append(
                {
                    "id": r.id,
                    "model": r.model_name,
                    "dataset": r.dataset_name,
                    "attack": r.attack_name,
                    "defense": r.defense_name,
                    "clean_accuracy": r.clean_accuracy,
                    "adversarial_accuracy": r.adversarial_accuracy,
                    "attack_success_rate": r.attack_success_rate,
                    "robustness_score": r.robustness_score,
                    "robustness_class": r.robustness_class,
                    "execution_time": r.execution_time,
                    "created_at": r.created_at.isoformat() if r.created_at else "",
                    "report_path": r.report_path,
                }
            )
        return out
    finally:
        db.close()


def get_report_paths(evaluation_id: int) -> dict:
    settings = get_settings()
    db = SessionLocal()
    try:
        r = db.get(EvaluationRecord, evaluation_id)
        if r is None:
            raise ValueError(f"No evaluation with id {evaluation_id}")
        from pathlib import Path

        html = Path(r.report_path)
        base = html.stem
        files = {
            "html": str(settings.reports_dir / f"{base}.html"),
            "csv": str(settings.reports_dir / f"{base}.csv"),
            "pdf": str(settings.reports_dir / f"{base}.pdf"),
        }
        return {k: v for k, v in files.items() if Path(v).exists()}
    finally:
        db.close()


def list_reports() -> list[dict]:
    settings = get_settings()
    # Map report stem -> evaluation id so the frontend can build download links.
    from pathlib import Path

    id_by_stem: dict[str, int] = {}
    db = SessionLocal()
    try:
        for r in db.query(EvaluationRecord).all():
            if r.report_path:
                id_by_stem[Path(r.report_path).stem] = r.id
    finally:
        db.close()

    out = []
    for f in sorted(settings.reports_dir.glob("*.html")):
        out.append(
            {
                "name": f.stem,
                "evaluation_id": id_by_stem.get(f.stem),
                "html": str(f),
                "csv": str(f.with_suffix(".csv")),
                "pdf": str(f.with_suffix(".pdf")),
                "size_bytes": f.stat().st_size,
            }
        )
    return out