# 🛡️ PayShield — Adaptive Fraud Defense & Decision Optimization Engine

**Detect the risk. Optimize the response.**

PayShield is an intelligent, ML-powered fraud detection and decision optimization prototype designed to evaluate transaction risk and recommend appropriate actions: **ALLOW, STEP-UP, or BLOCK**.

Instead of treating every suspicious transaction as simply fraudulent or legitimate, PayShield combines machine learning, anomaly detection, explainable AI, and configurable verification policies to support smarter transaction decisions.

---

## 🚀 Project Overview

Digital payment fraud is a growing challenge for financial institutions and payment platforms. Traditional fraud detection systems may generate false alerts, block legitimate customers, or require unnecessary verification.

PayShield addresses this challenge through an adaptive fraud defense approach.

It combines:
- XGBoost-based fraud risk estimation.
- Isolation Forest-based anomaly detection.
- SHAP-based model explanations.
- Rule-based contextual risk signals.
- Adaptive friction-budget decision optimization.

**Project Type:** AI / Machine Learning / FinTech  
**Status:** Hackathon Prototype

---

## 🎯 Key Features

### 1. Machine Learning Fraud Detection
- Trained using the IEEE-CIS Fraud Detection dataset.
- XGBoost classification model.
- Transaction amount and geographic proxy as trained model features.
- Fraud risk estimation through model predictions.

### 2. Anomaly Detection
- Isolation Forest algorithm.
- Identifies unusual transaction patterns.
- Provides an additional anomaly signal.

### 3. Explainable AI
- SHAP-based feature contribution explanations using XGBoost TreeSHAP.
- Explains how transaction features influence the model score.
- Improves transparency of automated decisions.

### 4. Adaptive Decision Engine

PayShield supports three transaction decisions:

| Decision | Description |
|---|---|
| ALLOW | Allow the transaction |
| STEP-UP | Request additional verification |
| BLOCK | Block the transaction |

The decision engine considers risk estimates, configurable thresholds, and friction-budget policies.

### 5. Customer Friction Budget
- Configurable friction budget.
- Adjustable verification cost.
- False-block cost consideration.
- Verification success-rate parameter.

### 6. Transaction Simulation
- Simulates up to 5,000 transactions per API request.
- Calculates action distributions.
- Estimates average transaction risk.
- Provides simulated blocked-amount statistics.

### 7. Interactive Dashboard
- Real-time transaction scoring.
- Risk visualization.
- Transaction statistics.
- Policy configuration.
- Simulation interface.

---

## 🧠 Machine Learning Workflow

1. Load the IEEE-CIS transaction dataset.
2. Preprocess transaction amount and geographic distance.
3. Create the `amount_usd` and `geo_proxy` features.
4. Split the dataset into time-ordered training and testing sets.
5. Train the XGBoost classifier.
6. Train the Isolation Forest anomaly detector.
7. Evaluate the model using classification metrics.
8. Save the trained model and preprocessing information.
9. Load the model into the FastAPI backend.
10. Generate transaction risk estimates and decision explanations.

### Model Evaluation

The training pipeline generates:

- Average Precision (PR-AUC)
- ROC-AUC
- Precision
- Recall
- F1-score
- Confusion Matrix

Evaluation results are saved in:

`backend/data/training_metrics.json`

---

## 🛠️ Technology Stack

| Category | Technology |
|---|---|
| Frontend | React, Vite |
| Styling | CSS |
| Backend | Python, FastAPI |
| API Documentation | Swagger UI |
| Machine Learning | XGBoost |
| Anomaly Detection | Isolation Forest |
| Explainable AI | SHAP / XGBoost TreeSHAP |
| Data Processing | Pandas, NumPy |
| Model Storage | Joblib |
| Dataset | IEEE-CIS Fraud Detection |
| Version Control | Git, GitHub |

---

## 📁 Project Structure

```text
PayShield/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── engine.py
│   │   ├── schemas.py
│   │   └── model.joblib
│   │
│   ├── data/
│   │   ├── train_transaction.csv
│   │   └── training_metrics.json
│   │
│   ├── train_model.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   └── style.css
│   ├── index.html
│   └── package.json
│
└── README.md
```

Note: Dataset and model files are excluded from GitHub using `.gitignore`. They are generated or downloaded locally.

---

## ⚙️ Installation and Setup

### Prerequisites

- Python 3.10 or newer
- Node.js and npm
- Git
- VS Code

### 1. Clone the repository

```bash
git clone https://github.com/snehaag2108-hue/PayShield.git
cd PayShield
```

### 2. Backend Setup

Open the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Download the Dataset

Download the IEEE-CIS Fraud Detection dataset from Kaggle:

https://www.kaggle.com/competitions/ieee-fraud-detection/data

Place `train_transaction.csv` inside:

```text
backend/data/train_transaction.csv
```

### 4. Train the ML Models

From the backend directory, execute:

```bash
python train_model.py
```

The training process generates:

- `backend/app/model.joblib`
- `backend/data/training_metrics.json`

### 5. Start the Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Backend URL:

http://127.0.0.1:8000

Swagger API documentation:

http://127.0.0.1:8000/docs

### 6. Frontend Setup

Open a separate terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend URL:

http://localhost:5173

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check API and model status |
| GET | `/policy` | Retrieve current policy |
| PUT | `/policy` | Update decision policy |
| POST | `/score` | Score a transaction |
| POST | `/simulate` | Simulate multiple transactions |
| GET | `/metrics` | Retrieve application metrics |

Interactive API documentation:

http://127.0.0.1:8000/docs

---

## 📊 Example Transaction Decisions

**ALLOW:** Low-risk transaction.

**STEP-UP:** Transaction requires additional verification because of elevated risk.

**BLOCK:** Transaction exceeds the configured blocking threshold without a conflicting anomaly signal.

All thresholds and decisions are prototype configurations and require further validation before real-world use.

---

## 🔮 Future Enhancements

- Advanced transaction feature engineering.
- Improved fraud classification performance.
- Calibrated fraud probability estimates.
- Real-time payment gateway integration.
- Advanced adaptive threshold optimization.
- More detailed SHAP visualizations.
- Model monitoring and drift detection.
- Secure user authentication and role-based access.
- Production deployment and scalability improvements.

---

## ⚠️ Limitations and Disclaimer

PayShield is an academic and hackathon prototype, not a production-ready payment security system.

- The current supervised model uses only transaction amount and a geographic proxy.
- Device novelty, transaction velocity, hour, and customer spending baseline are handled as rule-based contextual signals rather than trained IEEE-CIS features.
- The Isolation Forest model operates on the same limited feature set.
- The combined risk estimate is not a calibrated real-world fraud probability.
- Simulation results are synthetic and do not represent actual payment activity.
- SHAP explanations describe model contributions, not proof of fraud.
- Model performance must be independently validated before operational use.

**No real payments or OTP verification are processed by this prototype.**

---

## 👩‍💻 Author

**Sneha Agarwal**

GitHub: https://github.com/snehaag2108-hue

---

## 📜 License

This project is developed for educational, research, and hackathon demonstration purposes.


