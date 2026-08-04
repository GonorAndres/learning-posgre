"use client";

import Link from "next/link";
import KPICard from "@/components/ui/KPICard";
import { delays, revenue, matViews } from "@/lib/data";
import { compact, pct } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

// Reading order matches the nav: the analytics story, then the engine
const navCards = [
  { href: "/", titleKey: "overview.card.map", qKey: "overview.card.map.q", descKey: "overview.card.map.desc" },
  { href: "/delays", titleKey: "overview.card.delays", qKey: "overview.card.delays.q", descKey: "overview.card.delays.desc" },
  { href: "/revenue", titleKey: "overview.card.revenue", qKey: "overview.card.revenue.q", descKey: "overview.card.revenue.desc" },
  { href: "/fleet", titleKey: "overview.card.fleet", qKey: "overview.card.fleet.q", descKey: "overview.card.fleet.desc" },
  { href: "/internals", titleKey: "overview.card.internals", qKey: "overview.card.internals.q", descKey: "overview.card.internals.desc" },
  { href: "/pipeline", titleKey: "overview.card.pipeline", qKey: "overview.card.pipeline.q", descKey: "overview.card.pipeline.desc" },
];

export default function Home() {
  const { t } = useI18n();
  const totalRevenue = revenue.byFareClass.reduce(
    (sum, fc) => sum + (fc.total_revenue_rub || 0), 0
  );
  const avgDelay = delays.byHour.reduce((s, h) => s + h.delay_pct, 0) / delays.byHour.length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 md:py-14">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-5xl md:text-7xl font-extrabold text-brutal-yellow tracking-tighter leading-none">
          {t("overview.title")}
        </h1>
        <p className="text-brutal-muted text-sm md:text-base mt-3 prose-brutal">
          {t("overview.desc")}
        </p>
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <span className="border border-brutal-gray px-2 py-1 text-brutal-muted">POSTGRESQL 16</span>
          <span className="border border-brutal-gray px-2 py-1 text-brutal-muted">BIGQUERY</span>
          <span className="border border-brutal-gray px-2 py-1 text-brutal-muted">PYTHON ETL</span>
          <span className="border border-brutal-gray px-2 py-1 text-brutal-muted">NEXT.JS</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
        <KPICard value={5740000} label={t("overview.kpi.rows")} sub={t("overview.kpi.rows.sub")} format={(n) => compact(n)} accent="#ffcc00" />
        <KPICard value={104} label={t("overview.kpi.airports")} sub={t("overview.kpi.airports.sub")} accent="#f5f5f0" />
        <KPICard value={totalRevenue} label={t("overview.kpi.revenue")} sub={t("overview.kpi.revenue.sub")} format={(n) => compact(n)} accent="#00cc66" />
        <KPICard value={avgDelay} label={t("overview.kpi.delay")} sub={t("overview.kpi.delay.sub")} format={(n) => pct(n)} accent="#ff3333" />
        <KPICard value={parseInt(matViews.speedup)} label={t("overview.kpi.speedup")} sub={t("overview.kpi.speedup.sub")} format={(n) => `${Math.round(n)}x`} accent="#ffcc00" />
        <KPICard value={102} label={t("overview.kpi.etl")} sub={t("overview.kpi.etl.sub")} accent="#3366ff" />
        <KPICard value={delays.overview.arrived} label={t("overview.kpi.arrived")} sub={t("overview.kpi.arrived.sub")} format={(n) => compact(n)} accent="#f5f5f0" />
        <KPICard value={532} label={t("overview.kpi.routes")} sub={t("overview.kpi.routes.sub")} accent="#00cc66" />
      </div>

      {/* Guided tour */}
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-brutal-white tracking-tight">
          {t("overview.explore")}
        </h2>
        <p className="text-brutal-muted text-sm mt-1 prose-brutal">{t("overview.explore.sub")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {navCards.map((card, i) => (
          <Link
            key={card.href}
            href={card.href}
            className="group block border-3 border-brutal-gray p-5 no-underline transition-all hover:border-brutal-white hover:shadow-[4px_4px_0px_0px_#f5f5f0] hover:-translate-y-0.5"
          >
            <div className="flex items-baseline justify-between">
              <div className="text-brutal-white font-extrabold text-sm tracking-wider">
                {t(card.titleKey)}
              </div>
              <div className="text-brutal-gray font-extrabold text-lg tabular group-hover:text-brutal-yellow transition-colors">
                {String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <div className="text-brutal-yellow text-xs mt-2 leading-relaxed">
              {t(card.qKey)}
            </div>
            <div className="text-brutal-muted text-xs mt-2 leading-relaxed">
              {t(card.descKey)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
