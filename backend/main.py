"""
FastAPI backend serving the famine risk models.

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
import glob

app = FastAPI(title="Famine Risk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your actual frontend URL before going live
    allow_methods=["*"],
    allow_headers=["*"],
)

FEATURE_COLS = [
    "ndvi_mean_6m", "rainfall_sum_6m", "lst_mean_6m", "nightlight_mean_6m",
    "ndvi_anomaly_6m", "rainfall_anomaly_6m",
    "ndvi_mean_3m", "rainfall_sum_3m",
    "conflict_events_6m", "conflict_fatalities_6m",
    "population", "current_phase_class", "prev_projected_phase",
]

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
PHASE_LABELS = {0: "Minimal", 1: "Stressed", 2: "Crisis", 3: "Emergency"}

# --- Multi-language support ---
# NOTE: these translations were produced as a good-faith effort and kept
# deliberately short/simple to reduce the risk of grammatical errors, but
# they have NOT been reviewed by a native speaker. Given this information
# could genuinely influence real decisions, a native-speaker review is
# strongly recommended before this is relied on in the field.

PHASE_LABELS_I18N = {
    "en": {0: "Minimal", 1: "Stressed", 2: "Crisis", 3: "Emergency"},
    "yo": {0: "Kere", 1: "Inira", 2: "Idaamu", 3: "Pajawiri"},
    "ha": {0: "Karami", 1: "Matsin lamba", 2: "Rikici", 3: "Gaggawa"},
    "ig": {0: "Ntakiri", 1: "Nsogbu", 2: "Nsogbu Ukwu", 3: "Ihe Mberede"},
}

UI_STRINGS_I18N = {
    "en": {
        "crisis_flagged": "Flagged",
        "crisis_ok": "OK",
        "probability": "probability",
        "main_factors": "The main factors behind this forecast",
    },
    "yo": {
        "crisis_flagged": "A ti samisi re",
        "crisis_ok": "O dara",
        "probability": "iṣeeṣe",
        "main_factors": "Awọn idi pataki fun asọtẹlẹ yii ni",
    },
    "ha": {
        "crisis_flagged": "An yiwa alama",
        "crisis_ok": "Lafiya",
        "probability": "yiwuwa",
        "main_factors": "Manyan dalilan da suka jawo wannan hasashen sun hada da",
    },
    "ig": {
        "crisis_flagged": "Akaraka",
        "crisis_ok": "Ọ dị mma",
        "probability": "ohere",
        "main_factors": "Isi ihe kpatara amụma a bụ",
    },
}


def describe_factor_i18n(feature, value, shap_value, lang):
    """Translated version of describe_factor. Falls back to English if a
    translation is missing for a given feature."""
    phase_name = lambda v: PHASE_LABELS_I18N.get(lang, PHASE_LABELS_I18N["en"]).get(int(round(v)) - 1, "?")

    if lang == "yo":
        if feature == "current_phase_class":
            return f"ipo agbegbe yii ni ayewo to kẹhin je {phase_name(value)}, eyi to n ni ipa nla lori asọtẹlẹ yii"
        if feature == "prev_projected_phase":
            return f"ni ayewo meji seyin, agbegbe yii wa ni {phase_name(value)}"
        if feature == "rainfall_anomaly_6m":
            return f"ojo ti ro ni osu mefa seyin je {abs(value):.0f}mm {'ju' if value > 0 else 'kere'} bi o se yẹ fun asiko yii"
        if feature == "ndvi_anomaly_6m":
            return f"ilera ewe/ohun ọgbin {'dara ju' if value > 0 else 'buru ju'} bi o se yẹ fun asiko yii"
        if feature == "conflict_events_6m":
            return "ko si ija ti a royin nitosi ni osu mefa seyin" if value == 0 else f"ija {int(value)} ni a royin ni osu mefa seyin"
        if feature == "conflict_fatalities_6m":
            return "ko si iku lati ija ti a royin" if value == 0 else f"iku {int(value)} lati ija ni a royin"
        if feature == "nightlight_mean_6m":
            return "iṣe owo ni oru dabi eyi to peye" if 0.2 <= value <= 1 else ("iṣe owo ni oru ga" if value > 1 else "iṣe owo ni oru kere")
        if feature == "lst_mean_6m":
            return f"iwọn otutu ile ni osu mefa seyin je {value:.1f}°C"
        if feature == "ndvi_mean_6m":
            return f"ilera ewe/ohun ọgbin ni osu mefa seyin je {value:.2f}"
        if feature == "rainfall_sum_6m":
            return f"apapọ ojo ni osu mefa seyin je {value:.0f}mm"
        if feature == "population":
            return f"agbegbe yii ni to {int(value):,} eniyan"
        return f"{feature}"

    if lang == "ha":
        if feature == "current_phase_class":
            return f"matsayin wannan yanki a bincike na baya-bayan nan shine {phase_name(value)}, wanda ke da tasiri sosai a wannan hasashen"
        if feature == "prev_projected_phase":
            return f"a bincike biyu da suka gabata, wannan yanki yana {phase_name(value)}"
        if feature == "rainfall_anomaly_6m":
            return f"ruwan sama a cikin watanni shida da suka gabata ya kasance {abs(value):.0f}mm {'sama' if value > 0 else 'kasa'} da yadda ake tsammani a wannan lokacin"
        if feature == "ndvi_anomaly_6m":
            return f"lafiyar tsirrai ta kasance {'mafi kyau' if value > 0 else 'mafi muni'} fiye da yadda ake tsammani"
        if feature == "conflict_events_6m":
            return "babu rikici da aka samu kusa a cikin watanni shida da suka gabata" if value == 0 else f"an samu rikici {int(value)} a cikin watanni shida da suka gabata"
        if feature == "conflict_fatalities_6m":
            return "babu mutuwar da ta faru sakamakon rikici" if value == 0 else f"an samu mutuwar {int(value)} sakamakon rikici"
        if feature == "nightlight_mean_6m":
            return "ayyukan tattalin arziki da dare suna kama da na yau da kullun" if 0.2 <= value <= 1 else ("ayyukan tattalin arziki da dare sun karu" if value > 1 else "ayyukan tattalin arziki da dare sun ragu")
        if feature == "lst_mean_6m":
            return f"matsakaicin zafin kasa a cikin watanni shida da suka gabata shine {value:.1f}°C"
        if feature == "ndvi_mean_6m":
            return f"lafiyar tsirrai a cikin watanni shida da suka gabata ta kasance {value:.2f}"
        if feature == "rainfall_sum_6m":
            return f"jimlar ruwan sama a cikin watanni shida da suka gabata shine {value:.0f}mm"
        if feature == "population":
            return f"wannan yanki yana da mutane kusan {int(value):,}"
        return f"{feature}"

    if lang == "ig":
        if feature == "current_phase_class":
            return f"ọnọdụ mpaghara a na nyocha ikpeazụ bụ {phase_name(value)}, nke na-emetụta amụma a nke ukwuu"
        if feature == "prev_projected_phase":
            return f"na nyocha abụọ gara aga, mpaghara a nọ na {phase_name(value)}"
        if feature == "rainfall_anomaly_6m":
            return f"mmiri ozuzo n'ime ọnwa isii gara aga bụ {abs(value):.0f}mm {'karịa' if value > 0 else 'erughị'} ka a na-atụ anya n'oge a"
        if feature == "ndvi_anomaly_6m":
            return f"ahụike ihe ọkụkụ {'ka mma' if value > 0 else 'ka njọ'} karịa ka a na-atụ anya"
        if feature == "conflict_events_6m":
            return "enweghị esemokwu e chọpụtara n'ime ọnwa isii gara aga" if value == 0 else f"e nwere esemokwu {int(value)} n'ime ọnwa isii gara aga"
        if feature == "conflict_fatalities_6m":
            return "enweghị ọnwụ sitere na esemokwu" if value == 0 else f"e nwere ọnwụ {int(value)} sitere na esemokwu"
        if feature == "nightlight_mean_6m":
            return "ọrụ akụ na ụba n'abalị dị ka nkịtị" if 0.2 <= value <= 1 else ("ọrụ akụ na ụba n'abalị dị elu" if value > 1 else "ọrụ akụ na ụba n'abalị dị ala")
        if feature == "lst_mean_6m":
            return f"okpomọkụ ala n'ime ọnwa isii gara aga bụ {value:.1f}°C"
        if feature == "ndvi_mean_6m":
            return f"ahụike ihe ọkụkụ n'ime ọnwa isii gara aga bụ {value:.2f}"
        if feature == "rainfall_sum_6m":
            return f"mkpokọta mmiri ozuzo n'ime ọnwa isii gara aga bụ {value:.0f}mm"
        if feature == "population":
            return f"mpaghara a nwere ihe dị ka mmadụ {int(value):,}"
        return f"{feature}"

    # English fallback (also the default)
    return describe_factor(feature, value, shap_value)

# --- Load the bootstrap ensembles ---
# Instead of one model per task, we load 15 models each, trained on different
# random resamples of the training data. Running a prediction through all 15
# and looking at how much they disagree gives an honest uncertainty measure --
# if all 15 agree, the model is confident; if they scatter, it isn't, and the
# dashboard should say so rather than presenting one fixed number as if it
# were certain.
def load_ensemble(subfolder):
    paths = sorted(glob.glob(os.path.join(MODEL_DIR, subfolder, "*.json")))
    boosters = []
    for p in paths:
        b = xgb.Booster()
        b.load_model(p)
        boosters.append(b)
    return boosters

phase_ensemble = load_ensemble("ensemble_phase")
crisis_ensemble = load_ensemble("ensemble_crisis")

# Single reference model (first ensemble member) used for SHAP explanations --
# running SHAP across all 15 members would be redundant for the explanation
# text; the ensemble's job is uncertainty, not attribution.
phase_explainer = shap.TreeExplainer(phase_ensemble[0])
crisis_explainer = shap.TreeExplainer(crisis_ensemble[0])

LATEST_FEATURES_PATH = os.path.join(os.path.dirname(__file__), "data", "latest_lga_features_v2.csv")
latest_features_df = pd.read_csv(LATEST_FEATURES_PATH)

# Full historical panel -- real, officially-assessed phase per LGA per past
# assessment cycle. This is what lets the dashboard show an actual trend
# line (not a fabricated one) alongside the one genuine forecast point.
HISTORY_PATH = os.path.join(os.path.dirname(__file__), "data", "lga_history.csv")
history_df = pd.read_csv(HISTORY_PATH)
# a handful of (LGA, period) combos have duplicate entries from source-data
# quirks -- collapse to the worse-case value rather than double-plotting
history_df = history_df.groupby(
    ["GID_2", "exercise_year", "exercise_label", "exercise_order"], as_index=False
)["phase_class"].max()
history_df = history_df.sort_values(["GID_2", "exercise_order"])

# Raw monthly satellite data -- shown directly on the dashboard (not just fed
# into the model) so farmers/NGOs can see the actual underlying conditions,
# not only the model's interpretation of them.
CLIMATE_PATH = os.path.join(os.path.dirname(__file__), "data", "nigeria_satellite_features_clean.csv")
climate_df = pd.read_csv(CLIMATE_PATH)
climate_df["ym"] = climate_df["year"] * 12 + climate_df["month"]


class PredictionInput(BaseModel):
    lga_name: str
    ndvi_mean_6m: float
    rainfall_sum_6m: float
    lst_mean_6m: float
    nightlight_mean_6m: float
    ndvi_anomaly_6m: float
    rainfall_anomaly_6m: float
    ndvi_mean_3m: float
    rainfall_sum_3m: float
    conflict_events_6m: float
    conflict_fatalities_6m: float
    population: float
    current_phase_class: float
    prev_projected_phase: float
    lang: str = "en"  # "en", "yo" (Yoruba), "ha" (Hausa), "ig" (Igbo)


# --- Narrative interpretation ---
# Converts raw feature values + SHAP contributions into a plain-language
# paragraph, so the dashboard shows an actual explanation rather than a table
# of unlabeled numbers. Template-based on purpose (not an LLM call): the
# output needs to be fast, deterministic, and reviewable for a decision
# support tool -- not creatively varied.

def describe_factor(feature, value, shap_value):
    if feature == "current_phase_class":
        return (f"the area's own status at the most recent check was already classified as "
                f"{PHASE_LABELS.get(int(round(value)) - 1, 'Unknown')}, which strongly shapes "
                f"this forecast since conditions rarely shift suddenly without a clear trigger")
    if feature == "prev_projected_phase":
        return f"two assessments ago this area was at {PHASE_LABELS.get(int(round(value)) - 1, 'Unknown')}, showing the recent trend"
    if feature == "rainfall_anomaly_6m":
        return (f"rainfall over the past 6 months was {abs(value):.0f}mm "
                f"{'above' if value > 0 else 'below'} what's typical for this area at this time of year")
    if feature == "ndvi_anomaly_6m":
        return (f"vegetation health was {'better' if value > 0 else 'noticeably worse'} than normal "
                f"for this season (vegetation index {'up' if value > 0 else 'down'} {abs(value):.2f} vs. the usual)")
    if feature == "conflict_events_6m":
        if value == 0:
            return "no conflict events were recorded nearby in the past 6 months"
        return f"{int(value)} conflict event(s) were recorded in the past 6 months"
    if feature == "conflict_fatalities_6m":
        if value == 0:
            return "no conflict-related deaths were recorded in the past 6 months"
        return f"{int(value)} conflict-related deaths were recorded in the past 6 months"
    if feature == "nightlight_mean_6m":
        return f"nighttime economic activity levels are {'elevated' if value > 1 else 'reduced' if value < 0.2 else 'stable'} for this area"
    if feature == "lst_mean_6m":
        return f"average land temperature over the past 6 months was {value:.1f}\u00b0C"
    if feature == "ndvi_mean_6m":
        return f"overall vegetation health over the past 6 months averaged {value:.2f} on the standard vegetation scale"
    if feature == "rainfall_sum_6m":
        return f"total rainfall over the past 6 months was {value:.0f}mm"
    if feature == "population":
        return f"this is a {'densely' if value > 500000 else 'moderately' if value > 150000 else 'sparsely'} populated area (about {int(value):,} people)"
    return f"{feature} contributed to this prediction"


INTRO_TEMPLATES_I18N = {
    "en": {
        "forecast_at": "This area is currently forecast at {phase_label} (Phase {phase_number})",
        "crisis_yes": ", and has been flagged as heading toward crisis-level food insecurity ({pct}% {prob_word}, \u00b1{unc} percentage points).",
        "crisis_no": ", and is not currently flagged as heading toward crisis ({pct}% {prob_word}, \u00b1{unc} percentage points).",
    },
    "yo": {
        "forecast_at": "A ti sọtẹlẹ pe agbegbe yii yoo wa ni {phase_label} (Ipele {phase_number})",
        "crisis_yes": ", a si ti samisi re bi eyi to le buru si idaamu ounje ({pct}% {prob_word}, \u00b1{unc} ipele).",
        "crisis_no": ", a ko si samisi re bi eyi to le buru si idaamu ounje bayii ({pct}% {prob_word}, \u00b1{unc} ipele).",
    },
    "ha": {
        "forecast_at": "An yi hasashen wannan yanki zai kai {phase_label} (Mataki {phase_number})",
        "crisis_yes": ", kuma an yiwa alama a matsayin mai zuwa ga rikicin abinci ({pct}% {prob_word}, \u00b1{unc} maki).",
        "crisis_no": ", kuma ba a yiwa alama a matsayin mai zuwa ga rikici ba a yanzu ({pct}% {prob_word}, \u00b1{unc} maki).",
    },
    "ig": {
        "forecast_at": "A na-ebu amụma na mpaghara a ga-abụ {phase_label} (Ọkwa {phase_number})",
        "crisis_yes": ", akaraka ka ọ na-aga n'ihu na nsogbu nri ukwuu ({pct}% {prob_word}, \u00b1{unc} akara).",
        "crisis_no": ", akaraghị ya ka ọ na-aga n'ihu na nsogbu ugbu a ({pct}% {prob_word}, \u00b1{unc} akara).",
    },
}


def build_narrative(phase_label, phase_number, is_crisis, crisis_prob, crisis_uncertainty, top_factors, feature_values, lang="en"):
    templates = INTRO_TEMPLATES_I18N.get(lang, INTRO_TEMPLATES_I18N["en"])
    ui = UI_STRINGS_I18N.get(lang, UI_STRINGS_I18N["en"])
    translated_phase_label = PHASE_LABELS_I18N.get(lang, PHASE_LABELS_I18N["en"])[phase_number - 1]

    intro = templates["forecast_at"].format(phase_label=translated_phase_label, phase_number=phase_number)
    intro += (templates["crisis_yes"] if is_crisis else templates["crisis_no"]).format(
        pct=f"{crisis_prob*100:.0f}", prob_word=ui["probability"], unc=f"{crisis_uncertainty*100:.0f}"
    )

    sentences = []
    for f in top_factors[:3]:
        val = feature_values.get(f["feature"])
        if val is None:
            continue
        sentences.append(describe_factor_i18n(f["feature"], val, f["shap_value"], lang))

    body = (ui["main_factors"] + ": " + "; ".join(sentences) + ".") if sentences else ""
    return (intro + " " + body).strip()


def ensemble_predict_phase(dmat, X_df):
    """Returns mean probabilities (n,4), std (n,4), and per-row predicted class."""
    all_probs = np.array([m.predict(dmat) for m in phase_ensemble])  # (15, n, 4)
    mean_probs = all_probs.mean(axis=0)
    std_probs = all_probs.std(axis=0)
    pred_class = np.argmax(mean_probs, axis=1)
    return mean_probs, std_probs, pred_class


def ensemble_predict_crisis(dmat):
    all_probs = np.array([m.predict(dmat) for m in crisis_ensemble])  # (15, n)
    mean_probs = all_probs.mean(axis=0)
    std_probs = all_probs.std(axis=0)
    pred_class = (mean_probs >= 0.5).astype(int)
    return mean_probs, std_probs, pred_class


@app.get("/")
def root():
    return {"status": "ok", "message": "Famine Risk API is running"}


@app.get("/lga_climate/{gid_2}")
def lga_climate(gid_2: str, months: int = 24):
    """
    Returns the last N months of real satellite readings for this LGA --
    vegetation health, rainfall, temperature, nighttime lights. This is the
    actual underlying data, shown directly, not filtered through the model's
    interpretation of it.
    """
    sub = climate_df[climate_df["GID_2"] == gid_2].sort_values("ym")
    if sub.empty:
        return {"gid_2": gid_2, "climate": []}

    sub = sub.tail(months)
    points = []
    for _, row in sub.iterrows():
        points.append({
            "period": f"{int(row['year'])}-{int(row['month']):02d}",
            "ndvi": round(float(row["ndvi"]), 3),
            "rainfall_mm": round(float(row["rainfall_mm"]), 1),
            "lst_c": round(float(row["lst_c"]), 1) if pd.notna(row["lst_c"]) else None,
            "nightlight": round(float(row["nightlight"]), 3),
        })
    return {"gid_2": gid_2, "climate": points}


@app.get("/lga_history/{gid_2}")
def lga_history(gid_2: str, lang: str = "en"):
    """
    Returns this LGA's REAL historical phase at every past assessment cycle,
    plus one final genuine forecast point (from the ensemble, with its real
    uncertainty). Everything except the last point is actual officially-
    assessed history -- nothing here is a fabricated month-by-month curve.
    """
    lang_labels = PHASE_LABELS_I18N.get(lang, PHASE_LABELS_I18N["en"])
    hist = history_df[history_df["GID_2"] == gid_2].copy()
    points = []
    for _, row in hist.iterrows():
        points.append({
            "period": f"{int(row['exercise_year'])} {row['exercise_label']}",
            "phase_number": int(row["phase_class"]),
            "phase_label": PHASE_LABELS[int(row["phase_class"]) - 1],
            "phase_label_translated": lang_labels[int(row["phase_class"]) - 1],
            "is_forecast": False,
        })

    # Genuine forecast point using this LGA's latest known features
    latest_row = latest_features_df[latest_features_df["GID_2"] == gid_2]
    if not latest_row.empty:
        row_df = latest_row[FEATURE_COLS]
        dmat = xgb.DMatrix(row_df, feature_names=FEATURE_COLS)
        phase_mean, phase_std, phase_pred_arr = ensemble_predict_phase(dmat, row_df)
        pred_class = int(phase_pred_arr[0])
        points.append({
            "period": "Next assessment (forecast)",
            "phase_number": pred_class + 1,
            "phase_label": PHASE_LABELS[pred_class],
            "phase_label_translated": lang_labels[pred_class],
            "is_forecast": True,
            "uncertainty": round(float(phase_std[0][pred_class]), 3),
        })

    return {"gid_2": gid_2, "history": points}


@app.get("/lga_risk_map")
def lga_risk_map():
    """
    Returns risk predictions for every LGA that has a recent CH assessment,
    scored in one batch (fast) rather than one API call per LGA. This is what
    the map view calls on load to color all ~568 LGAs at once.
    """
    df = latest_features_df.copy()
    dmat = xgb.DMatrix(df[FEATURE_COLS], feature_names=FEATURE_COLS)

    phase_mean, phase_std, phase_pred_all = ensemble_predict_phase(dmat, df[FEATURE_COLS])
    crisis_mean, crisis_std, crisis_pred_all = ensemble_predict_crisis(dmat)

    results = []
    for i, row in df.iterrows():
        results.append({
            "gid_2": row["GID_2"],
            "state": row["state"],
            "lga": row["lga"],
            "phase_number": int(phase_pred_all[i]) + 1,
            "phase_label": PHASE_LABELS[int(phase_pred_all[i])],
            "is_crisis": bool(crisis_pred_all[i]),
            "crisis_probability": round(float(crisis_mean[i]), 3),
            "crisis_uncertainty": round(float(crisis_std[i]), 3),
            "exercise_year": int(row["exercise_year"]),
            **{col: float(row[col]) for col in FEATURE_COLS},
        })

    return {"count": len(results), "lgas": results}


@app.post("/predict")
def predict(input_data: PredictionInput):
    row_df = pd.DataFrame([{col: getattr(input_data, col) for col in FEATURE_COLS}])
    dmat = xgb.DMatrix(row_df, feature_names=FEATURE_COLS)
    feature_values = {col: getattr(input_data, col) for col in FEATURE_COLS}

    # --- Phase prediction (ensemble mean + uncertainty) ---
    phase_mean, phase_std, phase_pred_arr = ensemble_predict_phase(dmat, row_df)
    phase_pred = int(phase_pred_arr[0])

    phase_shap = phase_explainer.shap_values(row_df)
    if isinstance(phase_shap, list):
        phase_contrib_vals = phase_shap[phase_pred][0]
    else:
        phase_contrib_vals = phase_shap[0][:, phase_pred]
    phase_contributions = pd.Series(phase_contrib_vals, index=FEATURE_COLS).sort_values(
        key=abs, ascending=False
    )
    phase_top_factors = [
        {"feature": feat, "shap_value": round(float(val), 4)}
        for feat, val in phase_contributions.head(5).items()
    ]

    # --- Crisis+ prediction (ensemble mean + uncertainty) ---
    crisis_mean, crisis_std, crisis_pred_arr = ensemble_predict_crisis(dmat)
    crisis_pred = int(crisis_pred_arr[0])
    crisis_proba = float(crisis_mean[0])
    crisis_uncertainty = float(crisis_std[0])

    crisis_shap = crisis_explainer.shap_values(row_df)
    crisis_contrib_vals = crisis_shap[0] if crisis_shap.ndim == 2 else crisis_shap
    crisis_contributions = pd.Series(crisis_contrib_vals, index=FEATURE_COLS).sort_values(
        key=abs, ascending=False
    )
    crisis_top_factors = [
        {"feature": feat, "shap_value": round(float(val), 4)}
        for feat, val in crisis_contributions.head(5).items()
    ]

    narrative = build_narrative(
        phase_label=PHASE_LABELS[phase_pred],
        phase_number=phase_pred + 1,
        is_crisis=bool(crisis_pred),
        crisis_prob=crisis_proba,
        crisis_uncertainty=crisis_uncertainty,
        top_factors=phase_top_factors,
        feature_values=feature_values,
        lang=input_data.lang,
    )

    lang_labels = PHASE_LABELS_I18N.get(input_data.lang, PHASE_LABELS_I18N["en"])

    return {
        "lga_name": input_data.lga_name,
        "narrative": narrative,
        "phase_prediction": {
            "phase_number": phase_pred + 1,
            # English label is kept as the canonical key -- the frontend
            # matches this against a fixed color map, so it must not change
            # with language. Translated text for display goes in a
            # separate field instead.
            "phase_label": PHASE_LABELS[phase_pred],
            "phase_label_translated": lang_labels[phase_pred],
            "probabilities": {
                PHASE_LABELS[i]: round(float(p), 3) for i, p in enumerate(phase_mean[0])
            },
            "probability_uncertainty": {
                PHASE_LABELS[i]: round(float(s), 3) for i, s in enumerate(phase_std[0])
            },
            "phase_labels_translated": lang_labels,
            "top_factors": phase_top_factors,
        },
        "crisis_plus_prediction": {
            "is_crisis": bool(crisis_pred),
            "crisis_probability": round(crisis_proba, 3),
            "crisis_uncertainty": round(crisis_uncertainty, 3),
            "top_factors": crisis_top_factors,
        },
    }