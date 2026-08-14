# ModelHunter
## System Requirements Specification (SRS)

Version: 1.0

---

# Project Name

ModelHunter

Autonomous Adversarial Machine Learning Security Evaluation Platform

---

# Project Overview

ModelHunter is a web-based platform that evaluates the robustness of deep learning models against adversarial attacks.

The platform enables users to:

- Load pretrained models
- Upload custom models
- Select datasets
- Execute multiple adversarial attacks
- Apply defense mechanisms
- Evaluate robustness
- Generate professional benchmarking reports

The system should be modular so that new attacks, datasets, models, and defense techniques can be added without changing the core architecture.

---

# Primary Objective

Develop a production-ready AI Security Evaluation Platform that automates adversarial robustness testing.

---

# Supported Models

Version 1.0 should support only:

• CNN
• ResNet18
• MobileNetV2

Models must be dynamically loadable.

Supported sources:

- torchvision pretrained models
- local .pth checkpoints
- future HuggingFace support

---

# Supported Datasets

Version 1.0

MNIST

Purpose:
Baseline attack evaluation

---

CIFAR10

Purpose:
Image classification robustness

---

GTSRB

Purpose:
Traffic sign robustness evaluation

---

Datasets should automatically download if not found locally.

---

# Supported Attacks

Exactly these attacks:

1. FGSM

2. PGD

3. Carlini Wagner

4. ZOO

5. HopSkipJump

Every attack should expose configurable parameters.

Example:

epsilon

steps

confidence

learning rate

query limit

---

# Defense Mechanisms

Exactly three.

1.

Adversarial Training

2.

Ensemble Defense

CNN

+

ResNet18

+

MobileNetV2

Majority Voting

3.

Input Preprocessing

Include

Gaussian Blur

JPEG Compression

Feature Squeezing

---

# Explainability

Support

GradCAM

SHAP

Generate:

Heatmaps

Feature importance

Confidence comparison

---

# Evaluation Metrics

Compute:

Clean Accuracy

Adversarial Accuracy

Accuracy Drop

Attack Success Rate

Confidence Shift

Transferability Index

Robustness Score

---

Robustness Score Formula

Robustness Score =

0.4 × Adversarial Accuracy

+

0.3 × (100 − Attack Success Rate)

+

0.3 × Retained Confidence

Classification

0–30 Weak

31–60 Moderate

61–100 Strong

---

# Report Generation

Generate reports in

PDF

HTML

CSV

Include

Model

Dataset

Attack

Defense

Metrics

Graphs

Images

Timestamp

---

# User Roles

Current Version

Single User

Future

Admin

Researcher

Student

---

# Functional Requirements

FR1

Load models

FR2

Upload models

FR3

Load datasets

FR4

Run attacks

FR5

Apply defenses

FR6

Compute metrics

FR7

Generate reports

FR8

View dashboard

FR9

Visualize attacks

FR10

Compare multiple models

---

# Non Functional Requirements

Python 3.11

Docker support

REST API

Modular code

Responsive frontend

Cross-platform

Scalable architecture

Low coupling

High cohesion

Reusable modules

Clean code

SOLID principles

---

# Technology Stack

Frontend

React

Material UI

React Router

Axios

Recharts

Backend

FastAPI

Python

Uvicorn

Pydantic

Machine Learning

PyTorch

TorchVision

ART

Foolbox

Explainability

GradCAM

SHAP

Database

SQLite

ORM

SQLAlchemy

Deployment

Docker

Docker Compose

---

# Expected Deliverables

Working frontend

Working backend

Working attacks

Working defenses

Working dashboard

Professional documentation

API documentation

Docker setup

README

Unit tests
