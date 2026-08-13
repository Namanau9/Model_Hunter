# Changelog

## 1.1.0 — GPU support

### Added
- Device resolution layer (`app/utils/device.py`): `DEVICE=auto` picks
  CUDA > MPS > CPU with a graceful CPU fallback; supports `cpu`, `cuda`,
  `cuda:<idx>`, `mps` preferences
- Cached `get_device()` + telemetry `get_device_info()` (name, VRAM, CUDA,
  cuDNN, torch version)
- ML pipelines now run on the resolved accelerator: model training, evaluation,
  attack/defense engines, and explainability (with automatic CPU retry on
  accelerators Captum/SHAP can't drive, e.g. MPS)
- `pin_memory` on CUDA DataLoaders + configurable `NUM_WORKERS` (default 0)
- CUDA seeding (`torch.cuda.manual_seed_all`) for reproducible runs
- `gpu_execution()` lock serializes heavy accelerator jobs to prevent OOM
- `/api/info` returns a `device` block; new "Compute Accelerator" panel on the
  Settings page
- GPU deployment: `docker/docker-compose.gpu.yml` (NVIDIA reservation) and an
  opt-in `TORCH_INDEX_URL` build arg for CUDA wheels in `Dockerfile.backend`
- Device resolution tests (`tests/backend/test_device.py`, 12 new tests)

### Changed
- `.env.example`: `DEVICE=auto`, `NUM_WORKERS=0`
- `docker-compose.yml` backend device default `cpu` → `auto`

## 1.0.0 — Initial production release

### Added
- Backend (FastAPI + SQLAlchemy + PyTorch) with layered service architecture
- Models: CNN, ResNet18, MobileNetV2 with registry + checkpoint persistence + upload
- Datasets: MNIST, CIFAR-10, GTSRB with auto-download and registry
- Attacks: FGSM, PGD, Carlini-Wagner, ZOO, HopSkipJump (native PyTorch)
- Defenses: Adversarial Training, Ensemble, Input Preprocessing
- Explainability: GradCAM (Captum), SHAP
- Metrics: clean/adv accuracy, accuracy drop, ASR, confidence shift,
  transferability, execution time, robustness score
- Reports: CSV, HTML, PDF
- Frontend (React + MUI + Recharts) with 9 pages, all connected to real APIs
- Docker (backend, frontend, compose) and nginx proxy
- Documentation: README, system design, API, model/dataset/attack/defense
  guides, testing plan, deployment
- Backend test suite (12 tests passing)

### Security
- Upload validation (name/extension/size, path-traversal protection)
- `weights_only=True` checkpoint deserialization
- Global exception handler (no stack-trace leakage)
- Restricted CORS

## 0.1.0 — Project scaffold
- Specification and project structure documents