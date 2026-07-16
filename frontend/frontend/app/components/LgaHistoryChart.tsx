"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { LgaHistoryPoint, PHASE_COLORS, Lang, UI_TEXT } from "../lib/api";

export default function LgaHistoryChart({
  history,
  lang = "en",
}: {
  history: LgaHistoryPoint[];
  lang?: Lang;
}) {
  const t = UI_TEXT[lang];

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-gray-500">{t.noHistoryData}</p>
    );
  }

  const data = history.map((h, i) => ({
    period: h.period.replace(" (forecast)", ""),
    phase: h.phase_number,
    phaseLabel: h.phase_label,
    phaseLabelTranslated: h.phase_label_translated,
    isForecast: h.is_forecast,
    index: i,
  }));

  const forecastIndex = data.findIndex((d) => d.isForecast);
  // translated phase names for the Y axis, indexed 0-3 -- pulled from
  // whichever history points happen to have that phase, since the backend
  // sends the translation per-point rather than as a separate lookup table
  const phaseOrderTranslated: (string | undefined)[] = [1, 2, 3, 4].map(
    (n) => data.find((d) => d.phase === n)?.phaseLabelTranslated
  );

  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2.5 text-xs">
        <p className="font-medium text-gray-900">{point.period}</p>
        <p style={{ color: PHASE_COLORS[point.phaseLabel] }} className="font-semibold">
          {point.phaseLabelTranslated} ({point.phase})
        </p>
        {point.isForecast && (
          <p className="text-gray-500 mt-1">{t.forecastNote}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            angle={-35}
            textAnchor="end"
            height={50}
            interval={0}
          />
          <YAxis
            domain={[1, 4]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(v) => phaseOrderTranslated[v - 1] || v}
            tick={{ fontSize: 10, fill: "#6b7280" }}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          {forecastIndex > 0 && (
            <ReferenceLine
              x={data[forecastIndex - 1].period}
              stroke="#9ca3af"
              strokeDasharray="4 4"
              label={{ value: t.now, position: "insideTopRight", fontSize: 10, fill: "#9ca3af" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="phase"
            stroke="#374151"
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              const color = PHASE_COLORS[payload.phaseLabel];
              return payload.isForecast ? (
                <svg key={`dot-${payload.index}`} x={cx - 6} y={cy - 6} width={12} height={12}>
                  <rect width={12} height={12} rx={2} fill={color} stroke="#374151" strokeWidth={1.5} />
                </svg>
              ) : (
                <circle key={`dot-${payload.index}`} cx={cx} cy={cy} r={4} fill={color} stroke="#374151" strokeWidth={1} />
              );
            }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
        <span className="flex items-center gap-1.5">
          <svg width={10} height={10}><circle cx={5} cy={5} r={4} fill="#9ca3af" /></svg>
          {t.actualLegend}
        </span>
        <span className="flex items-center gap-1.5">
          <svg width={10} height={10}><rect width={10} height={10} rx={2} fill="#9ca3af" /></svg>
          {t.forecastLegend}
        </span>
      </div>
    </div>
  );
}