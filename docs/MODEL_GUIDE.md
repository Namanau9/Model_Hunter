# Model Guide

Three models are supported. Dataset pairing is enforced by the registry.

| Model | Channels | Compatible Datasets | Notes |
|---|---|---|---|
| `cnn` | 1 | mnist | Custom two-layer CNN (32/64 convs + MLP) |
| `resnet18` | 3 | cifar10, gtsrb | torchvision ResNet18; first conv replaced for 32×32 |
| `mobilenetv2` | 3 | cifar10, gtsrb | torchvision MobileNetV2 with new classifier head |

## Loading

Models are loaded via `app/services/model_service.load_model`. If a checkpoint
exists in `pretrained_models/{model}_{dataset}.pth` it is used; otherwise a
fresh (untrained) instance is returned.

## Training

```bash
curl -X POST http://localhost:8000/api/models/train \
  -H 'Content-Type: application/json' \
  -d '{"model_name":"cnn","dataset_name":"mnist","epochs":2,"batch_size":64}'
```

Checkpoints are persisted with `torch.save({"state_dict": ...})`.

## Pretrained torchvision weights

Set `pretrained=True` when building a model to use ImageNet weights
(`build_model(..., pretrained=True)`). This is optional and not required for
the small datasets.

## Uploads

Upload `.pth` / `.pt` / `.ckpt` files via `POST /api/models/upload`. Files are
validated for name, extension and size. Checkpoints are deserialized with
`weights_only=True` to prevent arbitrary code execution.