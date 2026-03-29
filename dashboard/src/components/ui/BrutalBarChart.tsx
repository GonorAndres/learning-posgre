"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BRUTAL } from "@/lib/colors";

interface BrutalBarChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  color?: string;
  horizontal?: boolean;
  height?: number;
  formatValue?: (v: number) => string;
}

export default function BrutalBarChart({
  data,
  dataKey,
  nameKey,
  color = BRUTAL.green,
  horizontal = false,
  height = 300,
  formatValue,
}: BrutalBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fill: BRUTAL.gray, fontSize: 11 }} axisLine={{ stroke: BRUTAL.gray }} />
            <YAxis
              type="category"
              dataKey={nameKey}
              tick={{ fill: BRUTAL.white, fontSize: 11 }}
              axisLine={{ stroke: BRUTAL.gray }}
              width={150}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={nameKey}
              tick={{ fill: BRUTAL.white, fontSize: 10 }}
              axisLine={{ stroke: BRUTAL.gray }}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: BRUTAL.gray, fontSize: 11 }} axisLine={{ stroke: BRUTAL.gray }} />
          </>
        )}
        <Tooltip
          contentStyle={{
            background: BRUTAL.black,
            border: `2px solid ${BRUTAL.white}`,
            borderRadius: 0,
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [formatValue ? formatValue(Number(value)) : String(value), ""]}
          labelStyle={{ color: BRUTAL.white, fontWeight: "bold" }}
        />
        <Bar dataKey={dataKey} fill={color} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
