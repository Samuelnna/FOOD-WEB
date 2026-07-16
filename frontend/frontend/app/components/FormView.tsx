"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Search, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import LgaHistoryChart from "./LgaHistoryChart";
import LgaClimatePanel from "./LgaClimatePanel";
import {
  fetchPrediction,
  fetchLgaRiskMap,
  fetchLgaHistory,
  PredictionResult,
  LgaRiskMapEntry,
  LgaHistoryPoint,
  FEATURE_LABELS,
  PHASE_COLORS,
  PHASE_TEXT_COLOR,
  Lang,
  UI_TEXT,
} from "../lib/api";

const DEFAULT_VALUES = {
  lga_name: "",
  ndvi_mean_6m: 0.4,
  rainfall_sum_6m: 400,
  lst_mean_6m: 30,
  nightlight_mean_6m: 0.5,
  ndvi_anomaly_6m: 0,
  rainfall_anomaly_6m: 0,
  ndvi_mean_3m: 0.4,
  rainfall_sum_3m: 200,
  conflict_events_6m: 0,
  conflict_fatalities_6m: 0,
  population: 200000,
  current_phase_class: 2,
  prev_projected_phase: 2,
};

export default function FormView({ lang = "en" }: { lang?: Lang }) {
  const t = UI_TEXT[lang];
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<LgaHistoryPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lgaList, setLgaList] = useState<LgaRiskMapEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGid, setSelectedGid] = useState<string>("");
  const [mode, setMode] = useState<"lookup" | "manual">("lookup");
  const resultRef = useRef<HTMLDivElement | null>(null);

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

  // If the person switches language while a result is already showing,
  // re-fetch just the translated text instead of leaving it stuck in
  // whatever language was selected at the time.
  useEffect(() => {
    if (!result) return;
    setLoading(true);
    fetchPrediction({ ...values, lang })
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
    if (selectedGid) {
      fetchLgaHistory(selectedGid, lang)
        .then((res) => setHistory(res.history))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function selectLga(entry: any) {
    setSelectedGid(entry.gid_2);
    const newValues = {
      lga_name: `${entry.lga}, ${entry.state}`,
      ndvi_mean_6m: entry.ndvi_mean_6m,
      rainfall_sum_6m: entry.rainfall_sum_6m,
      lst_mean_6m: entry.lst_mean_6m,
      nightlight_mean_6m: entry.nightlight_mean_6m,
      ndvi_anomaly_6m: entry.ndvi_anomaly_6m,
      rainfall_anomaly_6m: entry.rainfall_anomaly_6m,
      ndvi_mean_3m: entry.ndvi_mean_3m,
      rainfall_sum_3m: entry.rainfall_sum_3m,
      conflict_events_6m: entry.conflict_events_6m,
      conflict_fatalities_6m: entry.conflict_fatalities_6m,
      population: entry.population,
      current_phase_class: entry.current_phase_class,
      prev_projected_phase: entry.prev_projected_phase,
    };
    setValues(newValues);
    setResult(null);
    setHistory(null);
    setError(null);

    // Selecting an LGA should feel immediate -- predict right away instead
    // of making the person scroll down, find the submit button, click it,
    // then scroll again to see the answer.
    setLoading(true);
    try {
      const [res, historyRes] = await Promise.all([
        fetchPrediction({ ...newValues, lang }),
        fetchLgaHistory(entry.gid_2, lang).catch(() => null),
      ]);
      setResult(res);
      if (historyRes) setHistory(historyRes.history);
      // Jump straight to the result -- this matters most on mobile, where
      // the result panel sits below a tall list of LGAs and would otherwise
      // be invisible until the person scrolls down on their own.
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e: any) {
      setError(e.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
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
      const res = await fetchPrediction({ ...values, lang });
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

  const selectedExerciseYear = (
    lgaList.find((l: any) => l.gid_2 === selectedGid) as any
  )?.exercise_year;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:max-w-md space-y-4">
        <div
          className="flex gap-2 text-sm p-1 bg-gray-100 rounded-full w-fit"
          role="tablist"
          aria-label="Prediction mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "lookup"}
            onClick={() => setMode("lookup")}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              mode === "lookup"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.findMyLga}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "manual"}
            onClick={() => setMode("manual")}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              mode === "manual"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.manualWhatIf}
          </button>
        </div>

        {mode === "lookup" && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Search for your LGA to auto-fill its latest real satellite and
              conflict data — no need to know any numbers yourself.
            </p>
            <div className="relative">
              <Search
                className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
              {filteredLgas.length === 0 && (
                <p className="text-sm text-gray-500 p-3">
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
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                    selectedGid === entry.gid_2 ? "bg-gray-100" : ""
                  }`}
                >
                  <span className="font-medium text-gray-900">{entry.lga}</span>
                  <span className="text-gray-500">, {entry.state}</span>
                </button>
              ))}
            </div>
            {selectedGid && (
              <p className="text-sm text-green-700 flex items-start gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Loaded real data for {values.lga_name}, from the{" "}
                  {selectedExerciseYear} assessment period.
                </span>
              </p>
            )}
          </div>
        )}

        {mode === "manual" && (
          <p className="text-sm text-gray-600">
            Enter values manually to test a hypothetical scenario (e.g. &ldquo;what
            if rainfall drops by half&rdquo;).
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            ))}

          {mode === "manual" && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {loading ? "Predicting…" : "Predict risk"}
            </button>
          )}
          {mode === "lookup" && !selectedGid && (
            <p className="text-xs text-gray-500">
              {t.selectLgaHint}
            </p>
          )}
          {mode === "lookup" && loading && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              {t.gettingPrediction}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>
      </div>

      <div
        ref={resultRef}
        className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5 h-fit scroll-mt-4"
      >
        {!result && !loading && (
          <p className="text-sm text-gray-600">
            {mode === "lookup"
              ? t.selectLgaAutoHint
              : t.fillValuesHint}
          </p>
        )}

        {loading && !result && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Getting prediction…
          </div>
        )}

        {result && (
          <div className="space-y-5">
            <h3 className="font-semibold text-base sm:text-lg text-gray-900 wrap-break-word">
              {result.lga_name || "Result"}
            </h3>

            <div>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor:
                    PHASE_COLORS[result.phase_prediction.phase_label],
                  color: PHASE_TEXT_COLOR,
                }}
              >
                {result.phase_prediction.phase_label_translated} (
                {t.phaseWord} {result.phase_prediction.phase_number})
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 leading-relaxed">
                {result.narrative}
              </p>
            </div>

            {history && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1.5">
                  {t.riskOverTime}
                </p>
                <LgaHistoryChart history={history} lang={lang} />
              </div>
            )}

            {mode === "lookup" && selectedGid && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {t.climateConditions}
                </p>
                <LgaClimatePanel gid2={selectedGid} lang={lang} />
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">
                {t.crisisProb}
              </p>
              <p className="text-sm text-gray-800 flex items-center gap-1.5">
                {result.crisis_plus_prediction.is_crisis && (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                )}
                {result.crisis_plus_prediction.is_crisis ? t.crisisFlagged : t.crisisOk}
                {" — "}
                {(result.crisis_plus_prediction.crisis_probability * 100).toFixed(1)}%
                <span className="text-gray-500">
                  {" "}
                  (±{(result.crisis_plus_prediction.crisis_uncertainty * 100).toFixed(1)} pts)
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t.uncertaintyNote}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">
                {t.phaseProbabilities}
              </p>
              <ul className="text-sm space-y-2">
                {Object.entries(result.phase_prediction.probabilities).map(
                  ([label, prob]) => {
                    const uncertainty =
                      result.phase_prediction.probability_uncertainty[label] ?? 0;
                    const idx = ["Minimal", "Stressed", "Crisis", "Emergency"].indexOf(label);
                    const displayLabel =
                      result.phase_prediction.phase_labels_translated?.[idx] ?? label;
                    return (
                      <li key={label}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-gray-600">{displayLabel}</span>
                          <span className="text-gray-900 font-medium">
                            {(prob * 100).toFixed(1)}%{" "}
                            <span className="text-gray-500 font-normal">
                              (±{(uncertainty * 100).toFixed(1)})
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(prob * 100, 100)}%`,
                              backgroundColor: PHASE_COLORS[label],
                            }}
                          />
                        </div>
                      </li>
                    );
                  }
                )}
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">
                {t.topFactors}
              </p>
              <ul className="text-sm space-y-1.5">
                {result.phase_prediction.top_factors.map((f) => (
                  <li key={f.feature} className="flex justify-between items-start gap-3">
                    <span className="text-gray-600">
                      {FEATURE_LABELS[f.feature] || f.feature}
                    </span>
                    <span
                      className={`shrink-0 font-medium ${
                        f.shap_value > 0 ? "text-red-700" : "text-green-700"
                      }`}
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