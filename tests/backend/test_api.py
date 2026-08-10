"""Backend API integration tests using FastAPI TestClient."""
from __future__ import annotations

import os
import tempfile

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_modelhunter.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["success"] is True


def test_info():
    r = client.get("/api/info")
    assert r.status_code == 200
    data = r.json()["data"]
    assert "cnn" in data["models"]
    assert "fgsm" in data["attacks"]
    assert "mnist" in data["datasets"]


def test_models_list():
    r = client.get("/api/models")
    assert r.status_code == 200
    names = [m["name"] for m in r.json()["data"]["models"]]
    assert names == ["cnn", "resnet18", "mobilenetv2"]


def test_datasets_list():
    r = client.get("/api/datasets")
    assert r.status_code == 200
    names = [d["name"] for d in r.json()["data"]["datasets"]]
    assert names == ["mnist", "cifar10", "gtsrb"]


def test_attacks_list():
    r = client.get("/api/attacks")
    assert r.status_code == 200
    names = [a["name"] for a in r.json()["data"]["attacks"]]
    assert names == ["fgsm", "pgd", "cw", "zoo", "hopskipjump"]


def test_defenses_list():
    r = client.get("/api/defenses")
    assert r.status_code == 200
    assert len(r.json()["data"]["defenses"]) == 3


def test_upload_validation():
    r = client.post(
        "/api/models/upload",
        files={"file": ("../../evil.exe", b"MZ", "application/octet-stream")},
    )
    assert r.status_code == 400  # rejected: unsafe name + bad extension


def test_run_invalid_combo():
    body = {
        "model_name": "cnn",
        "dataset_name": "cifar10",  # incompatible
        "attack_name": "fgsm",
        "sample_limit": 8,
    }
    r = client.post("/api/evaluation/run", json=body)
    assert r.status_code == 400
    assert "incompatible" in r.json().get("detail", "") or "incompatible" in r.json().get("message", "")


def test_explainability_gradcam():
    body = {"model_name": "cnn", "dataset_name": "mnist", "technique": "gradcam", "sample_index": 0}
    r = client.post("/api/explainability", json=body)
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["technique"] == "gradcam"
    assert data["shape"] == [28, 28]
    assert len(data["image_base64"]) > 0


def test_explainability_shap_resnet():
    # Regression: SHAP previously crashed on ResNet18 (in-place ReLU + wrong
    # SHAP API unpacking). Must now succeed on a ResNet-family model too.
    body = {"model_name": "resnet18", "dataset_name": "cifar10", "technique": "shap", "sample_index": 0}
    r = client.post("/api/explainability", json=body)
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["technique"] == "shap"
    assert data["shape"] == [32, 32]
    assert len(data["image_base64"]) > 0
