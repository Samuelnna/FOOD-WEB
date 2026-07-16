"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, ClipboardList, Info, Languages } from "lucide-react";
import FormView from "./components/FormView";
import { Lang, LANG_OPTIONS, UI_TEXT } from "./lib/api";

// Leaflet touches `window`, which doesn't exist during server-side rendering,
// so this component must load client-side only.
const MapView = dynamic(() => import("./components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="p-6 text-gray-500 text-sm sm:text-base">Loading map…</div>
  ),
});

export default function Home() {
  const [tab, setTab] = useState<"map" | "form">("map");
  const [lang, setLang] = useState<Lang>("en");
  const t = UI_TEXT[lang];

  return (
    <main className="min-h-screen flex flex-col w-full bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex-1 flex w-full max-w-7xl flex-col">
        <header className="mb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
              Famine Risk Dashboard
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              AI-powered food insecurity forecasting for Nigeria
            </p>
          </div>

          <label className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm shrink-0">
            <Languages className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="bg-transparent focus:outline-none text-gray-800 font-medium"
              aria-label="Language"
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </header>

        <div
          className="flex items-start gap-2 mb-5 text-xs sm:text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5"
          role="note"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
          <p>{t.disclaimer}</p>
        </div>

        <div
          className="flex flex-wrap gap-1 mb-6 border-b border-gray-200"
          role="tablist"
          aria-label="Dashboard view"
        >
          <button
            role="tab"
            aria-selected={tab === "map"}
            onClick={() => setTab("map")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "map"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <MapIcon className="w-4 h-4" aria-hidden="true" />
            {t.mapView}
          </button>
          <button
            role="tab"
            aria-selected={tab === "form"}
            onClick={() => setTab("form")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "form"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ClipboardList className="w-4 h-4" aria-hidden="true" />
            {t.formView}
          </button>
        </div>

        {/* Both views stay mounted at all times -- only visibility toggles.
            Leaflet (used in MapView) breaks if its container unmounts and
            remounts, so we hide with CSS instead of conditional rendering. */}
        <div className="w-full" style={{ display: tab === "map" ? "block" : "none" }}>
          <MapView lang={lang} />
        </div>
        <div className="w-full" style={{ display: tab === "form" ? "block" : "none" }}>
          <FormView lang={lang} />
        </div>
      </div>
    </main>
  );
}