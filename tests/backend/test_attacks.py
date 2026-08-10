"""Unit tests for attacks and metrics using a tiny dummy model."""
from __future__ import annotations

import torch
import torch.nn as nn

from app.attacks.registry import AttackRegistry
from app.evaluation.metrics import compute_metrics, robustness_score
from app.models.registry import ModelRegistry
from app.datasets.registry import DatasetRegistry


class DummyModel(nn.Module):
    def __init__(self, n=10):
        super().__init__()
        self.fc = nn.Linear(8, n)

    def forward(self, x):
        return self.fc(torch.flatten(x, 1))


class _DummyLoader:
    def __init__(self, n=32):
        self.x = torch.rand(32, 1, 2, 4)
        self.y = torch.randint(0, 10, (32,))
        self._n = n

    def __iter__(self):
        yield self.x, self.y

    def __len__(self):
        return 1


def test_all_attacks_generate():
    model = DummyModel()
    for name in AttackRegistry.names():
        attack = AttackRegistry.create(name, model, {"epsilon": 0.1, "steps": 3, "max_iterations": 2})
        adv = attack.generate(torch.rand(4, 1, 2, 4), torch.randint(0, 10, (4,)))
        assert adv.shape == (4, 1, 2, 4)
        assert torch.isfinite(adv).all()


def test_metrics_and_robustness():
    model = DummyModel()
    attack = AttackRegistry.create("fgsm", model, {"epsilon": 0.2})
    result = compute_metrics(model, attack, _DummyLoader(), device="cpu", limit=32, epsilon=0.2)
    score, klass = robustness_score(result)
    assert 0.0 <= score <= 100.0
    assert klass in ("Weak", "Moderate", "Strong")
    assert result.n_samples == 32


def test_registry_build_all_models():
    for name in ModelRegistry.names():
        m = ModelRegistry.build(name, 10)
        assert m is not None
        m.eval()
        if name == "cnn":
            x = torch.zeros(1, 1, 28, 28)
        else:
            x = torch.zeros(1, 3, 32, 32)
        out = m(x)
        assert out.shape[1] == 10


def test_dataset_metadata():
    for name in DatasetRegistry.names():
        assert DatasetRegistry.num_classes(name) > 0
        assert DatasetRegistry.has(name)
