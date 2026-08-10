# ModelHunter

Autonomous Adversarial Machine Learning Security Evaluation Platform.

ModelHunter evaluates the robustness of deep learning models against
adversarial attacks. It provides a web dashboard to load models, run attacks,
apply defenses, compute security metrics, and generate professional reports.

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173

# Full test suite
cd backend && python -m pytest ../tests/backend -q
```

## Docker

```bash
docker compose -f docker/docker-compose.yml up --build
# Frontend: http://localhost:5173  Backend API: http://localhost:8000
```

## Features

- **Models**: CNN, ResNet18, MobileNetV2 (train, load, upload checkpoints)
- **Datasets**: MNIST, CIFAR-10, GTSRB (auto-download)
- **Attacks**: FGSM, PGD, Carlini-Wagner, ZOO, HopSkipJump
- **Defenses**: Adversarial Training, Ensemble (majority vote), Input
  Preprocessing (Gaussian blur / JPEG / feature squeezing)
- **Explainability**: GradCAM, SHAP
- **Metrics**: clean/adv accuracy, accuracy drop, ASR, confidence shift,
  transferability, execution time, robustness score
- **Reports**: PDF, HTML, CSV
- **Persistence**: SQLite + SQLAlchemy evaluation history

All results come from real execution — no fabricated metrics.

## Architecture

```
React Frontend → FastAPI API → Service Layer → ML Engines → Evaluation
                                                  ↓
                                     Database / Reports
```

Business logic lives in the service layer and modular registries
(`models`, `datasets`, `attacks`, `defenses`) — never inside API routes.

## Documentation

- [System Design](docs/SYSTEM_DESIGN.md)
- [API](docs/API_DOCUMENTATION.md)
- [Models](docs/MODEL_GUIDE.md)
- [Datasets](docs/DATASET_GUIDE.md)
- [Attack Engine](docs/ATTACK_ENGINE.md)
- [Defense Engine](docs/DEFENSE_ENGINE.md)
- [Testing](docs/TESTING_PLAN.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Status](IMPLEMENTATION_STATUS.md)

See [CHANGELOG.md](CHANGELOG.md) for version history.