"""Report and dashboard API routes."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.api.deps import ok
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
def reports():
    return ok({"reports": report_service.list_reports()})


@router.get("/{evaluation_id}/download/{fmt}")
def download(evaluation_id: int, fmt: str):
    if fmt not in ("html", "csv", "pdf"):
        return ok({"error": f"Unsupported format '{fmt}'"})
    paths = report_service.get_report_paths(evaluation_id)
    path = paths.get(fmt)
    if not path or not Path(path).exists():
        return ok({"error": f"No {fmt} report for evaluation {evaluation_id}"})
    return FileResponse(path, filename=Path(path).name)
