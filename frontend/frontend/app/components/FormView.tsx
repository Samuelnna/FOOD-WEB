"use client";

import { useEffect, useState, useMemo } from "react";
import {
  fetchPrediction,
  fetchLgaRiskMap,
  PredictionResult,
  LgaRiskMapEntry,
  FEATURE_LABELS,
  PHASE_COLORS,
} from "../lib/api";

const DEFAULT_VALUES = {
  lga_name: "",
  ndvi_mean_6m: 0.4,
  rainfall_sum_6m: 400,
  lst_mean_6m: 30,
  nightlight_mean_6m: 0.5,
  ndvi_mean_3m: 0.4,
  rainfall_sum_3m: 200,
  conflict_events_6m: 0,
  conflict_fatalities_6m: 0,
  population: 200000,
};

export default function FormView() {
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lgaList, setLgaList] = useState<LgaRiskMapEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGid, setSelectedGid] = useState<string>("");
  const [mode, setMode] = useState<"lookup" | "manual">("lookup");

  useEffect(() => {
    fetchLgaRiskMap()
      .then((res) => setLgaList(res.lgas))
      .catch(() => {
        // Non-fatal -- manual entry mode still works without this list
      });
  }, []);

  const filteredLgas = useMemo(() => {
    if (!search.trim()) return lgaList.slice(0, 50);
    const q = search.toLowerCase();
    return lgaList
      .filter(
        (l: any) =>
          l.lga?.toLowerCase().includes(q) || l.state?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [search, lgaList]);

  function selectLga(entry: any) {
    setSelectedGid(entry.gid_2);
    setValues({
      lga_name: `${entry.lga}, ${entry.state}`,
      ndvi_mean_6m: entry.ndvi_mean_6m,
      rainfall_sum_6m: entry.rainfall_sum_6m,
      lst_mean_6m: entry.lst_mean_6m,
      nightlight_mean_6m: entry.nightlight_mean_6m,
      ndvi_mean_3m: entry.ndvi_mean_3m,
      rainfall_sum_3m: entry.rainfall_sum_3m,
      conflict_events_6m: entry.conflict_events_6m,
      conflict_fatalities_6m: entry.conflict_fatalities_6m,
      population: entry.population,
    });
  }

  function update(key: string, val: string) {
    setValues((prev) => ({
      ...prev,
      [key]: key === "lga_name" ? val : parseFloat(val) || 0,
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPrediction(values);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  const numericFields = Object.keys(DEFAULT_VALUES).filter(
    (k) => k !== "lga_name"
  );

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 max-w-md space-y-4">
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMode("lookup")}
            className={`px-3 py-1.5 rounded-full border ${
              mode === "lookup"
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-300 text-gray-600"
            }`}
          >
            Find my LGA
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`px-3 py-1.5 rounded-full border ${
              mode === "manual"
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-300 text-gray-600"
            }`}
          >
            Manual / what-if values
          </button>
        </div>

        {mode === "lookup" && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Search for your LGA to auto-fill its latest real satellite and
              conflict data -- no need to know any numbers yourself.
            </p>
            <input
              type="text"
              placeholder="Search LGA or state name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <div className="border border-gray-200 rounded max-h-64 overflow-y-auto">
              {filteredLgas.length === 0 && (
                <p className="text-sm text-gray-400 p-3">
                  {lgaList.length === 0
                    ? "Loading LGA list…"
                    : "No matches found."}
                </p>
              )}
              {filteredLgas.map((entry: any) => (
                <button
                  key={entry.gid_2}
                  type="button"
                  onClick={() => selectLga(entry)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 hover:bg-gray-50 ${
                    selectedGid === entry.gid_2 ? "bg-gray-100" : ""
                  }`}
                >
                  <span className="font-medium">{entry.lga}</span>
                  <span className="text-gray-500">, {entry.state}</span>
                </button>
              ))}
            </div>
            {selectedGid && (
              <p className="text-sm text-green-700">
                ✓ Loaded real data for {values.lga_name}. Values pulled from
                the {(lgaList.find((l: any) => l.gid_2 === selectedGid) as any)?.exercise_year}{" "}
                assessment period.
              </p>
            )}
          </div>
        )}

        {mode === "manual" && (
          <p className="text-sm text-gray-500">
            Enter values manually to test a hypothetical scenario (e.g. "what
            if rainfall drops by half").
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LGA name (label only)
            </label>
            <input
              type="text"
              placeholder="e.g. Maiduguri, Borno"
              value={values.lga_name}
              onChange={(e) => update("lga_name", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          {mode === "manual" &&
            numericFields.map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {FEATURE_LABELS[key] || key}
                </label>
                <input
                  type="number"
                  step="any"
                  value={(values as any)[key]}
                  onChange={(e) => update(key, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            ))}

          <button
            type="submit"
            disabled={loading || (mode === "lookup" && !selectedGid)}
            className="w-full bg-gray-900 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Predicting…" : "Predict risk"}
          </button>
          {mode === "lookup" && !selectedGid && (
            <p className="text-xs text-gray-400">
              Select an LGA above first.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 h-fit">
        {!result && (
          <p className="text-sm text-gray-500">
            Fill in the values and submit to see a prediction here.
          </p>
        )}

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{result.lga_name || "Result"}</h3>

            <div>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{
                  backgroundColor:
                    PHASE_COLORS[result.phase_prediction.phase_label],
                }}
              >
                {result.phase_prediction.phase_label} (Phase{" "}
                {result.phase_prediction.phase_number})
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Phase probabilities
              </p>
              <ul className="text-sm space-y-1">
                {Object.entries(result.phase_prediction.probabilities).map(
                  ([label, prob]) => (
                    <li key={label} className="flex justify-between">
                      <span className="text-gray-600">{label}</span>
                      <span>{(prob * 100).toFixed(1)}%</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Crisis+ probability
              </p>
              <p className="text-sm">
                {result.crisis_plus_prediction.is_crisis ? "⚠️ Flagged" : "OK"}{" "}
                — {(result.crisis_plus_prediction.crisis_probability * 100).toFixed(1)}%
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Top contributing factors
              </p>
              <ul className="text-sm space-y-1">
                {result.phase_prediction.top_factors.map((f) => (
                  <li key={f.feature} className="flex justify-between">
                    <span className="text-gray-600">
                      {FEATURE_LABELS[f.feature] || f.feature}
                    </span>
                    <span
                      className={
                        f.shap_value > 0 ? "text-red-600" : "text-green-600"
                      }
                    >
                      {f.shap_value > 0 ? "▲" : "▼"} {Math.abs(f.shap_value).toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}