"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import KPICard from "@/components/ui/KPICard";
import Heatmap from "@/components/ui/Heatmap";
import DataTable from "@/components/ui/DataTable";
import BrutalBarChart from "@/components/ui/BrutalBarChart";
import PageSummary from "@/components/ui/PageSummary";
import { delays, geospatial, heatmap } from "@/lib/data";
import { pct } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function DelaysPage() {
  const { t } = useI18n();
  const overview = delays.overview;
  const totalDelayed = delays.byHour.reduce((s, h) => s + h.delayed, 0);
  const overallRate = (totalDelayed / overview.arrived) * 100;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brutal-yellow tracking-tight mb-4">
        {t("delays.title")}
      </h1>

      <PageSummary textKey="delays.summary" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard value={overallRate} label={t("delays.kpi.overall")} format={(n) => pct(n)} accent="#ff3333" />
        <KPICard value={totalDelayed} label={t("delays.kpi.total")} accent="#ffcc00" />
        <KPICard value={delays.topRoutes[0]?.delay_pct || 0} label={t("delays.kpi.worst")} format={(n) => pct(n)} accent="#ff3333" />
        <KPICard value={0} label={t("delays.kpi.recovery")} format={(n) => pct(n)} accent="#ff3333" />
      </div>

      {/* Heatmap */}
      <SectionHeader title={t("delays.heatmap")} subtitle={t("delays.heatmap.sub")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <Heatmap data={heatmap} />
        <div className="flex items-center gap-4 mt-3 text-xs text-brutal-gray">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 inline-block" style={{ background: "#00cc66" }} /> {t("common.low")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 inline-block" style={{ background: "#ffcc00" }} /> {t("common.medium")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 inline-block" style={{ background: "#ff3333" }} /> {t("common.high")}
          </span>
        </div>
      </div>

      {/* By Aircraft */}
      <SectionHeader title={t("delays.byAircraft")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <BrutalBarChart
          data={delays.byAircraft as unknown as Record<string, unknown>[]}
          dataKey="delay_pct"
          nameKey="aircraft"
          color="#ff3333"
          horizontal
          height={280}
          formatValue={(v) => pct(v)}
        />
      </div>

      {/* By Distance */}
      <SectionHeader title={t("delays.byDistance")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <BrutalBarChart
          data={geospatial.delayByDistance as unknown as Record<string, unknown>[]}
          dataKey="delay_pct"
          nameKey="distance_bucket"
          color="#ffcc00"
          height={250}
          formatValue={(v) => pct(v)}
        />
      </div>

      {/* Top Delayed Routes */}
      <SectionHeader title={t("delays.topRoutes")} subtitle={t("delays.topRoutes.sub")} />
      <div className="bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <DataTable
          data={delays.topRoutes as unknown as Record<string, unknown>[]}
          columns={[
            { key: "departure", label: t("common.from") },
            { key: "arrival", label: t("common.to") },
            { key: "total_flights", label: t("common.flights"), align: "right" },
            { key: "delayed_flights", label: t("common.delayed"), align: "right" },
            { key: "delay_pct", label: t("common.delayPct"), align: "right", format: (v) => pct(Number(v)) },
            { key: "avg_delay_min", label: t("common.avgDelay"), align: "right", format: (v) => `${Number(v).toFixed(0)} min` },
          ]}
        />
      </div>
    </div>
  );
}
