"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import KPICard from "@/components/ui/KPICard";
import DataTable from "@/components/ui/DataTable";
import BrutalBarChart from "@/components/ui/BrutalBarChart";
import PageSummary from "@/components/ui/PageSummary";
import { utilization } from "@/lib/data";
import { pct } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function FleetPage() {
  const { t } = useI18n();
  const bestLoad = utilization.loadFactor[0];
  const worstLoad = utilization.loadFactor[utilization.loadFactor.length - 1];
  const totalFlights = utilization.fleet.reduce((s, f) => s + f.total_flights, 0);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brutal-yellow tracking-tight mb-4">
        {t("fleet.title")}
      </h1>

      <PageSummary textKey="fleet.summary" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard value={8} label={t("fleet.kpi.types")} sub={t("fleet.kpi.types.sub")} accent="#f5f5f0" />
        <KPICard value={totalFlights} label={t("fleet.kpi.flights")} sub={t("fleet.kpi.flights.sub")} accent="#ffcc00" />
        <KPICard value={bestLoad?.avg_load_factor_pct || 0} label={t("fleet.kpi.best")} sub={bestLoad?.aircraft} format={(n) => pct(n)} accent="#00cc66" />
        <KPICard value={worstLoad?.avg_load_factor_pct || 0} label={t("fleet.kpi.worst")} sub={worstLoad?.aircraft} format={(n) => pct(n)} accent="#ff3333" />
      </div>

      <SectionHeader title={t("fleet.loadFactor")} subtitle={t("fleet.loadFactor.sub")} takeaway={t("fleet.loadFactor.take")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <BrutalBarChart
          data={utilization.loadFactor as unknown as Record<string, unknown>[]}
          dataKey="avg_load_factor_pct"
          nameKey="aircraft"
          color="#00cc66"
          horizontal
          height={300}
          formatValue={(v) => pct(v)}
        />
      </div>

      {utilization.turnaround.length > 0 && (
        <>
          <SectionHeader title={t("fleet.turnaround")} />
          <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
            <BrutalBarChart
              data={utilization.turnaround as unknown as Record<string, unknown>[]}
              dataKey="avg_turnaround_min"
              nameKey="aircraft"
              color="#3366ff"
              horizontal
              height={300}
              formatValue={(v) => `${v.toFixed(0)} min`}
            />
          </div>
        </>
      )}

      <SectionHeader title={t("fleet.overview")} takeaway={t("fleet.overview.take")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <DataTable
          data={utilization.fleet as unknown as Record<string, unknown>[]}
          columns={[
            { key: "aircraft", label: t("fleet.col.aircraft") },
            { key: "max_range_km", label: t("fleet.col.range"), align: "right", format: (v) => Number(v).toLocaleString() },
            { key: "total_flights", label: t("common.flights"), align: "right", format: (v) => Number(v).toLocaleString() },
            { key: "total_flight_hours", label: t("fleet.col.hours"), align: "right", format: (v) => Number(v).toLocaleString() },
            { key: "avg_duration_min", label: t("fleet.col.duration"), align: "right", format: (v) => `${Number(v).toFixed(0)} min` },
          ]}
        />
      </div>

      <SectionHeader title={t("fleet.seats")} takeaway={t("fleet.seats.take")} />
      <div className="bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <DataTable
          data={utilization.seatCapacity as unknown as Record<string, unknown>[]}
          columns={[
            { key: "aircraft", label: t("fleet.col.aircraft") },
            { key: "economy_seats", label: t("fleet.col.economy"), align: "right" },
            { key: "comfort_seats", label: t("fleet.col.comfort"), align: "right" },
            { key: "business_seats", label: t("fleet.col.business"), align: "right" },
            { key: "total_seats", label: t("fleet.col.total"), align: "right", emphasis: true },
          ]}
        />
      </div>
    </div>
  );
}
