"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";
import { BRUTAL } from "@/lib/colors";

const TICK = "#9a9a92";
const GRID = "#2a2a2a";

interface BrutalBarChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  color?: string;
  horizontal?: boolean;
  height?: number;
  formatValue?: (v: number) => string;
  /** Direct value labels at the end of each bar (default on) */
  showLabels?: boolean;
}

export default function BrutalBarChart({
  data,
  dataKey,
  nameKey,
  color = BRUTAL.green,
  horizontal = false,
  height = 300,
  formatValue,
  showLabels = true,
}: BrutalBarChartProps) {
  const fmt = (v: number) => (formatValue ? formatValue(v) : String(v));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{
          top: showLabels && !horizontal ? 22 : 5,
          right: showLabels && horizontal ? 55 : 10,
          left: 10,
          bottom: 5,
        }}
      >
        <CartesianGrid
          stroke={GRID}
          horizontal={!horizontal}
          vertical={horizontal}
        />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fill: TICK, fontSize: 11 }} axisLine={{ stroke: BRUTAL.gray }} tickLine={false} tickFormatter={fmt} />
            <YAxis
              type="category"
              dataKey={nameKey}
              tick={{ fill: BRUTAL.white, fontSize: 11 }}
              axisLine={{ stroke: BRUTAL.gray }}
              tickLine={false}
              width={150}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={nameKey}
              tick={{ fill: BRUTAL.white, fontSize: 10 }}
              axisLine={{ stroke: BRUTAL.gray }}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={{ stroke: BRUTAL.gray }} tickLine={false} tickFormatter={fmt} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "rgba(245, 245, 240, 0.06)" }}
          contentStyle={{
            background: BRUTAL.black,
            border: `2px solid ${BRUTAL.white}`,
            borderRadius: 0,
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [fmt(Number(value)), ""]}
          labelStyle={{ color: BRUTAL.white, fontWeight: "bold" }}
        />
        <Bar dataKey={dataKey} fill={color} maxBarSize={40}>
          {showLabels && (
            <LabelList
              dataKey={dataKey}
              position={horizontal ? "right" : "top"}
              formatter={(v: unknown) => fmt(Number(v))}
              style={{ fill: BRUTAL.white, fontSize: 11, fontWeight: 700 }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
