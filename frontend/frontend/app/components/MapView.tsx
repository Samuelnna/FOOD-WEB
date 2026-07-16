"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, PathOptions, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, AlertTriangle, Loader2 } from "lucide-react";
import LgaHistoryChart from "./LgaHistoryChart";
import LgaClimatePanel from "./LgaClimatePanel";
import {
  fetchLgaRiskMap,
  fetchPrediction,
  fetchLgaHistory,
  LgaRiskMapEntry,
  LgaHistoryPoint,
  PredictionResult,
  PHASE_COLORS,
  PHASE_TEXT_COLOR,
  FEATURE_LABELS,
  Lang,
  UI_TEXT,
} from "../lib/api";

type GeoJsonFeature = {
  type: "Feature";
  properties: { GID_2: string; state: string; lga: string };
  geometry: any;
};

export default function MapView({ lang = "en" }: { lang?: Lang }) {
  const t = UI_TEXT[lang];
  const [geoData, setGeoData] = useState<any>(null);
  const [riskByGid, setRiskByGid] = useState<Record<string, LgaRiskMapEntry>>({});
  // Leaflet's GeoJSON layer binds onEachFeature's click handlers ONCE, when
  // the layer is created -- it does not rebind them on re-render. If that
  // happens before riskByGid has loaded, every click handler is permanently
  // stuck looking at an empty object. A ref sidesteps this: the ref's
  // `.current` is always read fresh at click-time, regardless of when the
  // handler closure was originally created.
  const riskByGidRef = useRef<Record<string, LgaRiskMapEntry>>({});

  const [selected, setSelected] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<LgaHistoryPoint[] | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [selectedGid, setSelectedGid] = useState<string>("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const geoJsonRef = useRef<any>(null);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [geoRes, riskRes] = await Promise.all([
          fetch("/nigeria_lgas.geojson").then((r) => r.json()),
          fetchLgaRiskMap(),
        ]);
        const byGid: Record<string, LgaRiskMapEntry> = {};
        riskRes.lgas.forEach((l) => (byGid[l.gid_2] = l));
        // Set the ref BEFORE geoData triggers the GeoJSON layer to mount,
        // so onEachFeature never has a chance to bind against an empty ref.
        riskByGidRef.current = byGid;
        setRiskByGid(byGid);
        setGeoData(geoRes);
      } catch (e: any) {
        setError(e.message || "Failed to load map data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Leaflet sometimes measures its container before the surrounding flex
  // layout has finished settling, especially right after a dynamic import.
  // That leaves it thinking the map is 0px and it renders blank until
  // something (like a window resize) forces a recalculation. Force that
  // recalculation ourselves once the map instance and layout are ready.
  useEffect(() => {
    if (!mapInstance) return;
    const timers = [100, 300, 800].map((delay) =>
      setTimeout(() => mapInstance.invalidateSize(), delay)
    );
    const onResize = () => mapInstance.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
    };
  }, [mapInstance]);

  function styleFeature(feature?: GeoJsonFeature): PathOptions {
    const gid = feature?.properties.GID_2;
    const risk = gid ? riskByGid[gid] : undefined;
    return {
      fillColor: risk ? PHASE_COLORS[risk.phase_label] : "#e5e7eb",
      weight: 1,
      color: "#374151",
      fillOpacity: 0.75,
    };
  }

  // If the person switches language while a prediction is already showing,
  // re-fetch just the translated text rather than leaving it stuck in the
  // previously selected language until their next click.
  useEffect(() => {
    if (!selectedGid) return;
    const risk = riskByGidRef.current[selectedGid];
    if (!risk) return;
    setDetailLoading(true);
    fetchPrediction({
      lga_name: selectedName,
      ndvi_mean_6m: risk.ndvi_mean_6m,
      rainfall_sum_6m: risk.rainfall_sum_6m,
      lst_mean_6m: risk.lst_mean_6m,
      nightlight_mean_6m: risk.nightlight_mean_6m,
      ndvi_anomaly_6m: risk.ndvi_anomaly_6m,
      rainfall_anomaly_6m: risk.rainfall_anomaly_6m,
      ndvi_mean_3m: risk.ndvi_mean_3m,
      rainfall_sum_3m: risk.rainfall_sum_3m,
      conflict_events_6m: risk.conflict_events_6m,
      conflict_fatalities_6m: risk.conflict_fatalities_6m,
      population: risk.population,
      current_phase_class: risk.current_phase_class,
      prev_projected_phase: risk.prev_projected_phase,
      lang,
    })
      .then(setSelected)
      .catch(console.error)
      .finally(() => setDetailLoading(false));
    fetchLgaHistory(selectedGid, lang)
      .then((res) => setHistory(res.history))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function onEachFeature(feature: GeoJsonFeature, layer: Layer) {
    const gid = feature.properties.GID_2;
    const name = `${feature.properties.lga}, ${feature.properties.state}`;
    layer.bindTooltip(name);
    layer.on("click", async () => {
      // Always read the ref's CURRENT value at click-time, never a value
      // captured back when this handler was first created.
      const risk = riskByGidRef.current[gid];
      setSelectedName(name);
      setSelectedGid(gid);
      setSelected(null);
      setHistory(null);
      // On narrow/stacked layouts the panel sits below the map, out of
      // view -- scroll it into view so clicking doesn't look like nothing
      // happened.
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!risk) return;
      setDetailLoading(true);
      try {
        const [result, historyRes] = await Promise.all([
          fetchPrediction({
            lga_name: name,
            ndvi_mean_6m: risk.ndvi_mean_6m,
            rainfall_sum_6m: risk.rainfall_sum_6m,
            lst_mean_6m: risk.lst_mean_6m,
            nightlight_mean_6m: risk.nightlight_mean_6m,
            ndvi_anomaly_6m: risk.ndvi_anomaly_6m,
            rainfall_anomaly_6m: risk.rainfall_anomaly_6m,
            ndvi_mean_3m: risk.ndvi_mean_3m,
            rainfall_sum_3m: risk.rainfall_sum_3m,
            conflict_events_6m: risk.conflict_events_6m,
            conflict_fatalities_6m: risk.conflict_fatalities_6m,
            population: risk.population,
            current_phase_class: risk.current_phase_class,
            prev_projected_phase: risk.prev_projected_phase,
            lang,
          }),
          fetchLgaHistory(gid, lang).catch(() => null),
        ]);
        setSelected(result);
        if (historyRes) setHistory(historyRes.history);
      } catch (e) {
        console.error(e);
      } finally {
        setDetailLoading(false);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-gray-500 text-sm sm:text-base">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Loading map data…
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-12 px-4 text-center text-red-700 bg-red-50 border border-red-200 rounded-lg text-sm sm:text-base">
        Couldn&apos;t load the map: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-1/2 h-72 sm:h-96 md:h-[70vh] rounded-xl overflow-hidden border border-gray-200 shadow-sm shrink-0">
        <MapContainer
          center={[9.082, 8.6753]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
          ref={setMapInstance}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Only mount the GeoJSON layer once risk data has actually
              arrived -- this means onEachFeature's ref is guaranteed
              non-empty from the very first bind, as a second line of
              defense alongside the ref itself. */}
          {geoData && Object.keys(riskByGid).length > 0 && (
            <GeoJSON
              key="nigeria-lga-layer"
              ref={geoJsonRef}
              data={geoData}
              style={styleFeature as any}
              onEachFeature={onEachFeature as any}
            />
          )}
        </MapContainer>
      </div>

      <div
        ref={panelRef}
        className="w-full md:w-1/2 md:h-[70vh] bg-white border-2 border-gray-300 rounded-xl shadow-sm p-4 sm:p-5 overflow-y-auto scroll-mt-4"
      >
        <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span className="wrap-break-word">
            {selectedName || t.clickLga}
          </span>
        </h3>

        {!selectedName && (
          <div className="text-sm text-gray-600 space-y-3">
            <p className="font-medium text-gray-700">{t.legend}</p>
            <div className="space-y-2">
              {Object.entries(PHASE_COLORS).map(([label, color]) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded shrink-0 border border-black/10"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="text-gray-700">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2.5">
                <span
                  className="w-4 h-4 rounded shrink-0 border border-black/10"
                  style={{ backgroundColor: "#e5e7eb" }}
                  aria-hidden="true"
                />
                <span className="text-gray-500">{t.noData}</span>
              </div>
            </div>
            <p className="text-gray-500 pt-2 border-t border-gray-100">
              {t.tapHint}
            </p>
          </div>
        )}

        {detailLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {t.gettingPrediction}
          </div>
        )}

        {selectedName && !detailLoading && !selected && (
          <p className="text-sm text-gray-600">
            {t.noRecentData}
          </p>
        )}

        {selected && !detailLoading && (
          <div className="space-y-5">
            <div>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor:
                    PHASE_COLORS[selected.phase_prediction.phase_label],
                  color: PHASE_TEXT_COLOR,
                }}
              >
                {selected.phase_prediction.phase_label_translated} (
                {t.phaseWord} {selected.phase_prediction.phase_number})
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 leading-relaxed">
                {selected.narrative}
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

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t.climateConditions}
              </p>
              <LgaClimatePanel gid2={selectedGid} lang={lang} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">
                {t.crisisProb}
              </p>
              <p className="text-sm text-gray-800 flex items-center gap-1.5">
                {selected.crisis_plus_prediction.is_crisis && (
                  <AlertTriangle
                    className="w-4 h-4 text-red-600 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {selected.crisis_plus_prediction.is_crisis ? t.crisisFlagged : t.crisisOk}
                {" — "}
                {(selected.crisis_plus_prediction.crisis_probability * 100).toFixed(1)}%
                <span className="text-gray-500">
                  {" "}
                  (±{(selected.crisis_plus_prediction.crisis_uncertainty * 100).toFixed(1)} pts)
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
                {Object.entries(selected.phase_prediction.probabilities).map(
                  ([label, prob]) => {
                    const uncertainty =
                      selected.phase_prediction.probability_uncertainty[label] ?? 0;
                    const idx = ["Minimal", "Stressed", "Crisis", "Emergency"].indexOf(label);
                    const displayLabel =
                      selected.phase_prediction.phase_labels_translated?.[idx] ?? label;
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
                Top contributing factors
              </p>
              <ul className="text-sm space-y-1.5">
                {selected.phase_prediction.top_factors.map((f) => (
                  <li
                    key={f.feature}
                    className="flex justify-between items-start gap-3"
                  >
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