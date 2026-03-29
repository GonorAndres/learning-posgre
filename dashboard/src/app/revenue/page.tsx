"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import KPICard from "@/components/ui/KPICard";
import DataTable from "@/components/ui/DataTable";
import PageSummary from "@/components/ui/PageSummary";
import { revenue } from "@/lib/data";
import { compact, rub, pct } from "@/lib/format";
import { BRUTAL } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";

export default function RevenuePage() {
  const { t } = useI18n();
  const totalRevenue = revenue.byFareClass.reduce((s, fc) => s + (fc.total_revenue_rub || 0), 0);
  const avgTicket = revenue.byFareClass.reduce((s, fc) => s + (fc.avg_ticket_rub || 0) * (fc.tickets_sold || 0), 0) /
    revenue.byFareClass.reduce((s, fc) => s + (fc.tickets_sold || 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brutal-yellow tracking-tight mb-4">
        {t("revenue.title")}
      </h1>

      <PageSummary textKey="revenue.summary" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard value={totalRevenue} label={t("revenue.kpi.total")} format={(n) => compact(n)} accent="#00cc66" />
        <KPICard value={avgTicket} label={t("revenue.kpi.avg")} format={(n) => `${compact(n)} RUB`} accent="#f5f5f0" />
        <KPICard value={revenue.paretoSummary.routes_for_80pct || 128} label={t("revenue.kpi.pareto80")} accent="#ffcc00" />
        <KPICard value={revenue.paretoSummary.total_routes || 451} label={t("revenue.kpi.totalRoutes")} accent="#3366ff" />
      </div>

      {/* Pareto */}
      <SectionHeader title={t("revenue.pareto")} subtitle={t("revenue.pareto.sub")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={revenue.pareto} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <XAxis dataKey="rank" tick={{ fill: BRUTAL.gray, fontSize: 11 }} axisLine={{ stroke: BRUTAL.gray }} />
            <YAxis tick={{ fill: BRUTAL.gray, fontSize: 11 }} axisLine={{ stroke: BRUTAL.gray }} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: BRUTAL.black, border: `2px solid ${BRUTAL.white}`, borderRadius: 0, fontSize: 12 }} labelStyle={{ color: BRUTAL.white }} />
            <ReferenceLine y={80} stroke={BRUTAL.red} strokeDasharray="5 5" label={{ value: "80%", fill: BRUTAL.red, fontSize: 11 }} />
            <Area type="monotone" dataKey="cumul_pct" fill={BRUTAL.green} fillOpacity={0.15} stroke="none" />
            <Line type="monotone" dataKey="cumul_pct" stroke={BRUTAL.green} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Fare class */}
      <SectionHeader title={t("revenue.fareClass")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          {revenue.byFareClass.map((fc) => (
            <div key={fc.fare_class} className="border-2 border-brutal-gray p-4">
              <div className="text-2xl font-extrabold text-brutal-white">{fc.fare_class}</div>
              <div className="text-brutal-green text-lg font-bold mt-2">{rub(fc.total_revenue_rub)}</div>
              <div className="text-brutal-gray text-xs mt-1">{pct(fc.revenue_pct)} of revenue</div>
              <div className="text-brutal-gray text-xs">{pct(fc.ticket_pct)} of tickets</div>
              <div className="text-brutal-yellow text-sm mt-2">avg {compact(fc.avg_ticket_rub)} RUB</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly trend */}
      {revenue.monthlyTrend.length > 0 && (
        <>
          <SectionHeader title={t("revenue.monthly")} />
          <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenue.monthlyTrend} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fill: BRUTAL.white, fontSize: 11 }} axisLine={{ stroke: BRUTAL.gray }} />
                <YAxis tick={{ fill: BRUTAL.gray, fontSize: 11 }} axisLine={{ stroke: BRUTAL.gray }} />
                <Tooltip contentStyle={{ background: BRUTAL.black, border: `2px solid ${BRUTAL.white}`, borderRadius: 0, fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue_rub" stroke={BRUTAL.green} strokeWidth={3} dot={{ fill: BRUTAL.green, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Top revenue routes */}
      <SectionHeader title={t("revenue.topRoutes")} />
      <div className="bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <DataTable
          data={revenue.topRoutes as unknown as Record<string, unknown>[]}
          columns={[
            { key: "departure", label: t("common.from") },
            { key: "arrival", label: t("common.to") },
            { key: "flights", label: t("common.flights"), align: "right" },
            { key: "passengers", label: t("common.pax"), align: "right", format: (v) => Number(v).toLocaleString() },
            { key: "total_revenue_rub", label: "Revenue", align: "right", format: (v) => rub(Number(v)) },
            { key: "avg_ticket_rub", label: t("common.avgTicket"), align: "right", format: (v) => `${compact(Number(v))} RUB` },
          ]}
        />
      </div>
    </div>
  );
}
