// Change this to your Codespace's forwarded backend URL, e.g.
// https://your-codespace-name-8000.app.github.dev
// Set it via an environment variable so it's easy to change without editing code.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type LgaRiskMapEntry = {
  gid_2: string;
  phase_number: number;
  phase_label: string;
  is_crisis: boolean;
  crisis_probability: number;
  exercise_year: number;
  ndvi_mean_6m: number;
  rainfall_sum_6m: number;
  lst_mean_6m: number;
  nightlight_mean_6m: number;
  ndvi_mean_3m: number;
  rainfall_sum_3m: number;
  conflict_events_6m: number;
  conflict_fatalities_6m: number;
  population: number;
};

export type ShapFactor = {
  feature: string;
  shap_value: number;
};

export type PredictionResult = {
  lga_name: string;
  phase_prediction: {
    phase_number: number;
    phase_label: string;
    probabilities: Record<string, number>;
    top_factors: ShapFactor[];
  };
  crisis_plus_prediction: {
    is_crisis: boolean;
    crisis_probability: number;
    top_factors: ShapFactor[];
  };
};

export async function fetchLgaRiskMap(): Promise<{
  count: number;
  lgas: LgaRiskMapEntry[];
}> {
  const res = await fetch(`${API_BASE_URL}/lga_risk_map`);
  if (!res.ok) throw new Error(`Failed to fetch risk map: ${res.status}`);
  return res.json();
}

export async function fetchPrediction(input: {
  lga_name: string;
  ndvi_mean_6m: number;
  rainfall_sum_6m: number;
  lst_mean_6m: number;
  nightlight_mean_6m: number;
  ndvi_mean_3m: number;
  rainfall_sum_3m: number;
  conflict_events_6m: number;
  conflict_fatalities_6m: number;
  population: number;
}): Promise<PredictionResult> {
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Prediction failed: ${res.status}`);
  return res.json();
}

// Friendly readable labels for feature keys, used in SHAP explanation display
export const FEATURE_LABELS: Record<string, string> = {
  ndvi_mean_6m: "Vegetation health (6mo avg)",
  rainfall_sum_6m: "Rainfall (6mo total)",
  lst_mean_6m: "Land surface temp (6mo avg)",
  nightlight_mean_6m: "Nighttime lights (economic activity)",
  ndvi_mean_3m: "Vegetation health (3mo avg)",
  rainfall_sum_3m: "Rainfall (3mo total)",
  conflict_events_6m: "Conflict events (6mo total)",
  conflict_fatalities_6m: "Conflict fatalities (6mo total)",
  population: "Population",
};

export const PHASE_COLORS: Record<string, string> = {
  Minimal: "#4ade80",
  Stressed: "#fde047",
  Crisis: "#fb923c",
  Emergency: "#ef4444",
};