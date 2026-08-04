"use client";

import dynamic from "next/dynamic";
import { airports, routes, geospatial } from "@/lib/data";
import { useMemo, useState } from "react";
import MapErrorBoundary from "@/components/map/MapErrorBoundary";
import { useI18n } from "@/lib/i18n";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), {
  ssr: false,
  loading: () => (
    <LoadingPanel />
  ),
}) as React.ComponentType<{
  airports: typeof import("@/lib/data").airports;
  routes: typeof import("@/lib/data").routes;
  colorMode: "delay" | "flights";
  onAirportClick: (code: string) => void;
}>;

function LoadingPanel() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-brutal-black text-brutal-muted text-xs tracking-widest">
      LOADING MAP...
    </div>
  );
}

type ColorMode = "delay" | "flights";

const ROUTE_LIMITS = [
  { label: "TOP 50", value: 50 },
  { label: "TOP 100", value: 100 },
  { label: "TOP 200", value: 200 },
  { label: "ALL", value: Infinity },
];

const DELAY_LEGEND = [
  { color: "#00cc66", key: "map.legend.l1" },
  { color: "#ffcc00", key: "map.legend.l2" },
  { color: "#ff9933", key: "map.legend.l3" },
  { color: "#ff3333", key: "map.legend.l4" },
];

function ControlButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`text-xs px-3 py-1 font-bold tracking-wider border-2 transition-colors ${
        active
          ? "border-brutal-white bg-brutal-white text-brutal-black"
          : "border-brutal-gray text-brutal-muted hover:text-brutal-white hover:border-brutal-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function MapExplorer() {
  const { t } = useI18n();
  const [colorMode, setColorMode] = useState<ColorMode>("delay");
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);
  const [routeLimit, setRouteLimit] = useState(100);
  const [showInfo, setShowInfo] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Sort routes by flights descending, then apply limit + airport filter
  const visibleRoutes = useMemo(() => {
    const sorted = [...routes].sort((a, b) => b.flights - a.flights);
    const limited = routeLimit === Infinity ? sorted : sorted.slice(0, routeLimit);
    if (selectedAirport) {
      return limited.filter((r) => r.dep === selectedAirport || r.arr === selectedAirport);
    }
    return limited;
  }, [routeLimit, selectedAirport]);

  const selectAirport = (code: string) => {
    setHasInteracted(true);
    setSelectedAirport(code === selectedAirport ? null : code);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      {/* Controls bar */}
      <div className="bg-brutal-dark-gray border-b-3 border-brutal-gray px-4 py-2 flex items-center gap-x-3 gap-y-2 shrink-0 flex-wrap">
        <span className="text-xs text-brutal-muted tracking-widest font-bold">{t("map.colorBy")}:</span>
        {(["delay", "flights"] as ColorMode[]).map((mode) => (
          <ControlButton key={mode} active={colorMode === mode} onClick={() => setColorMode(mode)}>
            {t(mode === "delay" ? "map.mode.delay" : "map.mode.flights")}
          </ControlButton>
        ))}

        <span className="text-xs text-brutal-muted tracking-widest font-bold ml-3">{t("map.show")}:</span>
        {ROUTE_LIMITS.map((opt) => (
          <ControlButton
            key={opt.label}
            active={routeLimit === opt.value}
            onClick={() => setRouteLimit(opt.value)}
          >
            {opt.value === Infinity ? t("map.all") : opt.label}
          </ControlButton>
        ))}

        {selectedAirport && (
          <button
            onClick={() => setSelectedAirport(null)}
            className="text-xs px-3 py-1 font-bold tracking-wider border-2 border-brutal-red text-brutal-red hover:bg-brutal-red hover:text-brutal-black transition-colors"
          >
            ✕ {t("map.clear")}: {selectedAirport}
          </button>
        )}

        <button
          onClick={() => setShowInfo(!showInfo)}
          aria-expanded={showInfo}
          className={`text-xs px-3 py-1 font-bold tracking-wider border-2 transition-colors ${
            showInfo
              ? "border-brutal-yellow text-brutal-yellow"
              : "border-brutal-gray text-brutal-muted hover:text-brutal-white hover:border-brutal-white"
          }`}
        >
          ? {t("map.about")}
        </button>

        <div className="ml-auto text-xs text-brutal-muted tabular hidden sm:block">
          {airports.filter((a) => a.departures > 0).length} {t("map.airports")} // {visibleRoutes.length} {t("map.routesLabel")}
        </div>
      </div>

      {/* About panel */}
      {showInfo && (
        <div className="border-b-3 border-brutal-yellow bg-brutal-dark-gray px-5 py-3">
          <p className="text-sm text-brutal-light-gray prose-brutal max-w-4xl">
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
                <div className="text-brutal-yellow text-2xl font-extrabold mb-4">{t("map.webglTitle")}</div>
                <div className="text-brutal-muted text-xs text-center max-w-md leading-relaxed">
                  {t("map.webglBody")}
                </div>
              </div>
            }
          >
            <RouteMap
              airports={airports}
              routes={visibleRoutes}
              colorMode={colorMode}
              onAirportClick={selectAirport}
            />
          </MapErrorBoundary>

          {/* First-time hint: disappears once the user filters an airport */}
          {!hasInteracted && (
            <div className="absolute bottom-4 left-4 pointer-events-none bg-brutal-black/85 border-2 border-brutal-yellow px-3 py-2 text-xs text-brutal-light-gray max-w-60">
              <span className="text-brutal-yellow font-bold">TIP&nbsp;</span>
              {t("map.hint")}
            </div>
          )}

          {/* Compact legend for screens without the sidebar */}
          <div className="absolute top-3 right-3 lg:hidden bg-brutal-black/85 border-2 border-brutal-gray p-2 text-xs">
            {colorMode === "delay" ? (
              <div className="flex flex-col gap-1">
                {DELAY_LEGEND.map((l) => (
                  <span key={l.key} className="flex items-center gap-2">
                    <span className="w-3 h-3 inline-block" style={{ background: l.color }} />
                    <span className="text-brutal-light-gray">{t(l.key)}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-brutal-light-gray">{t("map.legend.width")}</span>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 bg-brutal-dark-gray border-l-3 border-brutal-gray overflow-y-auto hidden lg:block">
          <div className="p-3 border-b border-brutal-gray">
            <div className="text-xs font-bold tracking-widest text-brutal-yellow mb-2">{t("map.topHubs")}</div>
            {geospatial.hubs.slice(0, 10).map((hub) => (
              <button
                key={hub.code}
                onClick={() => selectAirport(hub.code)}
                aria-pressed={selectedAirport === hub.code}
                className={`flex justify-between w-full text-xs py-1 cursor-pointer hover:text-brutal-yellow transition-colors ${
                  selectedAirport === hub.code ? "text-brutal-yellow" : "text-brutal-white"
                }`}
              >
                <span className="font-bold">{hub.code}</span>
                <span className="text-brutal-muted tabular">{hub.destinations} {t("map.destinations")}</span>
              </button>
            ))}
          </div>

          <div className="p-3 border-b border-brutal-gray">
            <div className="text-xs font-bold tracking-widest text-brutal-yellow mb-2">{t("map.longestRoutes")}</div>
            {geospatial.longestRoutes.slice(0, 8).map((r, i) => (
              <div key={i} className="text-xs py-1 text-brutal-white">
                <span className="text-brutal-muted">{r.dep_city}</span>
                {" → "}
                <span className="text-brutal-muted">{r.arr_city}</span>
                <span className="text-brutal-yellow ml-1 tabular">{r.distance_km.toLocaleString()} km</span>
              </div>
            ))}
          </div>

          <div className="p-3">
            <div className="text-xs font-bold tracking-widest text-brutal-yellow mb-2">{t("map.legend")}</div>
            {colorMode === "delay" ? (
              <div className="flex flex-col gap-1 text-xs">
                {DELAY_LEGEND.map((l) => (
                  <span key={l.key} className="flex items-center gap-2">
                    <span className="w-3 h-3 inline-block" style={{ background: l.color }} />
                    <span className="text-brutal-light-gray">{t(l.key)}</span>
                  </span>
                ))}
                <span className="text-brutal-muted mt-1">{t("map.legend.width")}</span>
              </div>
            ) : (
              <div className="text-xs text-brutal-muted">{t("map.legend.width")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
