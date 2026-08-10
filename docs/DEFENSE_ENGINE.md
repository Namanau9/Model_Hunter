# Defense Engine

Three defenses are registered in `app/defenses/registry.py`.

## Adversarial Training
Fine-tunes a model on a mix of clean and FGSM-adversarial training examples,
hardening the model against attacks.

## Ensemble
Majority voting across multiple models. On CIFAR-10 / GTSRB it combines all
available compatible checkpoints (ResNet18 + MobileNetV2); on MNIST it falls
back to the single compatible model. The wrapper returns the summed logits so
gradient-based attacks remain valid.

## Input Preprocessing
Wraps the model with a preprocessing transform applied before inference.
Available methods: `gaussian_blur`, `jpeg`, `feature_squeezing`, `none`.

All defenses implement `Defense.wrap()` returning the model that evaluation
uses, and are applied inside `app/services/evaluation_service`.

Add a new defense by implementing `Defense` in `app/defenses/` and registering
it — no other code changes required.