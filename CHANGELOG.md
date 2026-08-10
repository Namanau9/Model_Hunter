# Changelog

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