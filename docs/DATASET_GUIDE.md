# Dataset Guide

Datasets download automatically on first load into `datasets/`.

| Name | Classes | Channels | Size | Notes |
|---|---|---|---|---|
| `mnist` | 10 | 1 | 28×28 | Grayscale digits |
| `cifar10` | 10 | 3 | 32×32 | Colour object images |
| `gtsrb` | 43 | 3 | 32×32 | German traffic signs |

Each dataset module (`app/datasets/{name}.py`) exposes a loader class with
`load(train=...)` and `dataloader(...)` methods plus an `unnormalize` helper
used for visualisations.

Normalisation statistics are dataset-specific:

- MNIST: mean 0.1307, std 0.3081
- CIFAR-10: mean (0.4914, 0.4822, 0.4465), std (0.2470, 0.2435, 0.2616)
- GTSRB: mean (0.3403, 0.3121, 0.3214), std (0.2724, 0.2608, 0.2669)

Add a new dataset by creating a module in `app/datasets/` and registering it
in `app/datasets/registry.py` (plus a compatible model mapping in
`app/models/registry.py`).