"use client";

import Link from "next/link";
import KPICard from "@/components/ui/KPICard";
import { delays, revenue, matViews } from "@/lib/data";
import { compact, pct } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const navCards = [
  { href: "/", titleKey: "overview.card.map", descKey: "overview.card.map.desc" },
  { href: "/delays", titleKey: "overview.card.delays", descKey: "overview.card.delays.desc" },
  { href: "/revenue", titleKey: "overview.card.revenue", descKey: "overview.card.revenue.desc" },
  { href: "/fleet", titleKey: "overview.card.fleet", descKey: "overview.card.fleet.desc" },
  { href: "/internals", titleKey: "overview.card.internals", descKey: "overview.card.internals.desc" },
  { href: "/pipeline", titleKey: "overview.card.pipeline", descKey: "overview.card.pipeline.desc" },
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
        <p className="text-brutal-gray text-sm md:text-base tracking-wider mt-3 max-w-2xl">
          {t("overview.desc")}
        </p>
        <div className="flex gap-3 mt-4 text-xs">
          <span className="border border-brutal-gray px-2 py-1 text-brutal-gray">POSTGRESQL 16</span>
          <span className="border border-brutal-gray px-2 py-1 text-brutal-gray">BIGQUERY</span>
          <span className="border border-brutal-gray px-2 py-1 text-brutal-gray">PYTHON ETL</span>
          <span className="border border-brutal-gray px-2 py-1 text-brutal-gray">NEXT.JS</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <KPICard value={5740000} label={t("overview.kpi.rows")} format={(n) => compact(n)} accent="#ffcc00" />
        <KPICard value={104} label={t("overview.kpi.airports")} accent="#f5f5f0" />
        <KPICard value={totalRevenue} label={t("overview.kpi.revenue")} format={(n) => compact(n)} accent="#00cc66" />
        <KPICard value={avgDelay} label={t("overview.kpi.delay")} format={(n) => pct(n)} accent="#ff3333" />
        <KPICard value={parseInt(matViews.speedup)} label={t("overview.kpi.speedup")} format={(n) => `${Math.round(n)}x`} accent="#ffcc00" />
        <KPICard value={102} label={t("overview.kpi.etl")} accent="#3366ff" />
        <KPICard value={delays.overview.arrived} label={t("overview.kpi.arrived")} format={(n) => compact(n)} accent="#f5f5f0" />
        <KPICard value={532} label={t("overview.kpi.routes")} accent="#00cc66" />
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {navCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block border-3 border-brutal-gray p-5 no-underline transition-all hover:border-brutal-white hover:shadow-[4px_4px_0px_0px_#f5f5f0] hover:-translate-y-0.5"
          >
            <div className="text-brutal-white font-extrabold text-sm tracking-wider">
              {t(card.titleKey)}
            </div>
            <div className="text-brutal-gray text-xs mt-1 leading-relaxed">
              {t(card.descKey)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
