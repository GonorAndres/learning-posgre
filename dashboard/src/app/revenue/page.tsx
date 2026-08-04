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
  CartesianGrid,
} from "recharts";

const TICK = "#9a9a92";
const GRID = "#2a2a2a";

export default function RevenuePage() {
  const { t } = useI18n();
  const totalRevenue = revenue.byFareClass.reduce((s, fc) => s + (fc.total_revenue_rub || 0), 0);
  const avgTicket = revenue.byFareClass.reduce((s, fc) => s + (fc.avg_ticket_rub || 0) * (fc.tickets_sold || 0), 0) /
    revenue.byFareClass.reduce((s, fc) => s + (fc.tickets_sold || 0), 0);
  const routes50 = revenue.paretoSummary.routes_for_50pct || 38;
  const routes80 = revenue.paretoSummary.routes_for_80pct || 128;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brutal-yellow tracking-tight mb-4">
        {t("revenue.title")}
      </h1>

      <PageSummary textKey="revenue.summary" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard value={totalRevenue} label={t("revenue.kpi.total")} sub={t("revenue.kpi.total.sub")} format={(n) => compact(n)} accent="#00cc66" />
        <KPICard value={avgTicket} label={t("revenue.kpi.avg")} sub={t("revenue.kpi.avg.sub")} format={(n) => `${compact(n)} RUB`} accent="#f5f5f0" />
        <KPICard value={routes80} label={t("revenue.kpi.pareto80")} sub={t("revenue.kpi.pareto80.sub")} accent="#ffcc00" />
        <KPICard value={revenue.paretoSummary.total_routes || 451} label={t("revenue.kpi.totalRoutes")} sub={t("revenue.kpi.totalRoutes.sub")} accent="#3366ff" />
      </div>

      {/* Pareto */}
      <SectionHeader title={t("revenue.pareto")} subtitle={t("revenue.pareto.sub")} takeaway={t("revenue.pareto.take")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={revenue.pareto} margin={{ top: 10, right: 20, left: 10, bottom: 18 }}>
            <CartesianGrid stroke={GRID} />
            <XAxis
              dataKey="rank"
              tick={{ fill: TICK, fontSize: 11 }}
              axisLine={{ stroke: BRUTAL.gray }}
              tickLine={false}
              minTickGap={28}
              label={{ value: t("revenue.axis.rank"), position: "insideBottom", offset: -12, fill: TICK, fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: TICK, fontSize: 11 }}
              axisLine={{ stroke: BRUTAL.gray }}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ background: BRUTAL.black, border: `2px solid ${BRUTAL.white}`, borderRadius: 0, fontSize: 12 }}
              labelStyle={{ color: BRUTAL.white }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${Number(value).toFixed(1)}%`, t("revenue.axis.cumul")]}
              labelFormatter={(rank) => `${t("revenue.axis.rank")}: ${rank}`}
            />
            <ReferenceLine
              y={50}
              stroke={BRUTAL.yellow}
              strokeDasharray="5 5"
              label={{ value: `50% = ${routes50} ${t("revenue.routesWord")}`, fill: BRUTAL.yellow, fontSize: 11, position: "insideBottomRight" }}
            />
            <ReferenceLine
              y={80}
              stroke={BRUTAL.red}
              strokeDasharray="5 5"
              label={{ value: `80% = ${routes80} ${t("revenue.routesWord")}`, fill: BRUTAL.red, fontSize: 11, position: "insideBottomRight" }}
            />
            <Area type="monotone" dataKey="cumul_pct" fill={BRUTAL.green} fillOpacity={0.15} stroke="none" />
            <Line type="monotone" dataKey="cumul_pct" stroke={BRUTAL.green} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Fare class */}
      <SectionHeader title={t("revenue.fareClass")} takeaway={t("revenue.fareClass.take")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {revenue.byFareClass.map((fc) => (
            <div key={fc.fare_class} className="border-2 border-brutal-gray p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-extrabold text-brutal-white">{fc.fare_class}</div>
                <div className="text-brutal-green text-lg font-bold tabular">{rub(fc.total_revenue_rub)}</div>
              </div>
              {/* Share of revenue vs share of tickets, same 0-100 scale */}
              <div className="mt-4 space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-brutal-muted mb-1">
                    <span>{t("revenue.ofRevenue")}</span>
                    <span className="text-brutal-white font-bold tabular">{pct(fc.revenue_pct)}</span>
                  </div>
                  <div className="bg-brutal-black h-3">
                    <div className="h-full" style={{ width: `${fc.revenue_pct}%`, background: BRUTAL.green }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-brutal-muted mb-1">
                    <span>{t("revenue.ofTickets")}</span>
                    <span className="text-brutal-white font-bold tabular">{pct(fc.ticket_pct)}</span>
                  </div>
                  <div className="bg-brutal-black h-3">
                    <div className="h-full" style={{ width: `${fc.ticket_pct}%`, background: BRUTAL.white }} />
                  </div>
                </div>
              </div>
              <div className="text-brutal-yellow text-sm mt-3 tabular">
                {t("revenue.avgShort")} {compact(fc.avg_ticket_rub)} RUB
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly trend */}
      {revenue.monthlyTrend.length > 0 && (
        <>
          <SectionHeader title={t("revenue.monthly")} takeaway={t("revenue.monthly.take")} />
          <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenue.monthlyTrend} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis dataKey="month" tick={{ fill: BRUTAL.white, fontSize: 11 }} axisLine={{ stroke: BRUTAL.gray }} tickLine={false} />
                <YAxis
                  tick={{ fill: TICK, fontSize: 11 }}
                  axisLine={{ stroke: BRUTAL.gray }}
                  tickLine={false}
                  tickFormatter={(v) => compact(Number(v))}
                />
                <Tooltip
                  contentStyle={{ background: BRUTAL.black, border: `2px solid ${BRUTAL.white}`, borderRadius: 0, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [rub(Number(value)), t("common.revenue")]}
                />
                <Line type="monotone" dataKey="revenue_rub" stroke={BRUTAL.green} strokeWidth={3} dot={{ fill: BRUTAL.green, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Top revenue routes */}
      <SectionHeader title={t("revenue.topRoutes")} takeaway={t("revenue.topRoutes.take")} />
      <div className="bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <DataTable
          data={revenue.topRoutes as unknown as Record<string, unknown>[]}
          columns={[
            { key: "departure", label: t("common.from") },
            { key: "arrival", label: t("common.to") },
            { key: "flights", label: t("common.flights"), align: "right" },
            { key: "passengers", label: t("common.pax"), align: "right", format: (v) => Number(v).toLocaleString() },
            { key: "total_revenue_rub", label: t("common.revenue"), align: "right", format: (v) => rub(Number(v)), emphasis: true },
            { key: "avg_ticket_rub", label: t("common.avgTicket"), align: "right", format: (v) => `${compact(Number(v))} RUB` },
          ]}
        />
      </div>
    </div>
  );
}
