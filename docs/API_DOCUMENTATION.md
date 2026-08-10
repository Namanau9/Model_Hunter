# API Documentation

Base URL: `http://localhost:8000/api`

Every response uses the envelope `{ success, message, data }`.

## System

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health + database connectivity |
| GET | `/info` | App info, supported models/datasets/attacks/defenses |

## Models

| Method | Path | Description |
|---|---|---|
| GET | `/models` | List model registry + uploaded checkpoints |
| POST | `/models/train` | Train a model. Body: `{model_name, dataset_name, epochs, batch_size, learning_rate, limit}` |
| POST | `/models/upload` | Upload `.pth`/`.pt`/`.ckpt` (multipart `file`) |

## Datasets

| Method | Path | Description |
|---|---|---|
| GET | `/datasets` | List datasets with classes/channels/compatible models |
| GET | `/datasets/{name}/size` | Sample counts (downloads data on first call) |

## Attacks

| Method | Path | Description |
|---|---|---|
| GET | `/attacks` | List attacks with default parameters |
| GET | `/attacks/{name}/params` | Default params for an attack |

## Defenses

| Method | Path | Description |
|---|---|---|
| GET | `/defenses` | List defenses with methods |

## Evaluation

| Method | Path | Description |
|---|---|---|
| POST | `/evaluation/run` | Run a full evaluation. See body schema below |
| GET | `/evaluation/history` | Recent runs (`?limit=50`) |
| POST | `/evaluation/benchmark` | Run one attack against all compatible models |

### `POST /evaluation/run` body

```json
{
  "model_name": "cnn",
  "dataset_name": "mnist",
  "attack_name": "fgsm",
  "defense_name": null,
  "attack_params": {
    "epsilon": 0.1, "steps": 10, "step_size": null, "confidence": 0.0,
    "learning_rate": 0.01, "query_limit": 100, "random_start": true,
    "targeted": false, "target_class": null, "max_iterations": 10
  },
  "sample_limit": 200,
  "batch_size": 64,
  "seed": 42
}
```

Returns metrics including `robustness_score`, `robustness_class`, report
paths, and the persisted `evaluation_id`.

## Explainability

| Method | Path | Description |
|---|---|---|
| POST | `/explainability` | Body: `{model_name, dataset_name, technique: "gradcam"|"shap", sample_index, class_index}`. Returns PNG (`image_base64`) |

## Reports

| Method | Path | Description |
|---|---|---|
| GET | `/reports` | List generated report files |
| GET | `/reports/{evaluation_id}/download/{html\|csv\|pdf}` | Download a report file |