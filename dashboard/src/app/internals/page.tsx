"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import KPICard from "@/components/ui/KPICard";
import SpeedupBar from "@/components/ui/SpeedupBar";
import DataTable from "@/components/ui/DataTable";
import PageSummary from "@/components/ui/PageSummary";
import { optimization, matViews } from "@/lib/data";
import { ms } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const TOPIC_KEYS = ["topic1", "topic2", "topic3", "topic4", "topic5", "topic6"];

export default function InternalsPage() {
  const { t } = useI18n();

  const allSpeedups = [
    ...optimization.speedups,
    ...(matViews.raw_ms && matViews.mv_ms
      ? [{
          query: "Dashboard query (mat view)",
          before_ms: matViews.raw_ms,
          after_ms: matViews.mv_ms,
          speedup: matViews.speedup,
        }]
      : []),
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brutal-yellow tracking-tight mb-2">
        {t("internals.title")}
      </h1>
      <p className="text-brutal-muted text-sm mb-4 prose-brutal">
        {t("internals.desc")}
      </p>

      <PageSummary textKey="internals.summary" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard value={parseInt(matViews.speedup || "0")} label={t("internals.kpi.speedup")} sub={t("internals.kpi.speedup.sub")} format={(n) => `${Math.round(n)}x`} accent="#ffcc00" />
        <KPICard value={optimization.indexes?.length || 20} label={t("internals.kpi.indexes")} sub={t("internals.kpi.indexes.sub")} accent="#3366ff" />
        <KPICard value={optimization.speedups.length + 1} label={t("internals.kpi.queries")} sub={t("internals.kpi.queries.sub")} accent="#00cc66" />
        <KPICard value={matViews.mv_ms || 0.14} label={t("internals.kpi.fastest")} sub={t("internals.kpi.fastest.sub")} format={(n) => ms(n)} accent="#00cc66" />
      </div>

      <SectionHeader title={t("internals.perf")} subtitle={t("internals.perf.sub")} takeaway={t("internals.perf.take")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-6">
        <SpeedupBar data={allSpeedups} />
      </div>

      {optimization.indexSizes.length > 0 && (
        <>
          <SectionHeader title={t("internals.indexSize")} subtitle={t("internals.indexSize.sub")} takeaway={t("internals.indexSize.take")} />
          <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
            <DataTable
              data={optimization.indexSizes as unknown as Record<string, unknown>[]}
              caption={t("internals.indexSize.caption")}
              columns={[
                { key: "index_name", label: t("internals.col.index") },
                { key: "index_size", label: t("internals.col.size"), align: "right" },
                { key: "times_used", label: t("internals.col.scans"), align: "right", format: (v) => Number(v).toLocaleString(), emphasis: true },
                { key: "tuples_read", label: t("internals.col.tuples"), align: "right", format: (v) => Number(v).toLocaleString() },
              ]}
            />
          </div>
        </>
      )}

      <SectionHeader title={t("internals.topics")} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOPIC_KEYS.map((key) => (
          <div key={key} className="border-3 border-brutal-gray p-4 hover:border-brutal-white transition-colors">
            <div className="text-sm font-extrabold text-brutal-white tracking-wider">
              {t(`internals.${key}.title`)}
            </div>
            <div className="text-xs text-brutal-muted mt-2 leading-relaxed">
              {t(`internals.${key}.desc`)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
