# System Design

ModelHunter is a layered application with strict separation of concerns.

## Layers

### Frontend (React + MUI + Recharts)
Single-page app with Vite. Pages: Dashboard, Models, Datasets, Attack Center,
Defense Center, Evaluation, Explainability, Reports, Settings.
All data is fetched from the FastAPI backend over `/api`.

### API (FastAPI)
Thin REST layer. Every endpoint returns:

```json
{ "success": true, "message": "...", "data": {} }
```

No business logic lives inside route handlers — they delegate to services.

### Service Layer
- `model_service` — train, load, persist, upload models
- `dataset_service` — dataset metadata
- `attack_service` — attack registry listing / param validation
- `evaluation_service` — orchestrates model + dataset + attack + defense + metrics + reports
- `explainability_service` — GradCAM / SHAP generation
- `report_service` — history and report file management

### ML Engines
Each domain has a registry (interface + factory map):

| Registry | Members |
|---|---|
| `models/registry.py` | cnn, resnet18, mobilenetv2 |
| `datasets/registry.py` | mnist, cifar10, gtsrb |
| `attacks/registry.py` | fgsm, pgd, cw, zoo, hopskipjump |
| `defenses/registry.py` | adversarial_training, ensemble, input_preprocessing |

Adding a new attack/dataset/model/defense requires touching only its folder
and its registry — nowhere else.

### Database
SQLite via SQLAlchemy ORM. Tables:
- `evaluations` — one row per evaluation run with all metrics
- `evaluation_details` — JSON config and summary

### Reports
`reports/generators.py` produces CSV, HTML and PDF files in `reports/`.

### Device Management
`utils/device.py` resolves the ML accelerator at runtime from `DEVICE`
(`auto | cpu | cuda | cuda:<idx> | mps`). `auto` selects CUDA → MPS → CPU,
falling back to CPU when the requested accelerator is unavailable. Services use
the resolved device for model placement, pinned-memory loaders (CUDA), CUDA
seeding, and serialize heavy jobs via `gpu_execution()` to avoid OOM. Active
device telemetry is exposed through `/api/info` and the Settings UI.

## Robustness Score (per SRS)

```
0.4 × Adversarial Accuracy + 0.3 × (100 − Attack Success Rate) + 0.3 × Retained Confidence
Classification: 0–30 Weak · 31–60 Moderate · 61–100 Strong
```

## Security

- Uploaded checkpoints validated for name, extension and size
- `torch.load(..., weights_only=True)` blocks unsafe pickle deserialization
- No stack traces exposed to clients (global error handler logs server-side)
- Path traversal protection in `utils/paths.py`
- CORS restricted to configured origins