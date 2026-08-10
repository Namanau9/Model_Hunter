# Deployment

## Local Development

```bash
# Backend (http://localhost:8000)
python -m venv .venv && .venv\Scripts\activate
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (http://localhost:5173, proxies /api to backend)
cd frontend && npm install && npm run dev
```

## Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

- Frontend: http://localhost:5173 (nginx, proxies `/api` → backend:8000)
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

Persistent data (datasets, checkpoints, reports) is mounted from the host.

## Configuration

All settings come from environment variables (see `.env.example`). Key ones:

- `DATABASE_URL` — SQLAlchemy URL (default `sqlite:///./modelhunter.db`)
- `DEVICE` — `cpu` or `cuda`
- `CORS_ORIGINS` — comma-separated allowed origins
- `SECRET_KEY` — change in production
- `MAX_UPLOAD_BYTES` — upload size limit

## Production Notes

- Set `DEBUG=false` and a strong `SECRET_KEY`
- Run behind a reverse proxy with TLS
- Restrict `CORS_ORIGINS` to the deployed frontend origin
- Use a GPU device for real-scale training/evaluation