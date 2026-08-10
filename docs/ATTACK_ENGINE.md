# Attack Engine

Five attacks are implemented natively in PyTorch (no fragile external attack
library dependency), registered in `app/attacks/registry.py`.

| Attack | Type | Key Parameters |
|---|---|---|
| `fgsm` | Gradient | `epsilon` |
| `pgd` | Gradient / iterative | `epsilon`, `steps`, `step_size`, `random_start` |
| `cw` | Optimisation (L2) | `learning_rate`, `max_iterations`, `confidence`, `targeted` |
| `zoo` | Zeroth-order / gradient-free | `learning_rate`, `max_iterations`, `confidence` |
| `hopskipjump` | Decision-based / boundary | `max_iterations`, `query_limit` |

All attacks implement `Attack.generate(x, y)` returning adversarial inputs in
the same normalised space as the clean inputs. Gradients are computed with
`torch.autograd`, so attacks work with any differentiable model (including
ensemble and preprocessing wrappers).

Common parameters: `epsilon`, `steps`, `confidence`, `learning_rate`,
`query_limit`, `targeted`, `target_class`.

## Registry

```python
attack = AttackRegistry.create("pgd", model, {"epsilon": 0.1, "steps": 10})
```

Add a new attack by implementing `Attack` in `app/attacks/` and registering it
in `AttackRegistry` — no other code changes required.