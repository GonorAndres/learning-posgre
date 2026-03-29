"use client";

import dynamic from "next/dynamic";
import { airports, routes } from "@/lib/data";
import { geospatial } from "@/lib/data";
import { useMemo, useState } from "react";
import MapErrorBoundary from "@/components/map/MapErrorBoundary";
import { useI18n } from "@/lib/i18n";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-brutal-black text-brutal-gray text-xs tracking-widest">
      LOADING MAP...
    </div>
  ),
}) as React.ComponentType<{
  airports: typeof import("@/lib/data").airports;
  routes: typeof import("@/lib/data").routes;
  colorMode: "delay" | "flights";
  onAirportClick: (code: string) => void;
}>;

type ColorMode = "delay" | "flights";

const ROUTE_LIMITS = [
  { label: "TOP 50", value: 50 },
  { label: "TOP 100", value: 100 },
  { label: "TOP 200", value: 200 },
  { label: "ALL", value: Infinity },
];

export default function MapPage() {
  const { t } = useI18n();
  const [colorMode, setColorMode] = useState<ColorMode>("delay");
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);
  const [routeLimit, setRouteLimit] = useState(100);
  const [showInfo, setShowInfo] = useState(false);

  // Sort routes by flights descending, then apply limit + airport filter
  const visibleRoutes = useMemo(() => {
    const sorted = [...routes].sort((a, b) => b.flights - a.flights);
    const limited = routeLimit === Infinity ? sorted : sorted.slice(0, routeLimit);
    if (selectedAirport) {
      return limited.filter((r) => r.dep === selectedAirport || r.arr === selectedAirport);
    }
    return limited;
  }, [routeLimit, selectedAirport]);

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      {/* Controls bar */}
      <div className="bg-brutal-dark-gray border-b-3 border-brutal-gray px-4 py-2 flex items-center gap-4 shrink-0 flex-wrap">
        <span className="text-xs text-brutal-gray tracking-widest font-bold">COLOR:</span>
        {(["delay", "flights"] as ColorMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setColorMode(mode)}
            className={`text-xs px-3 py-1 font-bold tracking-wider border-2 transition-colors ${
              colorMode === mode
                ? "border-brutal-yellow text-brutal-yellow bg-brutal-black"
                : "border-brutal-gray text-brutal-gray hover:text-brutal-white hover:border-brutal-white"
            }`}
          >
            {mode.toUpperCase()}
          </button>
        ))}

        <span className="text-xs text-brutal-gray tracking-widest font-bold ml-4">ROUTES:</span>
        {ROUTE_LIMITS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setRouteLimit(opt.value)}
            className={`text-xs px-3 py-1 font-bold tracking-wider border-2 transition-colors ${
              routeLimit === opt.value
                ? "border-brutal-green text-brutal-green bg-brutal-black"
                : "border-brutal-gray text-brutal-gray hover:text-brutal-white hover:border-brutal-white"
            }`}
          >
            {opt.label}
          </button>
        ))}

        {selectedAirport && (
          <button
            onClick={() => setSelectedAirport(null)}
            className="text-xs px-3 py-1 font-bold tracking-wider border-2 border-brutal-red text-brutal-red"
          >
            CLEAR: {selectedAirport}
          </button>
        )}

        <button
          onClick={() => setShowInfo(!showInfo)}
          className={`text-xs px-3 py-1 font-bold tracking-wider border-2 transition-colors ${
            showInfo
              ? "border-brutal-yellow text-brutal-yellow"
              : "border-brutal-gray text-brutal-gray hover:text-brutal-white hover:border-brutal-white"
          }`}
        >
          INFO
        </button>

        <div className="ml-auto text-xs text-brutal-gray">
          {airports.filter(a => a.departures > 0).length} {t("map.airports")} // {visibleRoutes.length} {t("map.routesLabel")}
        </div>
      </div>

      {/* Summary panel */}
      {showInfo && (
        <div className="border-b-3 border-brutal-yellow bg-brutal-dark-gray px-5 py-3">
          <p className="text-sm text-brutal-light-gray leading-relaxed max-w-4xl">
            {t("map.summary")}
          </p>
        </div>
      )}

      {/* Map + sidebar */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative">
          <MapErrorBoundary
            fallback={
              <div className="w-full h-full flex flex-col items-center justify-center bg-brutal-black p-8">
                <div className="text-brutal-yellow text-2xl font-extrabold mb-4">MAP REQUIRES WEBGL</div>
                <div className="text-brutal-gray text-xs text-center max-w-md leading-relaxed">
                  Your browser does not fully support WebGL2. Try Chrome or Firefox with hardware acceleration enabled.
                </div>
              </div>
            }
          >
            <RouteMap
              airports={airports}
              routes={visibleRoutes}
              colorMode={colorMode}
              onAirportClick={(code) => setSelectedAirport(code === selectedAirport ? null : code)}
            />
          </MapErrorBoundary>
        </div>

        {/* Sidebar */}
        <div className="w-72 bg-brutal-dark-gray border-l-3 border-brutal-gray overflow-y-auto hidden lg:block">
          <div className="p-3 border-b border-brutal-gray">
            <div className="text-xs font-bold tracking-widest text-brutal-yellow mb-2">{t("map.topHubs")}</div>
            {geospatial.hubs.slice(0, 10).map((hub) => (
              <div
                key={hub.code}
                onClick={() => setSelectedAirport(hub.code === selectedAirport ? null : hub.code)}
                className={`flex justify-between text-xs py-1 cursor-pointer hover:text-brutal-yellow transition-colors ${
                  selectedAirport === hub.code ? "text-brutal-yellow" : "text-brutal-white"
                }`}
              >
                <span className="font-bold">{hub.code}</span>
                <span className="text-brutal-gray">{hub.destinations} dest</span>
              </div>
            ))}
          </div>

          <div className="p-3 border-b border-brutal-gray">
            <div className="text-xs font-bold tracking-widest text-brutal-yellow mb-2">{t("map.longestRoutes")}</div>
            {geospatial.longestRoutes.slice(0, 8).map((r, i) => (
              <div key={i} className="text-xs py-1 text-brutal-white">
                <span className="text-brutal-gray">{r.dep_city}</span>
                {" -> "}
                <span className="text-brutal-gray">{r.arr_city}</span>
                <span className="text-brutal-yellow ml-1">{r.distance_km.toLocaleString()} km</span>
              </div>
            ))}
          </div>

          <div className="p-3">
            <div className="text-xs font-bold tracking-widest text-brutal-yellow mb-2">{t("map.legend")}</div>
            {colorMode === "delay" ? (
              <div className="flex flex-col gap-1 text-xs">
                <span className="flex items-center gap-2"><span className="w-3 h-3 inline-block" style={{ background: "#00cc66" }} /> {"< 3% delay"}</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 inline-block" style={{ background: "#ffcc00" }} /> 3-5% delay</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 inline-block" style={{ background: "#ff9933" }} /> 5-7% delay</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 inline-block" style={{ background: "#ff3333" }} /> {"> 7% delay"}</span>
              </div>
            ) : (
              <div className="text-xs text-brutal-gray">Arc width scaled by flight count</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
