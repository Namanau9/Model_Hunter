// Static knowledge the UI uses to describe backend registries. The backend
// remains the source of truth for *what exists* (lists come from the API);
// these maps only add human-friendly copy and fall back when offline.

export const COMPATIBLE = {
  mnist: ["cnn"],
  cifar10: ["resnet18", "mobilenetv2"],
  gtsrb: ["resnet18", "mobilenetv2"],
};

export const ATTACK_IDS = ["fgsm", "pgd", "cw", "zoo", "hopskipjump"];
export const DEFENSE_IDS = ["none", "adversarial_training", "ensemble", "input_preprocessing"];

export const ATTACK_META = {
  fgsm: {
    label: "FGSM",
    name: "Fast Gradient Sign Method",
    access: "White-box",
    norm: "L∞",
    speed: 5,
    strength: 2,
    blurb: "One gradient step: every pixel nudged by ±ε in the direction that increases the loss.",
  },
  pgd: {
    label: "PGD",
    name: "Projected Gradient Descent",
    access: "White-box",
    norm: "L∞",
    speed: 3,
    strength: 4,
    blurb: "Iterated FGSM with random start, projected back into the ε-ball after every step.",
  },
  cw: {
    label: "C&W",
    name: "Carlini–Wagner",
    access: "White-box",
    norm: "L2",
    speed: 2,
    strength: 5,
    blurb: "Optimisation-based: finds the smallest L2 perturbation that flips the decision.",
  },
  zoo: {
    label: "ZOO",
    name: "Zeroth-Order Optimisation",
    access: "Black-box",
    norm: "L2",
    speed: 1,
    strength: 3,
    blurb: "Estimates gradients coordinate-by-coordinate from model queries — no weights needed.",
  },
  hopskipjump: {
    label: "HopSkipJump",
    name: "HopSkipJump",
    access: "Black-box",
    norm: "L2",
    speed: 2,
    strength: 3,
    blurb: "Decision-based: walks along the decision boundary using only the predicted label.",
  },
};

export const DEFENSE_META = {
  none: { label: "No defense", short: "Baseline", blurb: "Evaluate the raw model." },
  adversarial_training: {
    label: "Adversarial Training",
    short: "Adv. training",
    blurb: "Costs extra training time, and usually gives the strongest protection against the attack it was trained on.",
  },
  ensemble: {
    label: "Ensemble",
    short: "Ensemble",
    blurb: "A single fooled model gets outvoted. Needs a trained checkpoint for each compatible model.",
  },
  input_preprocessing: {
    label: "Input Preprocessing",
    short: "Preprocessing",
    blurb: "Cheap and works with any model, but an adaptive attacker can learn perturbations that survive it.",
  },
};

export const MODEL_META = {
  cnn: { label: "CNN", params: "~0.1M", depth: 4, blurb: "Compact 2-layer convolutional net for grayscale digits." },
  resnet18: { label: "ResNet-18", params: "11.2M", depth: 18, blurb: "Residual network with skip connections, 3-channel input." },
  mobilenetv2: { label: "MobileNetV2", params: "2.2M", depth: 53, blurb: "Inverted residuals + depthwise convs, built for the edge." },
};

export const DATASET_META = {
  mnist: { label: "MNIST", shape: "28×28×1", train: "60,000", test: "10,000", domain: "Handwritten digits" },
  cifar10: { label: "CIFAR-10", shape: "32×32×3", train: "50,000", test: "10,000", domain: "Natural images" },
  gtsrb: { label: "GTSRB", shape: "32×32×3", train: "26,640", test: "12,630", domain: "Traffic signs" },
};

export const CLASS_NAMES = {
  mnist: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  cifar10: ["airplane", "automobile", "bird", "cat", "deer", "dog", "frog", "horse", "ship", "truck"],
  gtsrb: [
    "Speed limit 20", "Speed limit 30", "Speed limit 50", "Speed limit 60", "Speed limit 70",
    "Speed limit 80", "End of limit 80", "Speed limit 100", "Speed limit 120", "No passing",
    "No passing >3.5t", "Right-of-way", "Priority road", "Yield", "Stop", "No vehicles",
    "No vehicles >3.5t", "No entry", "General caution", "Dangerous curve left",
    "Dangerous curve right", "Double curve", "Bumpy road", "Slippery road", "Road narrows right",
    "Road work", "Traffic signals", "Pedestrians", "Children crossing", "Bicycles crossing",
    "Beware of ice/snow", "Wild animals", "End of all limits", "Turn right ahead",
    "Turn left ahead", "Ahead only", "Straight or right", "Straight or left", "Keep right",
    "Keep left", "Roundabout", "End of no passing", "End no passing >3.5t",
  ],
};

export function className(dataset, idx) {
  const names = CLASS_NAMES[dataset];
  if (idx == null) return "—";
  return names?.[idx] ?? `class ${idx}`;
}

// Robustness score bands (README: 0–30 Weak, 31–60 Moderate, 61–100 Strong).
export const ROBUSTNESS_BANDS = [
  { klass: "Weak", min: 0, max: 30 },
  { klass: "Moderate", min: 30, max: 60 },
  { klass: "Strong", min: 60, max: 100 },
];

export function classFor(score) {
  if (score == null) return null;
  if (score <= 30) return "Weak";
  if (score <= 60) return "Moderate";
  return "Strong";
}
