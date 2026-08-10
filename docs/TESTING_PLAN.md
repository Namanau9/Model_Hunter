# Testing Plan

Tests live in `tests/backend/`. Run them from the backend directory:

```bash
cd backend
python -m pytest ../tests/backend -q
```

## Coverage

`tests/backend/test_api.py` (FastAPI TestClient integration):
- health + info endpoints
- models / datasets / attacks / defenses lists match the spec exactly
- upload validation rejects unsafe names/extensions
- incompatible model/dataset combo returns 400

`tests/backend/test_attacks.py` (unit):
- every attack generates adversarial examples of correct shape
- metrics + robustness scoring produce in-range real values
- all three model architectures build and forward correctly
- dataset metadata is consistent

## Validation Loop

For each feature: implement → test → fix → retest. The backend startup, API
routes, database, model/dataset loading, all five attacks, all three defenses,
evaluation, GradCAM/SHAP and CSV/HTML/PDF report generation are exercised
end-to-end during development.

## Frontend

`npm run build` in `frontend/` must succeed (Vite production build).