# ModelHunter

Project Structure

---

```
ModelHunter/

│

├── frontend/

│   ├── public/

│   ├── src/

│   │

│   ├── assets/

│   ├── components/

│   ├── layouts/

│   ├── hooks/

│   ├── contexts/

│   ├── pages/

│   │

│   ├── Dashboard/

│   ├── Models/

│   ├── Datasets/

│   ├── Attacks/

│   ├── Defenses/

│   ├── Evaluation/

│   ├── Reports/

│   ├── Explainability/

│   │

│   ├── services/

│   ├── utils/

│   ├── theme/

│   └── App.jsx

│

├── backend/

│

│   ├── app/

│   │

│   ├── api/

│   │

│   ├── attacks/

│   │

│   ├── fgsm.py

│   ├── pgd.py

│   ├── cw.py

│   ├── zoo.py

│   └── hopskipjump.py

│

│   ├── defenses/

│   │

│   ├── adversarial_training.py

│   ├── ensemble.py

│   └── preprocessing.py

│

│   ├── models/

│   │

│   ├── cnn.py

│   ├── resnet18.py

│   ├── mobilenetv2.py

│   └── loader.py

│

│   ├── datasets/

│   │

│   ├── mnist.py

│   ├── cifar10.py

│   ├── gtsrb.py

│   └── loader.py

│

│   ├── explainability/

│   │

│   ├── gradcam.py

│   └── shap.py

│

│   ├── evaluation/

│   │

│   ├── metrics.py

│   ├── robustness.py

│   └── comparison.py

│

│   ├── reports/

│   │

│   ├── pdf.py

│   ├── html.py

│   └── csv.py

│

│   ├── database/

│   │

│   ├── models.py

│   ├── schema.py

│   └── database.py

│

│   ├── services/

│

│   ├── middleware/

│

│   ├── config/

│

│   ├── utils/

│

│   ├── main.py

│

│   └── requirements.txt

│

├── datasets/

│

├── pretrained_models/

│

├── reports/

│

├── results/

│

├── docker/

│

│   ├── Dockerfile.frontend

│   ├── Dockerfile.backend

│   └── docker-compose.yml

│

├── docs/

│

│   ├── README.md

│   ├── API.md

│   ├── SYSTEM_DESIGN.md

│   ├── ATTACK_ENGINE.md

│   ├── DEFENSE_ENGINE.md

│   ├── DATASETS.md

│   └── MODELS.md

│

├── tests/

│

│   ├── backend/

│   ├── frontend/

│   └── attacks/

│

├── scripts/

│

├── .env

├── .gitignore

├── LICENSE

├── README.md

└── CHANGELOG.md
```

---

# Architecture Principles

Every feature must be independent.

Example:

Attack Engine should never directly communicate with the frontend.

Frontend

↓

API

↓

Service Layer

↓

Attack Engine

↓

Evaluation

↓

Database

---

# Coding Standards

Every module should:

- Have its own folder
- Be independently testable
- Contain documentation
- Use dependency injection where applicable
- Follow SOLID principles
- Include type hints
- Include logging
- Include exception handling
- Include unit tests

---

# API Design

Use REST APIs.

Every endpoint must return:

```

{
"success":true,
"message":"...",
"data":{}
}

```

---

# Frontend Theme

Modern Cybersecurity Dashboard

Dark Theme

Colors

Primary

#2563EB

Accent

#00E5FF

Success

#00C853

Warning

#FF9800

Danger

#FF1744

Background

#0F172A

Cards

#1E293B

---

# Development Rules

Never hardcode paths.

Use environment variables.

Keep modules reusable.

Separate business logic from APIs.

Keep frontend independent from backend.

Generate clean documentation.

Follow professional software engineering practices.
