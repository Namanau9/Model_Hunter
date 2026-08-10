# Project Audit

Audit performed during the completion pass. The repository contained only the
two specification files at start; everything else has been built to satisfy
them.

## Repository State (initial)
- `PROJECT_STRUCTURE.md` — architecture / structure spec
- `SYSTEM_REQUIRMENTS.md` — system requirements spec
- No existing code, frontend, backend, tests, or Docker.

## What Was Built
- **Frontend** (new): React + MUI + Recharts, Vite, 9 pages, all connected to
  real `/api` endpoints. Builds successfully (`npm run build`).
- **Backend** (new): FastAPI, pydantic-settings, SQLAlchemy (SQLite),
  uvicorn. Starts and all routes respond.
- **ML Engines**: models (cnn/resnet18/mobilenetv2), datasets
  (mnist/cifar10/gtsrb), attacks (fgsm/pgd/cw/zoo/hopskipjump), defenses
  (adversarial_training/ensemble/input_preprocessing).
- **Explainability**: GradCAM (Captum) and SHAP.
- **Evaluation**: 8 metrics + SRS robustness score, comparison/benchmark.
- **Reports**: CSV, HTML, PDF.
- **Persistence**: SQLite evaluation history.
- **Tests**: `tests/backend/` (12 passing).
- **Docker**: backend, frontend (nginx), compose.
- **Docs**: README + docs/ suite + CHANGELOG.

## Security Audit (performed + satisfied)
- Uploaded model files: validated for name (path-traversal blocks
  `../`, absolute paths), extension whitelist, and size limit.
- Unsafe deserialization: `torch.load(..., weights_only=True)`.
- API input validation: Pydantic models on all request bodies.
- CORS: restricted to configured origins.
- Secrets: `SECRET_KEY` read from env (`get_settings`), `.env` git-ignored,
  `.env.example` committed.
- Exception leakage: global handler returns generic messages; details logged
  server-side. No stack traces reach clients.

## Engineering Rules
- Layered architecture maintained; service layer holds business logic.
- Modular registries for models/datasets/attacks/defenses; adding a component
  touches only its folder + registry.
- Type hints, Pydantic, SQLAlchemy, structured logging, SOLID/DRY throughout.
- Paths from `get_settings()`; no hardcoded paths.
- No fabricated ML results — all metrics from real execution.