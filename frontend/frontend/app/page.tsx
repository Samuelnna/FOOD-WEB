"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import FormView from "./components/FormView";

// Leaflet touches `window`, which doesn't exist during server-side rendering,
// so this component must load client-side only.
const MapView = dynamic(() => import("./components/MapView"), {
  ssr: false,
  loading: () => <div className="p-6 text-gray-500">Loading map…</div>,
});

export default function Home() {
  const [tab, setTab] = useState<"map" | "form">("map");

  return (
    <main className="min-h-screen w-full bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col">
        <h1 className="text-2xl font-bold mb-1">Famine Risk Dashboard</h1>
        <p className="text-gray-500 mb-6 text-sm">
          AI-powered food insecurity forecasting for Nigeria
        </p>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setTab("map")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "map"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Map View
          </button>
          <button
            onClick={() => setTab("form")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "form"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Form / Manual Prediction
          </button>
        </div>

        {/* Both views stay mounted at all times -- only visibility toggles.
            Leaflet (used in MapView) breaks if its container unmounts and
            remounts, so we hide with CSS instead of conditional rendering. */}
        <div className="w-full" style={{ display: tab === "map" ? "block" : "none" }}>
          <MapView />
        </div>
        <div className="w-full" style={{ display: tab === "form" ? "block" : "none" }}>
          <FormView />
        </div>
      </div>
    </main>
  );
}