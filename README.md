# PayShield — Adaptive Fraud Defense & Decision Optimization Engine

A hackathon starter implementation aligned to the submitted proposal. It includes:
- FastAPI backend with `/health`, `/score`, `/policy`, `/simulate` and `/metrics` endpoints
- A React + Vite dashboard with transaction simulator and 1% / 2% / 3% friction-budget controls
- A training script for the IEEE-CIS Fraud Detection `train_transaction.csv` dataset
- Explainable risk factors, action decisions (ALLOW / STEP-UP / BLOCK), and demo stress testing

> **Important:** Until a model is trained on the official dataset, the app uses a clearly labelled deterministic demo scorer. It is not a live banking/payment system and must not be used for real financial decisions. Metrics in demo mode are illustrative only.

## Requirements
- Python 3.10+
- Node.js 18+
- Dataset access through Kaggle (follow the dataset's current terms). Place `train_transaction.csv` in `backend/data/`.

## 1. Run the backend (Windows PowerShell)
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Open http://127.0.0.1:8000/docs to try the API.

## 2. Run the frontend (new terminal)
```powershell
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite (usually http://localhost:5173).

## 3. Train a model (optional, after obtaining the dataset)
Put `train_transaction.csv` in `backend/data/`, then from `backend/` run:
```powershell
python train_model.py
```
The script uses a time-ordered split based on `TransactionDT`, prunes to a manageable numeric feature set, and saves `app/model.joblib`. Training can take time and memory; if your laptop struggles, use Google Colab and copy the resulting model file into `backend/app/`.

## How decisions work
- `ALLOW`: low estimated risk
- `STEP-UP`: uncertain/moderate risk; the demo simulates extra verification (no real OTP is sent)
- `BLOCK`: high risk under the current policy
- The policy layer is separate from the prediction layer. The friction budget control changes the step-up selection policy; it is a prototype approximation and should be evaluated on a labelled validation set before claiming a hard operational guarantee.

## Suggested build order
1. Run demo mode end-to-end.
2. Obtain and train on IEEE-CIS.
3. Evaluate PR-AUC, precision, recall, false-positive rate and legitimate step-up rate on a held-out time segment.
4. Improve cost calibration and friction-budget quantile selection using labelled validation data.
5. Add persistent audit logs/PostgreSQL, WebSocket streaming, SHAP explanations, deployment and security hardening.

## API examples
```bash
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/score -H "Content-Type: application/json" -d '{"amount":1250,"hour":2,"device_new":true,"velocity_5m":4,"geo_deviation":0.8,"customer_avg_amount":300}'
```
