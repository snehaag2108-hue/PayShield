
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

MODEL_PATH = Path(__file__).with_name("model.joblib")

try:
    MODEL = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
except Exception as error:
    print("Model loading error:", error)
    MODEL = None


def _demo_probability(tx):
    score = 0.04
    reasons = []

    amount = float(tx.get("amount") or 0)
    average = max(float(tx.get("customer_avg_amount") or 1), 1)

    if amount > average * 3:
        score += 0.22
        reasons.append("Transaction amount is much higher than customer baseline")
    elif amount > average * 1.8:
        score += 0.10
        reasons.append("Transaction amount is above customer baseline")

    if tx.get("device_new"):
        score += 0.22
        reasons.append("New or unfamiliar device")

    velocity = int(tx.get("velocity_5m") or 0)
    if velocity >= 5:
        score += 0.28
        reasons.append("High transaction velocity")
    elif velocity >= 3:
        score += 0.14
        reasons.append("Elevated transaction velocity")

    geo = float(tx.get("geo_deviation") or 0)
    if geo >= 0.7:
        score += 0.22
        reasons.append("Large geographic deviation")
    elif geo >= 0.35:
        score += 0.10
        reasons.append("Unusual geographic pattern")

    hour = int(tx.get("hour") or 0)
    if hour <= 4:
        score += 0.07
        reasons.append("Unusual transaction hour")

    if tx.get("anomaly_score") is not None:
        score = 0.75 * score + 0.25 * float(tx["anomaly_score"])

    return float(np.clip(score, 0.01, 0.99)), reasons


def predict(tx):
    demo_score, reasons = _demo_probability(tx)

    if MODEL is None:
        return demo_score, reasons, "demo-heuristic"

    try:
        amount_inr = float(tx.get("amount") or 0)
        amount_usd = max(amount_inr, 0) / float(
            MODEL.get("inr_per_usd", 85.0)
        )

        geo_proxy = float(
            np.clip(float(tx.get("geo_deviation") or 0), 0, 1)
        )

        features = MODEL["features"]
        row = pd.DataFrame(
            [[amount_usd, geo_proxy]],
            columns=features
        )

        model = MODEL["model"]
        model_probability = float(
            model.predict_proba(row)[0, 1]
        )

        # Isolation Forest anomaly estimate
        anomaly_probability = 0.0
        anomaly_model = MODEL.get("anomaly_model")

        if anomaly_model is not None:
            raw_score = float(
                anomaly_model.decision_function(row)[0]
            )
            threshold = float(
                MODEL.get("anomaly_threshold", 0)
            )
            scale = max(
                float(MODEL.get("anomaly_scale", 1)), 1e-6
            )
            anomaly_probability = float(
                np.clip((threshold - raw_score) / scale, 0, 1)
            )

            if anomaly_probability > 0.5:
                reasons.append(
                    "Isolation Forest detected unusual transaction behaviour"
                )

        # SHAP contributions from XGBoost TreeSHAP
        try:
            dmatrix = xgb.DMatrix(
                row,
                feature_names=features
            )
            contributions = model.get_booster().predict(
                dmatrix,
                pred_contribs=True
            )[0]

            for index, feature in enumerate(features):
                value = float(contributions[index])
                if abs(value) > 0.01:
                    direction = "increased" if value > 0 else "reduced"
                    reasons.append(
                        f"SHAP: {feature} {direction} the model score "
                        f"(contribution {value:.3f})"
                    )
        except Exception as shap_error:
            print("SHAP explanation unavailable:", shap_error)
            reasons.append("SHAP explanation unavailable for this prediction")

        # Prototype combination, not a calibrated probability
        final_probability = (
            0.85 * model_probability
            + 0.15 * anomaly_probability
        )

        reasons.insert(
            0,
            f"XGBoost model estimate: {model_probability:.1%}"
        )

        reasons.append(
            "Device, velocity, hour and customer baseline are rule-based signals"
        )

        return (
            float(np.clip(final_probability, 0.01, 0.99)),
            reasons or ["No strong risk signals detected"],
            MODEL.get("version", "payshield-xgb-iforest-v2")
        )

    except Exception as error:
        print("Prediction error:", error)
        return (
            demo_score,
            reasons + ["ML prediction failed; demo rules used"],
            "demo-heuristic-fallback"
        )


def decide(
    p,
    amount,
    budget,
    reasons,
    step_up_cost=8,
    false_block_cost=40,
    verification_success_rate=0.85,
    anomaly_score=None,
):
    budget = int(np.clip(budget, 1, 3))

    step_threshold = {1: 0.42, 2: 0.30, 3: 0.22}[budget]
    block_threshold = 0.78

    conflict = (
        anomaly_score is not None
        and (
            (p < 0.25 and anomaly_score > 0.75)
            or (p > 0.75 and anomaly_score < 0.2)
        )
    )

    if p >= block_threshold and not conflict:
        action = "BLOCK"
    elif p >= step_threshold or conflict:
        action = "STEP-UP"
    else:
        action = "ALLOW"

    expected = {
        "ALLOW": round(p * amount, 2),
        "STEP-UP": round(
            step_up_cost
            + p * (1 - verification_success_rate) * amount,
            2
        ),
        "BLOCK": round(
            (1 - p) * false_block_cost,
            2
        ),
    }

    if conflict:
        reasons = reasons + [
            "Conflicting signals; routed to verification"
        ]

    return {
        "action": action,
        "expected_costs": expected,
        "risk_factors": reasons,
        "policy_note": (
            f"{budget}% friction budget selected; "
            "prototype thresholds are illustrative."
        ),
    }
