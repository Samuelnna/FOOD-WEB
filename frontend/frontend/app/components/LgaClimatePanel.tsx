"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Droplets, Leaf, Thermometer, Lightbulb, Loader2 } from "lucide-react";
import { fetchLgaClimate, Lang, UI_TEXT } from "../lib/api";

type ClimatePoint = {
  period: string;
  ndvi: number;
  rainfall_mm: number;
  lst_c: number | null;
  nightlight: number;
};

function MiniChart({
  data,
  dataKey,
  color,
  unit,
  type = "area",
}: {
  data: ClimatePoint[];
  dataKey: string;
  color: string;
  unit: string;
  type?: "area" | "line";
}) {
  return (
    <ResponsiveContainer width="100%" height={90}>
      <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#9ca3af" }} interval={2} />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          formatter={(value: any) => [`${value}${unit}`, ""]}
          labelStyle={{ fontSize: 11 }}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        {type === "area" ? (
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={color}
            fillOpacity={0.15}
            strokeWidth={2}
            connectNulls
          />
        ) : (
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function LgaClimatePanel({
  gid2,
  lang = "en",
}: {
  gid2: string;
  lang?: Lang;
}) {
  const t = UI_TEXT[lang];
  const [climate, setClimate] = useState<ClimatePoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setClimate(null);
    fetchLgaClimate(gid2)
      .then((res) => setClimate(res.climate))
      .catch(() => setClimate([]))
      .finally(() => setLoading(false));
  }, [gid2]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        {t.loadingClimate}
      </div>
    );
  }

  if (!climate || climate.length === 0) {
    return <p className="text-sm text-gray-500">{t.noClimateData}</p>;
  }

  const latest = climate[climate.length - 1];
  const monthsLabel = t.lastMonths.replace("{n}", String(climate.length));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-green-50 border border-green-100 rounded-lg p-2 text-center">
          <Leaf className="w-4 h-4 text-green-700 mx-auto mb-1" aria-hidden="true" />
          <p className="text-sm font-semibold text-green-900">{latest.ndvi.toFixed(2)}</p>
          <p className="text-[10px] text-green-700">{t.vegetation}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
          <Droplets className="w-4 h-4 text-blue-700 mx-auto mb-1" aria-hidden="true" />
          <p className="text-sm font-semibold text-blue-900">{latest.rainfall_mm.toFixed(0)}mm</p>
          <p className="text-[10px] text-blue-700">{t.rainfall}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 text-center">
          <Thermometer className="w-4 h-4 text-orange-700 mx-auto mb-1" aria-hidden="true" />
          <p className="text-sm font-semibold text-orange-900">
            {latest.lst_c !== null ? `${latest.lst_c.toFixed(0)}°C` : "—"}
          </p>
          <p className="text-[10px] text-orange-700">{t.landTemp}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 text-center">
          <Lightbulb className="w-4 h-4 text-purple-700 mx-auto mb-1" aria-hidden="true" />
          <p className="text-sm font-semibold text-purple-900">{latest.nightlight.toFixed(2)}</p>
          <p className="text-[10px] text-purple-700">{t.economicActivity}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
          <Leaf className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
          {t.vegetationChartTitle} — {monthsLabel}
        </p>
        <MiniChart data={climate} dataKey="ndvi" color="#16a34a" unit="" />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
          {t.rainfallChartTitle} — {monthsLabel}
        </p>
        <MiniChart data={climate} dataKey="rainfall_mm" color="#2563eb" unit="mm" />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
          {t.landTempChartTitle} — {monthsLabel}
        </p>
        <MiniChart data={climate} dataKey="lst_c" color="#ea580c" unit="°C" type="line" />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />
          {t.nightlightChartTitle} — {monthsLabel}
        </p>
        <MiniChart data={climate} dataKey="nightlight" color="#9333ea" unit="" />
        <p className="text-[10px] text-gray-400 mt-0.5">{t.nightlightFootnote}</p>
      </div>

      <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
        {t.climateSource}
      </p>
    </div>
  );
}