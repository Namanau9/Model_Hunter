"""Model management API routes."""
from __future__ import annotations

from fastapi import APIRouter, File, UploadFile, HTTPException

from app.api.deps import ok
from app.database.schema import TrainRequest
from app.services import model_service
from app.utils.security import UploadValidationError

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
def list_models():
    return ok({"models": model_service.list_models(), "uploads": model_service.list_uploads()})


@router.post("/train")
def train(req: TrainRequest):
    try:
        result = model_service.train_model(
            req.model_name,
            req.dataset_name,
            epochs=req.epochs,
            batch_size=req.batch_size,
            learning_rate=req.learning_rate,
            limit=req.limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ok(result, message="Model trained")


@router.post("/upload")
async def upload_model(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        result = model_service.save_upload(contents, file.filename or "model.pth")
    except UploadValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ok(result, message="Model uploaded")
