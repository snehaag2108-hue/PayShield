


from pathlib import Path
import json
import warnings

import joblib
import numpy as np
import pandas as pd

from xgboost import XGBClassifier
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    average_precision_score,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "train_transaction.csv"
MODEL_PATH = BASE_DIR / "app" / "model.joblib"
METRICS_PATH = BASE_DIR / "data" / "training_metrics.json"

INR_PER_USD = 85.0
FEATURES = ["amount_usd", "geo_proxy"]

USE_COLUMNS = [
    "TransactionDT",
    "TransactionAmt",
    "dist1",
    "isFraud",
]


def main():
    print("\n========== PAYSHIELD ADVANCED TRAINING ==========\n")

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset missing: {DATA_PATH}"
        )

    print("Loading IEEE-CIS dataset...")
    df = pd.read_csv(
        DATA_PATH,
        usecols=USE_COLUMNS,
        low_memory=False
    )

    df = df.sort_values("TransactionDT").reset_index(drop=True)

    df["TransactionAmt"] = pd.to_numeric(
        df["TransactionAmt"], errors="coerce"
    )
    df["dist1"] = pd.to_numeric(
        df["dist1"], errors="coerce"
    )
    df["isFraud"] = pd.to_numeric(
        df["isFraud"], errors="coerce"
    )

    df = df.dropna(subset=["TransactionAmt", "isFraud"])

    # Keep preprocessing values from training data
    dist1_cap = float(df["dist1"].quantile(0.99))
    if not np.isfinite(dist1_cap) or dist1_cap <= 0:
        dist1_cap = 1.0

    df["amount_usd"] = df["TransactionAmt"].clip(lower=0)
    df["geo_proxy"] = (
        df["dist1"].fillna(0).clip(lower=0, upper=dist1_cap)
        / dist1_cap
    )

    X = df[FEATURES].astype("float32")
    y = df["isFraud"].astype("int32")

    split = int(len(df) * 0.80)

    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    fraud_count = int(y_train.sum())
    normal_count = len(y_train) - fraud_count
    scale_weight = normal_count / max(fraud_count, 1)

    print("Training XGBoost...")
    model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="aucpr",
        scale_pos_weight=scale_weight,
        tree_method="hist",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    print("Training Isolation Forest...")
    anomaly_model = IsolationForest(
        n_estimators=150,
        contamination="auto",
        random_state=42,
        n_jobs=-1,
    )
    anomaly_model.fit(X_train)

    print("Evaluating models...")
    probabilities = model.predict_proba(X_test)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)

    anomaly_scores = anomaly_model.decision_function(X_test)
    anomaly_threshold = float(np.percentile(anomaly_scores, 5))
    anomaly_scale = float(
        max(np.percentile(anomaly_scores, 95) - anomaly_threshold, 1e-6)
    )

    metrics = {
        "average_precision": float(
            average_precision_score(y_test, probabilities)
        ),
        "roc_auc": float(roc_auc_score(y_test, probabilities)),
        "precision": float(
            precision_score(y_test, predictions, zero_division=0)
        ),
        "recall": float(
            recall_score(y_test, predictions, zero_division=0)
        ),
        "f1_score": float(
            f1_score(y_test, predictions, zero_division=0)
        ),
        "confusion_matrix": confusion_matrix(
            y_test, predictions
        ).tolist(),
        "training_rows": int(len(X_train)),
        "testing_rows": int(len(X_test)),
        "fraud_cases": int(y.sum()),
        "features": FEATURES,
        "anomaly_detector": "IsolationForest",
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    bundle = {
        "model": model,
        "anomaly_model": anomaly_model,
        "features": FEATURES,
        "dist1_cap": dist1_cap,
        "inr_per_usd": INR_PER_USD,
        "anomaly_threshold": anomaly_threshold,
        "anomaly_scale": anomaly_scale,
        "version": "payshield-xgb-iforest-v2",
    }

    joblib.dump(bundle, MODEL_PATH)

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=4)

    print("\n========== TRAINING COMPLETE ==========")
    for key in [
        "average_precision",
        "roc_auc",
        "precision",
        "recall",
        "f1_score",
    ]:
        print(f"{key}: {metrics[key]:.4f}")

    print("\nConfusion matrix:")
    print(metrics["confusion_matrix"])
    print("\nModel saved:", MODEL_PATH)
    print("Metrics saved:", METRICS_PATH)


if __name__ == "__main__":
    main()
