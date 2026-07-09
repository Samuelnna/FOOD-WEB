"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, PathOptions, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  fetchLgaRiskMap,
  fetchPrediction,
  LgaRiskMapEntry,
  PredictionResult,
  PHASE_COLORS,
  FEATURE_LABELS,
} from "../lib/api";

type GeoJsonFeature = {
  type: "Feature";
  properties: { GID_2: string; state: string; lga: string };
  geometry: any;
};

export default function MapView() {
  const [geoData, setGeoData] = useState<any>(null);
  const [riskByGid, setRiskByGid] = useState<Record<string, LgaRiskMapEntry>>({});
  const [selected, setSelected] = useState<PredictionResult | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const geoJsonRef = useRef<any>(null);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [geoRes, riskRes] = await Promise.all([
          fetch("/nigeria_lgas.geojson").then((r) => r.json()),
          fetchLgaRiskMap(),
        ]);
        setGeoData(geoRes);
        const byGid: Record<string, LgaRiskMapEntry> = {};
        riskRes.lgas.forEach((l) => (byGid[l.gid_2] = l));
        setRiskByGid(byGid);
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
      fillColor: risk ? PHASE_COLORS[risk.phase_label] : "#d1d5db",
      weight: 1,
      color: "#374151",
      fillOpacity: 0.75,
    };
  }

  async function onEachFeature(feature: GeoJsonFeature, layer: Layer) {
    const gid = feature.properties.GID_2;
    const name = `${feature.properties.lga}, ${feature.properties.state}`;
    layer.bindTooltip(name);
    layer.on("click", async () => {
      const risk = riskByGid[gid];
      setSelectedName(name);
      if (!risk) {
        setSelected(null);
        return;
      }
      try {
        const result = await fetchPrediction({
          lga_name: name,
          ndvi_mean_6m: risk.ndvi_mean_6m,
          rainfall_sum_6m: risk.rainfall_sum_6m,
          lst_mean_6m: risk.lst_mean_6m,
          nightlight_mean_6m: risk.nightlight_mean_6m,
          ndvi_mean_3m: risk.ndvi_mean_3m,
          rainfall_sum_3m: risk.rainfall_sum_3m,
          conflict_events_6m: risk.conflict_events_6m,
          conflict_fatalities_6m: risk.conflict_fatalities_6m,
          population: risk.population,
        });
        setSelected(result);
      } catch (e) {
        console.error(e);
      }
    });
  }

  if (loading) return <div className="p-6 text-gray-500">Loading map data…</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col gap-4 w-full xl:flex-row">
      <div className="min-h-[480px] flex-1 rounded-lg overflow-hidden border border-gray-200">
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
          {geoData && (
            <GeoJSON
              ref={geoJsonRef}
              data={geoData}
              style={styleFeature as any}
              onEachFeature={onEachFeature as any}
            />
          )}
        </MapContainer>
      </div>

      <div className="w-full xl:w-[360px] max-h-[70vh] bg-white border border-gray-200 rounded-lg p-4 overflow-y-auto">
        <h3 className="font-semibold text-lg mb-2">
          {selectedName || "Click an LGA on the map"}
        </h3>

        {!selectedName && (
          <div className="text-sm text-gray-500 space-y-2">
            <p>Legend:</p>
            {Object.entries(PHASE_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>
            ))}
            <p className="text-gray-400 mt-2">
              Grey LGAs have no recent CH assessment on file.
            </p>
          </div>
        )}

        {selectedName && !selected && (
          <p className="text-sm text-gray-500">
            No recent assessment data available for this LGA.
          </p>
        )}

        {selected && (
          <div className="space-y-4">
            <div>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{
                  backgroundColor:
                    PHASE_COLORS[selected.phase_prediction.phase_label],
                }}
              >
                {selected.phase_prediction.phase_label} (Phase{" "}
                {selected.phase_prediction.phase_number})
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Crisis+ risk
              </p>
              <p className="text-sm">
                {selected.crisis_plus_prediction.is_crisis ? "⚠️ Flagged" : "OK"}{" "}
                — {(selected.crisis_plus_prediction.crisis_probability * 100).toFixed(1)}%
                probability
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Top contributing factors
              </p>
              <ul className="text-sm space-y-1">
                {selected.phase_prediction.top_factors.map((f) => (
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