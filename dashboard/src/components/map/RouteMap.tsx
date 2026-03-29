"use client";

import { useCallback, useEffect, useState } from "react";
import { Map } from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { ArcLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { Airport, Route } from "@/lib/types";
import { delayColor } from "@/lib/colors";
import "maplibre-gl/dist/maplibre-gl.css";

const INITIAL_VIEW = {
  latitude: 62,
  longitude: 90,
  zoom: 2.8,
  pitch: 25,
  bearing: 0,
};

const BASEMAP = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface RouteMapProps {
  airports: Airport[];
  routes: Route[];
  colorMode: "delay" | "flights";
  onAirportClick: (code: string) => void;
}

interface PickInfo {
  object?: Airport | Route | null;
  x: number;
  y: number;
}

function isRoute(obj: unknown): obj is Route {
  return typeof obj === "object" && obj !== null && "dep" in obj && "arr" in obj;
}

function isAirport(obj: unknown): obj is Airport {
  return typeof obj === "object" && obj !== null && "code" in obj && "lon" in obj;
}

export default function RouteMap({ airports, routes, colorMode, onAirportClick }: RouteMapProps) {
  const [hoverInfo, setHoverInfo] = useState<PickInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxFlights = Math.max(...routes.map((r) => r.flights), 1);

  useEffect(() => {
    // Check WebGL availability on mount
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) setError("WebGL not supported in this browser.");
    } catch {
      setError("WebGL initialization failed.");
    }

    // Suppress known luma.gl ResizeObserver error in environments with limited WebGL2 (e.g. WSL2).
    // The error is non-fatal -- deck.gl renders fine via WebGL1 fallback.
    const handler = (e: ErrorEvent) => {
      if (e.message?.includes("maxTextureDimension2D")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", handler, true);
    return () => { window.removeEventListener("error", handler, true); };
  }, []);

  const getTooltip = useCallback(() => {
    if (!hoverInfo?.object) return null;
    const obj = hoverInfo.object;
    if (isRoute(obj)) {
      return (
        <div
          className="absolute pointer-events-none bg-brutal-black border-2 border-brutal-white px-3 py-2 text-xs z-50"
          style={{ left: hoverInfo.x + 10, top: hoverInfo.y - 10 }}
        >
          <div className="font-bold text-brutal-white">{obj.dep} &rarr; {obj.arr}</div>
          <div className="text-brutal-gray">{obj.flights} flights</div>
          <div style={{ color: delayColor(obj.delay_pct) }}>{obj.delay_pct}% delayed</div>
        </div>
      );
    }
    if (isAirport(obj)) {
      return (
        <div
          className="absolute pointer-events-none bg-brutal-black border-2 border-brutal-white px-3 py-2 text-xs z-50"
          style={{ left: hoverInfo.x + 10, top: hoverInfo.y - 10 }}
        >
          <div className="font-bold text-brutal-yellow">{obj.code}</div>
          <div className="text-brutal-white">{obj.name}</div>
          <div className="text-brutal-gray">{obj.city}</div>
          <div className="text-brutal-gray mt-1">{obj.departures} departures / {obj.destinations} destinations</div>
        </div>
      );
    }
    return null;
  }, [hoverInfo]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-brutal-black p-8">
        <div className="text-brutal-yellow text-2xl font-extrabold mb-4">MAP REQUIRES WEBGL</div>
        <div className="text-brutal-gray text-xs text-center max-w-md mb-6 leading-relaxed">
          {error} Try Chrome or Firefox with hardware acceleration enabled.
        </div>
        <div className="text-brutal-white text-sm font-bold mb-4">
          {airports.filter(a => a.departures > 0).length} airports // {routes.length} routes
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs max-h-[60vh] overflow-y-auto">
          <div className="text-brutal-yellow font-bold col-span-2 mb-1">TOP AIRPORTS BY DEPARTURES</div>
          {airports
            .filter(a => a.departures > 0)
            .sort((a, b) => b.departures - a.departures)
            .slice(0, 20)
            .map((a) => (
              <div key={a.code} className="flex justify-between gap-4">
                <span className="text-brutal-white font-bold">{a.code}</span>
                <span className="text-brutal-gray">{a.city} -- {a.departures} dep</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  const arcLayer = new ArcLayer<Route>({
    id: "arcs",
    data: routes,
    getSourcePosition: (d) => [d.dep_lon, d.dep_lat],
    getTargetPosition: (d) => [d.arr_lon, d.arr_lat],
    getSourceColor: (d) => {
      if (colorMode === "delay") {
        return hexToRgba(delayColor(d.delay_pct), 180);
      }
      return [100, 100, 255, Math.min(255, 80 + (d.flights / maxFlights) * 175)];
    },
    getTargetColor: (d) => {
      if (colorMode === "delay") {
        return hexToRgba(delayColor(d.delay_pct), 120);
      }
      return [100, 100, 255, Math.min(255, 80 + (d.flights / maxFlights) * 175)];
    },
    getWidth: (d) => Math.max(1, (d.flights / maxFlights) * 5),
    greatCircle: true,
    pickable: true,
    onHover: (info) => setHoverInfo(info.object ? { object: info.object, x: info.x, y: info.y } : null),
    updateTriggers: {
      getSourceColor: [colorMode],
      getTargetColor: [colorMode],
    },
  });

  const airportLayer = new ScatterplotLayer<Airport>({
    id: "airports",
    data: airports.filter((a) => a.departures > 0),
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => Math.max(3000, Math.sqrt(d.departures) * 800),
    getFillColor: [245, 245, 240, 200],
    getLineColor: [245, 245, 240, 255],
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
    onClick: (info) => {
      if (info.object) onAirportClick(info.object.code);
    },
    onHover: (info) => setHoverInfo(info.object ? { object: info.object, x: info.x, y: info.y } : null),
  });

  return (
    <div className="w-full h-full relative">
      <DeckGL initialViewState={INITIAL_VIEW} controller layers={[arcLayer, airportLayer]}>
        <Map mapStyle={BASEMAP} />
      </DeckGL>
      {getTooltip()}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, alpha];
}
