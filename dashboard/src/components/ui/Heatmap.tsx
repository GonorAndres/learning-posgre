"use client";

import { heatmapColor } from "@/lib/colors";
import { useState } from "react";

interface HeatmapProps {
  data: { dow: number; hour_local: number; delay_pct: number; flights: number; day_name: string }[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CELL_W = 52;
const CELL_H = 32;
const LEFT_PAD = 90;
const TOP_PAD = 30;

export default function Heatmap({ data }: HeatmapProps) {
  const [hovered, setHovered] = useState<{ dow: number; hour: number } | null>(null);

  // Build a lookup
  const lookup = new Map<string, { delay_pct: number; flights: number }>();
  const hours = new Set<number>();
  data.forEach((d) => {
    lookup.set(`${d.dow}-${d.hour_local}`, { delay_pct: d.delay_pct, flights: d.flights });
    hours.add(d.hour_local);
  });
  const sortedHours = Array.from(hours).sort((a, b) => a - b);

  const allPcts = data.map((d) => d.delay_pct);
  const minPct = Math.min(...allPcts);
  const maxPct = Math.max(...allPcts);

  const width = LEFT_PAD + sortedHours.length * CELL_W + 10;
  const height = TOP_PAD + DAYS.length * CELL_H + 10;

  const hoveredCell = hovered ? lookup.get(`${hovered.dow}-${hovered.hour}`) : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[700px]">
        {/* Hour labels */}
        {sortedHours.map((h, i) => (
          <text
            key={h}
            x={LEFT_PAD + i * CELL_W + CELL_W / 2}
            y={TOP_PAD - 10}
            textAnchor="middle"
            fill="#666"
            fontSize={10}
          >
            {h}:00
          </text>
        ))}

        {/* Day labels and cells */}
        {DAYS.map((day, di) => (
          <g key={day}>
            <text
              x={LEFT_PAD - 8}
              y={TOP_PAD + di * CELL_H + CELL_H / 2 + 4}
              textAnchor="end"
              fill="#f5f5f0"
              fontSize={11}
              fontWeight="bold"
            >
              {day.slice(0, 3).toUpperCase()}
            </text>
            {sortedHours.map((h, hi) => {
              const cell = lookup.get(`${di + 1}-${h}`);
              const val = cell?.delay_pct ?? 0;
              const isHovered = hovered?.dow === di + 1 && hovered?.hour === h;
              return (
                <rect
                  key={h}
                  x={LEFT_PAD + hi * CELL_W}
                  y={TOP_PAD + di * CELL_H}
                  width={CELL_W - 2}
                  height={CELL_H - 2}
                  fill={heatmapColor(val, minPct, maxPct)}
                  stroke={isHovered ? "#f5f5f0" : "transparent"}
                  strokeWidth={isHovered ? 2 : 0}
                  opacity={0.85}
                  onMouseEnter={() => setHovered({ dow: di + 1, hour: h })}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "crosshair" }}
                />
              );
            })}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredCell && hovered && (
        <div className="absolute top-2 right-2 bg-brutal-black border-2 border-brutal-white px-3 py-2 text-xs">
          <div className="font-bold text-brutal-white">
            {DAYS[hovered.dow - 1]} {hovered.hour}:00
          </div>
          <div className="text-brutal-yellow mt-1">
            {hoveredCell.delay_pct}% delayed
          </div>
          <div className="text-brutal-gray">
            {hoveredCell.flights} flights
          </div>
        </div>
      )}
    </div>
  );
}
