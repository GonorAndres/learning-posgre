"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import KPICard from "@/components/ui/KPICard";
import SpeedupBar from "@/components/ui/SpeedupBar";
import DataTable from "@/components/ui/DataTable";
import PageSummary from "@/components/ui/PageSummary";
import { optimization, matViews } from "@/lib/data";
import { ms } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

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
      <p className="text-brutal-gray text-sm mb-4 max-w-3xl">
        {t("internals.desc")}
      </p>

      <PageSummary textKey="internals.summary" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard value={parseInt(matViews.speedup || "0")} label={t("internals.kpi.speedup")} format={(n) => `${Math.round(n)}x`} accent="#ffcc00" />
        <KPICard value={optimization.indexes?.length || 20} label={t("internals.kpi.indexes")} accent="#3366ff" />
        <KPICard value={optimization.speedups.length + 1} label={t("internals.kpi.queries")} accent="#00cc66" />
        <KPICard value={matViews.mv_ms || 0.14} label={t("internals.kpi.fastest")} format={(n) => ms(n)} accent="#00cc66" />
      </div>

      <SectionHeader title={t("internals.perf")} subtitle={t("internals.perf.sub")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-6">
        <SpeedupBar data={allSpeedups} />
      </div>

      {optimization.indexSizes.length > 0 && (
        <>
          <SectionHeader title={t("internals.indexSize")} subtitle={t("internals.indexSize.sub")} />
          <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
            <DataTable
              data={optimization.indexSizes as unknown as Record<string, unknown>[]}
              columns={[
                { key: "index_name", label: "Index" },
                { key: "index_size", label: "Size", align: "right" },
                { key: "times_used", label: "Scans", align: "right", format: (v) => Number(v).toLocaleString() },
                { key: "tuples_read", label: "Tuples Read", align: "right", format: (v) => Number(v).toLocaleString() },
              ]}
            />
          </div>
        </>
      )}

      <SectionHeader title={t("internals.topics")} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "Query Plan Analysis", desc: "Seq Scan, Index Scan, Index-Only Scan, Bitmap Scan. Hash Join, Nested Loop, Merge Join. Cost model and actual vs estimated rows." },
          { title: "Index Strategies", desc: "Composite B-tree, partial indexes, expression indexes, GIN for JSONB, covering indexes with INCLUDE. 4,780x speedup on JSONB search." },
          { title: "Table Partitioning", desc: "Range partitioning by month. Partition pruning eliminates 80% of scans. Trade-off: point lookups 5x slower." },
          { title: "Statistics & Monitoring", desc: "pg_stat_user_tables, pg_stat_user_indexes, cache hit ratios. 93-100% cache hit across tables." },
          { title: "VACUUM Tuning", desc: "Dead tuple lifecycle, VACUUM vs VACUUM FULL, autovacuum thresholds. XID wraparound prevention." },
          { title: "WAL & Checkpoints", desc: "Write-Ahead Log config, checkpoint statistics, synchronous commit trade-offs. Cloud SQL constraints." },
        ].map((topic) => (
          <div key={topic.title} className="border-3 border-brutal-gray p-4">
            <div className="text-sm font-extrabold text-brutal-white tracking-wider">{topic.title}</div>
            <div className="text-xs text-brutal-gray mt-2 leading-relaxed">{topic.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
