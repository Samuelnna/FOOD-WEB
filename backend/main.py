"""
FastAPI backend serving the AiDanna famine risk models.

Run locally in the Codespace with:
    pip install -r requirements.txt
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Then Codespaces will prompt you to open a forwarded port in the browser --
that's your live API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import xgboost as xgb
import shap
import numpy as np
import pandas as pd
import os

app = FastAPI(title="AiDanna Famine Risk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your actual frontend URL before going live
    allow_methods=["*"],
    allow_headers=["*"],
)

FEATURE_COLS = [
    "ndvi_mean_6m", "rainfall_sum_6m", "lst_mean_6m", "nightlight_mean_6m",
    "ndvi_mean_3m", "rainfall_sum_3m",
    "conflict_events_6m", "conflict_fatalities_6m",
    "population",
]

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# NOTE: we load raw xgb.Booster objects here, not the XGBClassifier sklearn
# wrapper. XGBClassifier.load_model() on a freshly instantiated classifier
# hits a known bug in xgboost==2.1.1 ("_estimator_type undefined") when the
# model wasn't just produced by the same in-memory .fit() call. Booster
# loading sidesteps that entirely and is what we actually want for a
# deployed API anyway -- fewer sklearn-side assumptions, same predictions.
phase_booster = xgb.Booster()
phase_booster.load_model(os.path.join(MODEL_DIR, "famine_risk_model.json"))

crisis_booster = xgb.Booster()
crisis_booster.load_model(os.path.join(MODEL_DIR, "crisis_plus_model.json"))

phase_explainer = shap.TreeExplainer(phase_booster)
crisis_explainer = shap.TreeExplainer(crisis_booster)

PHASE_LABELS = {0: "Minimal", 1: "Stressed", 2: "Crisis", 3: "Emergency"}

LATEST_FEATURES_PATH = os.path.join(os.path.dirname(__file__), "data", "latest_lga_features_named.csv")
latest_features_df = pd.read_csv(LATEST_FEATURES_PATH)


class PredictionInput(BaseModel):
    lga_name: str
    ndvi_mean_6m: float
    rainfall_sum_6m: float
    lst_mean_6m: float
    nightlight_mean_6m: float
    ndvi_mean_3m: float
    rainfall_sum_3m: float
    conflict_events_6m: float
    conflict_fatalities_6m: float
    population: float


@app.get("/")
def root():
    return {"status": "ok", "message": "AiDanna Famine Risk API is running"}


@app.get("/lga_risk_map")
def lga_risk_map():
    """
    Returns risk predictions for every LGA that has a recent CH assessment,
    scored in one batch (fast) rather than one API call per LGA. This is what
    the map view calls on load to color all ~568 LGAs at once.
    """
    df = latest_features_df.copy()
    dmat = xgb.DMatrix(df[FEATURE_COLS], feature_names=FEATURE_COLS)

    phase_proba_all = phase_booster.predict(dmat)  # shape (n, 4)
    phase_pred_all = np.argmax(phase_proba_all, axis=1)

    crisis_proba_all = crisis_booster.predict(dmat)  # shape (n,)
    crisis_pred_all = (crisis_proba_all >= 0.5).astype(int)

    results = []
    for i, row in df.iterrows():
        results.append({
            "gid_2": row["GID_2"],
            "state": row["state"],
            "lga": row["lga"],
            "phase_number": int(phase_pred_all[i]) + 1,
            "phase_label": PHASE_LABELS[int(phase_pred_all[i])],
            "is_crisis": bool(crisis_pred_all[i]),
            "crisis_probability": round(float(crisis_proba_all[i]), 3),
            "exercise_year": int(row["exercise_year"]),
            **{col: float(row[col]) for col in FEATURE_COLS},
        })

    return {"count": len(results), "lgas": results}


@app.post("/predict")
def predict(input_data: PredictionInput):
    row_df = pd.DataFrame([{col: getattr(input_data, col) for col in FEATURE_COLS}])
    dmat = xgb.DMatrix(row_df, feature_names=FEATURE_COLS)

    # --- Phase prediction (4-class, multi:softprob) ---
    phase_proba = phase_booster.predict(dmat)[0]  # array of 4 probabilities
    phase_pred = int(np.argmax(phase_proba))

    phase_shap = phase_explainer.shap_values(row_df)
    # shap_values for multiclass booster: shape (1, n_features, n_classes) or list of arrays
    if isinstance(phase_shap, list):
        phase_contrib_vals = phase_shap[phase_pred][0]
    else:
        phase_contrib_vals = phase_shap[0][:, phase_pred]
    phase_contributions = pd.Series(phase_contrib_vals, index=FEATURE_COLS).sort_values(
        key=abs, ascending=False
    )

    # --- Crisis+ prediction (binary, binary:logistic) ---
    crisis_proba = float(crisis_booster.predict(dmat)[0])  # single probability
    crisis_pred = int(crisis_proba >= 0.5)

    crisis_shap = crisis_explainer.shap_values(row_df)
    crisis_contrib_vals = crisis_shap[0] if crisis_shap.ndim == 2 else crisis_shap
    crisis_contributions = pd.Series(crisis_contrib_vals, index=FEATURE_COLS).sort_values(
        key=abs, ascending=False
    )

    return {
        "lga_name": input_data.lga_name,
        "phase_prediction": {
            "phase_number": phase_pred + 1,
            "phase_label": PHASE_LABELS[phase_pred],
            "probabilities": {
                PHASE_LABELS[i]: round(float(p), 3) for i, p in enumerate(phase_proba)
            },
            "top_factors": [
                {"feature": feat, "shap_value": round(float(val), 4)}
                for feat, val in phase_contributions.head(5).items()
            ],
        },
        "crisis_plus_prediction": {
            "is_crisis": bool(crisis_pred),
            "crisis_probability": round(crisis_proba, 3),
            "top_factors": [
                {"feature": feat, "shap_value": round(float(val), 4)}
                for feat, val in crisis_contributions. head(5).items()
            ],
        },
    }