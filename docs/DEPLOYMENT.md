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
- `DEVICE` — `auto` (default), `cpu`, `cuda`, `cuda:<index>`, or `mps`
- `NUM_WORKERS` — DataLoader workers (0 = safest cross-platform)
- `CORS_ORIGINS` — comma-separated allowed origins
- `SECRET_KEY` — change in production
- `MAX_UPLOAD_BYTES` — upload size limit

## GPU Support

`DEVICE=auto` (the default) selects the fastest available backend at startup:
**NVIDIA CUDA > Apple Silicon MPS > CPU**, with a graceful CPU fallback if the
requested accelerator is missing — the app never fails to boot.

### Local

```bash
DEVICE=auto uvicorn app.main:app --reload --port 8000   # automatic (recommended)
DEVICE=cuda uvicorn app.main:app --reload --port 8000   # force first GPU
DEVICE=cuda:1 ...                                        # force a specific GPU index
DEVICE=mps ...                                           # Apple Silicon (macOS)
```

Verify the active device:

```bash
python -c "from app.utils.device import get_device_info; print(get_device_info())"
# or over HTTP:
curl http://localhost:8000/api/info | jq .data.device
```

The Settings page shows a **Compute Accelerator** panel with the active backend,
GPU name, VRAM, CUDA/cuDNN and PyTorch versions.

### Docker with NVIDIA GPU

1. Install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
   on the host and configure `/etc/docker/daemon.json` with the `nvidia` runtime.
2. Build with CUDA-enabled PyTorch wheels (match `cuXXX` to your driver):

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.gpu.yml \
  build --build-arg TORCH_INDEX_URL=https://download.pytorch.org/whl/cu124 backend
```

3. Start:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.gpu.yml up
```

The GPU override reserves all GPUs (`count: all`), sets `NVIDIA_VISIBLE_DEVICES=all`
and `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`, and runs with `DEVICE=auto`.

### Notes & caveats

- Training/evaluation loaders use `pin_memory` on CUDA and `NUM_WORKERS`
  (default `0`, which is Windows/macOS-safe).
- GradCAM (Captum) and SHAP are not guaranteed on every accelerator (notably
  MPS); the explainability service automatically retries those on CPU.
- A `gpu_execution` lock serializes heavy accelerator jobs to avoid OOM from
  parallel API calls.

## Production Notes

- Set `DEBUG=false` and a strong `SECRET_KEY`
- Run behind a reverse proxy with TLS
- Restrict `CORS_ORIGINS` to the deployed frontend origin
- Use a GPU device for real-scale training/evaluation