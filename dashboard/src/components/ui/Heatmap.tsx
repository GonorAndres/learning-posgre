"use client";

import { heatmapColor, HEAT_GRADIENT } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";

interface HeatmapProps {
  data: { dow: number; hour_local: number; delay_pct: number; flights: number; day_name: string }[];
}

const DAY_KEYS = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"];
const DAYS_COUNT = DAY_KEYS.length;
const CELL_W = 52;
const CELL_H = 32;
const LEFT_PAD = 90;
const TOP_PAD = 30;

export default function Heatmap({ data }: HeatmapProps) {
  const { t } = useI18n();
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
  const peak = data.reduce((best, d) => (d.delay_pct > best.delay_pct ? d : best), data[0]);

  const width = LEFT_PAD + sortedHours.length * CELL_W + 10;
  const height = TOP_PAD + DAYS_COUNT * CELL_H + 10;

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
            fill="#9a9a92"
            fontSize={10}
          >
            {h}:00
          </text>
        ))}

        {/* Day labels and cells */}
        {DAY_KEYS.map((dayKey, di) => (
          <g key={dayKey}>
            <text
              x={LEFT_PAD - 8}
              y={TOP_PAD + di * CELL_H + CELL_H / 2 + 4}
              textAnchor="end"
              fill="#f5f5f0"
              fontSize={11}
              fontWeight="bold"
            >
              {t(dayKey)}
            </text>
            {sortedHours.map((h, hi) => {
              const cell = lookup.get(`${di + 1}-${h}`);
              const val = cell?.delay_pct ?? 0;
              const isHovered = hovered?.dow === di + 1 && hovered?.hour === h;
              const isPeak = peak && peak.dow === di + 1 && peak.hour_local === h;
              return (
                <rect
                  key={h}
                  x={LEFT_PAD + hi * CELL_W}
                  y={TOP_PAD + di * CELL_H}
                  width={CELL_W - 2}
                  height={CELL_H - 2}
                  fill={heatmapColor(val, minPct, maxPct)}
                  stroke={isHovered ? "#f5f5f0" : isPeak ? "#f5f5f0" : "transparent"}
                  strokeWidth={isHovered ? 2 : isPeak ? 1.5 : 0}
                  strokeDasharray={isPeak && !isHovered ? "4 2" : undefined}
                  onMouseEnter={() => setHovered({ dow: di + 1, hour: h })}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "crosshair" }}
                />
              );
            })}
          </g>
        ))}
      </svg>

      {/* Legend: gradient with real bounds + peak readout */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-brutal-muted tabular">{minPct.toFixed(1)}%</span>
          <span
            className="inline-block w-32 h-3 border border-brutal-gray"
            style={{ background: HEAT_GRADIENT }}
            aria-hidden="true"
          />
          <span className="text-brutal-muted tabular">{maxPct.toFixed(1)}%</span>
          <span className="text-brutal-muted ml-1">{t("heatmap.legendLabel")}</span>
        </div>
        {peak && (
          <div className="text-brutal-muted">
            <span className="text-brutal-yellow font-bold">{t("heatmap.peak")}:</span>{" "}
            {t(DAY_KEYS[peak.dow - 1])} {peak.hour_local}:00 &middot;{" "}
            <span className="text-brutal-white font-bold tabular">{peak.delay_pct}%</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoveredCell && hovered && (
        <div className="absolute top-2 right-2 bg-brutal-black border-2 border-brutal-white px-3 py-2 text-xs pointer-events-none">
          <div className="font-bold text-brutal-white">
            {t(DAY_KEYS[hovered.dow - 1])} {hovered.hour}:00
          </div>
          <div className="text-brutal-yellow mt-1 tabular">
            {hoveredCell.delay_pct}% {t("heatmap.delayed")}
          </div>
          <div className="text-brutal-muted tabular">
            {hoveredCell.flights.toLocaleString()} {t("heatmap.flights")}
          </div>
        </div>
      )}
    </div>
  );
}
