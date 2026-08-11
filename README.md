# ModelHunter

**Autonomous Adversarial Machine Learning Security Evaluation Platform**

ModelHunter evaluates the robustness of deep learning models against
adversarial attacks through a clean web dashboard. It lets you load models, run a
suite of white-box and black-box attacks, apply defenses, compute security
metrics, and generate professional reports — all from real execution, never
fabricated data.

<p align="center">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20MUI-61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/ML-PyTorch-EE4C2C" alt="PyTorch" />
  <img src="https://img.shields.io/badge/Tests-27%20passing-brightgreen" alt="Tests" />
</p>

---

## Table of Contents
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Docker](#docker)
- [Architecture](#architecture)
- [Metrics](#metrics)
- [Security](#security)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## Key Features

- **Models** — CNN, ResNet18, MobileNetV2 (train, load, and upload checkpoints)
- **Datasets** — MNIST, CIFAR-10, GTSRB (auto-downloaded on first use)
- **Attacks** — FGSM, PGD, Carlini-Wagner, ZOO, HopSkipJump
- **Defenses** — Adversarial Training, Ensemble (majority vote), Input
  Preprocessing (Gaussian blur / JPEG / feature squeezing)
- **Explainability** — GradCAM and SHAP visualizations
- **Metrics** — clean/adv accuracy, accuracy drop, attack success rate,
  confidence shift, transferability index, execution time, robustness score
- **Reports** — PDF, HTML, CSV (downloadable from the Reports page)
- **Persistence** — SQLite + SQLAlchemy evaluation history
- **GPU support** — NVIDIA CUDA, Apple Silicon MPS, or CPU with automatic
  detection (`DEVICE=auto`) and graceful fallback; GPU telemetry on the Settings page

> ⚙️ **All metrics come from real execution.** No results are hardcoded or
> simulated — every dashboard value is computed by running the actual model,
> dataset, attack, and defense.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, Material-UI, Recharts |
| **API** | FastAPI (Python), Pydantic |
| **Machine Learning** | PyTorch, Captum, SHAP |
| **Database** | SQLite, SQLAlchemy ORM |
| **Reports** | Matplotlib, ReportLab |
| **Compute** | PyTorch on NVIDIA CUDA / Apple MPS / CPU (auto-detect) |
| **Infra** | Docker, Docker Compose, Nginx |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000` (Swagger docs at `/docs`,
`/redoc`).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — the dev server proxies `/api` to the backend.

### 3. Run the tests

```bash
cd backend
python -m pytest ../tests/backend -q
```

### 4. (Optional) Prepare data & train checkpoints

```bash
python scripts/prepare_data.py --train                  # download datasets
python scripts/train_all.py --epochs 2 --limit 400      # train all models
```

---

## Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

### Docker with GPU

```bash
# Requires the NVIDIA Container Toolkit on the host, then:
docker compose -f docker/docker-compose.yml -f docker/docker-compose.gpu.yml up --build
```

See [docs/DEPLOYMENT.md#gpu-support](docs/DEPLOYMENT.md#gpu-support) for the CUDA
wheel build and toolkit setup.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

Persistent data (datasets, checkpoints, reports) is mounted from the host.

---

## Architecture

```
React Frontend
      ↓
FastAPI API
      ↓
Service Layer
      ↓
ML Engines (models · datasets · attacks · defenses)
      ↓
Evaluation  →  Database / Reports
```

- **Separation of concerns** — business logic lives in the service layer and
  modular registries, never inside API routes.
- **Extensibility** — adding a new model, dataset, attack, or defense requires
  touching only its module folder and its registry.

---

## Metrics

| Metric | Description |
|---|---|
| **Clean Accuracy** | Accuracy on unperturbed test samples |
| **Adversarial Accuracy** | Accuracy on adversarially perturbed samples |
| **Accuracy Drop** | Clean accuracy − adversarial accuracy |
| **Attack Success Rate** | Fraction of samples where the attack fools the model |
| **Confidence Shift** | Change in model confidence under attack |
| **Transferability Index** | Attack effectiveness when transferred from a source model |
| **Execution Time** | Wall-clock time for the evaluation run |
| **Robustness Score** | Overall 0–100 robustness score (see below) |

### Robustness Score

```
0.4 × Adversarial Accuracy + 0.3 × (100 − Attack Success Rate) + 0.3 × Retained Confidence
```

| Score | Classification |
|---|---|
| 0–30 | Weak |
| 31–60 | Moderate |
| 61–100 | Strong |

---

## Security

- **Upload validation** — checkpoint uploads are checked for name, extension,
  and size with path-traversal protection.
- **Safe deserialization** — models are loaded with `weights_only=True` to
  block unsafe pickle payloads.
- **No exception leakage** — a global error handler logs details server-side
  and returns generic messages to clients.
- **Restricted CORS** — allowed origins are configured via environment.

---

## Project Structure

```
backend/
  app/
    api/           # FastAPI routes (thin, no business logic)
    services/      # Business logic layer
    models/        # CNN, ResNet18, MobileNetV2 + registry
    datasets/      # MNIST, CIFAR-10, GTSRB + registry
    attacks/       # FGSM, PGD, CW, ZOO, HopSkipJump + registry
    defenses/      # Adv-training, Ensemble, Preprocessing + registry
    evaluation/    # Metrics, robustness, comparison
    explainability/# GradCAM, SHAP
    reports/       # CSV, HTML, PDF generators
    database/      # SQLAlchemy models & session
frontend/
  src/
    pages/         # Dashboard, Models, Datasets, Attacks, Defenses,
                   # Evaluation, Explainability, Reports, Settings
    components/    # Reusable UI components
tests/
  backend/         # API + unit tests
docker/            # Dockerfiles, nginx config, compose
scripts/           # Data prep & training helpers
docs/              # Detailed documentation
```

---

## Documentation

- [System Design](docs/SYSTEM_DESIGN.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Model Guide](docs/MODEL_GUIDE.md)
- [Dataset Guide](docs/DATASET_GUIDE.md)
- [Attack Engine](docs/ATTACK_ENGINE.md)
- [Defense Engine](docs/DEFENSE_ENGINE.md)
- [Testing Plan](docs/TESTING_PLAN.md)
- [Deployment](docs/DEPLOYMENT.md)

See [CHANGELOG.md](CHANGELOG.md) for version history and
[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for feature status.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Make your changes and add tests.
3. Run the backend test suite (`pytest ../tests/backend -q`) and ensure the
   frontend builds (`npm run build`).
4. Open a pull request.

---

## License

This project is provided for security research and educational use.
