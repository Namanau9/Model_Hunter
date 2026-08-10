# Implementation Status

Legend: [COMPLETED] [PARTIAL] [MISSING] [BROKEN]

## Backend
- FastAPI app + layered services ......... [COMPLETED]
- Config (pydantic-settings) ............. [COMPLETED]
- Middleware (CORS, logging, errors) ..... [COMPLETED]
- Security (upload validation, safe load) [COMPLETED]

## Models
- CNN ...................................... [COMPLETED]
- ResNet18 ................................ [COMPLETED]
- MobileNetV2 ............................. [COMPLETED]
- Checkpoint persistence / training ....... [COMPLETED]
- Model uploads ........................... [COMPLETED]

## Datasets
- MNIST ................................... [COMPLETED]
- CIFAR-10 ................................ [COMPLETED]
- GTSRB ................................... [COMPLETED]
- Auto-download ........................... [COMPLETED]

## Attacks
- FGSM .................................... [COMPLETED]
- PGD ..................................... [COMPLETED]
- Carlini-Wagner .......................... [COMPLETED]
- ZOO ..................................... [COMPLETED]
- HopSkipJump ............................. [COMPLETED]

## Defenses
- Adversarial Training .................... [COMPLETED]
- Ensemble (majority vote) ................ [COMPLETED]
- Input Preprocessing ..................... [COMPLETED]

## Explainability
- GradCAM ................................. [COMPLETED]
- SHAP .................................... [COMPLETED]

## Metrics
- Clean / Adv Accuracy, Accuracy Drop ..... [COMPLETED]
- Attack Success Rate ..................... [COMPLETED]
- Confidence Shift ........................ [COMPLETED]
- Transferability Index ................... [COMPLETED]
- Execution Time .......................... [COMPLETED]
- Robustness Score (SRS formula) .......... [COMPLETED]

## Reports
- CSV / HTML / PDF ........................ [COMPLETED]

## Database
- SQLite + SQLAlchemy, history API ........ [COMPLETED]

## Frontend (React)
- Dashboard, Models, Datasets, Attack Center, Defense Center,
  Evaluation, Explainability, Reports, Settings ..... [COMPLETED]
- Vite production build ................... [COMPLETED]

## Tests
- Backend API + attack/metrics unit tests .. [COMPLETED] (12 passing)

## Docker
- Backend / Frontend / Compose ............ [COMPLETED]

## Docs
- README, SYSTEM_DESIGN, API, MODEL, DATASET, ATTACK_ENGINE,
  DEFENSE_ENGINE, TESTING_PLAN, DEPLOYMENT, CHANGELOG ... [COMPLETED]

## Known Limitations / Intentionally Simplified
- ZOO and HopSkipJump are simplified gradient-free / decision-based
  implementations (real execution but reduced query budgets for speed).
- Ensemble on MNIST contains a single compatible model (CNN), so it behaves
  like the base model there; on CIFAR-10/GTSRB it combines ResNet18+MobileNetV2.
- Robustness "retained confidence" uses `100 − confidence_shift` as the proxy.
- All execution is CPU by default (`DEVICE=cpu`).
