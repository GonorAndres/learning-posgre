"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import KPICard from "@/components/ui/KPICard";
import DataTable from "@/components/ui/DataTable";
import PageSummary from "@/components/ui/PageSummary";
import { pipeline } from "@/lib/data";
import { compact } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function PipelinePage() {
  const { t } = useI18n();

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brutal-yellow tracking-tight mb-4">
        {t("pipeline.title")}
      </h1>

      <PageSummary textKey="pipeline.summary" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard value={pipeline.etl.total_rows} label={t("pipeline.kpi.rows")} format={(n) => compact(n)} accent="#ffcc00" />
        <KPICard value={pipeline.etl.tables} label={t("pipeline.kpi.tables")} accent="#f5f5f0" />
        <KPICard value={pipeline.etl.duration_seconds} label={t("pipeline.kpi.duration")} accent="#3366ff" />
        <KPICard value={pipeline.etl.throughput_rows_per_sec} label={t("pipeline.kpi.throughput")} format={(n) => compact(n)} accent="#00cc66" />
      </div>

      <SectionHeader title={t("pipeline.arch")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-6">
        <div className="flex flex-col md:flex-row items-stretch gap-0">
          {[
            { label: "EXTRACT", sub: "PostgreSQL 16", detail: "Server-side cursor, 50K batch size, ~56K rows/s", color: "#3366ff" },
            { label: "TRANSFORM", sub: "Python / Pandas", detail: "JSONB flattening, point parsing, UTC normalization", color: "#ffcc00" },
            { label: "LOAD", sub: "BigQuery", detail: "google-cloud-bigquery SDK, WRITE_TRUNCATE, autodetect", color: "#00cc66" },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center">
              <div className="flex-1 border-3 p-4 text-center" style={{ borderColor: step.color }}>
                <div className="text-lg font-extrabold" style={{ color: step.color }}>{step.label}</div>
                <div className="text-xs text-brutal-white font-bold mt-1">{step.sub}</div>
                <div className="text-xs text-brutal-gray mt-2 leading-relaxed">{step.detail}</div>
              </div>
              {i < 2 && <div className="text-brutal-gray text-2xl font-extrabold px-2 hidden md:block">&rarr;</div>}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-xs text-brutal-gray">
          5.74M rows | 8 tables | 102 seconds
        </div>
      </div>

      <SectionHeader title={t("pipeline.perf")} subtitle={t("pipeline.perf.sub")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <DataTable
          data={pipeline.performance as unknown as Record<string, unknown>[]}
          columns={[
            { key: "query", label: "Query" },
            { key: "pg_no_index", label: "PG (raw)", align: "right" },
            { key: "pg_with_index", label: "PG (indexed)", align: "right" },
            { key: "bigquery", label: "BigQuery", align: "right" },
            { key: "bq_bytes", label: "BQ Scanned", align: "right" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="border-3 border-brutal-green p-4">
          <div className="text-sm font-extrabold text-brutal-green">{t("pipeline.pgWins")}</div>
          <div className="text-xs text-brutal-gray mt-2 leading-relaxed">{t("pipeline.pgWins.desc")}</div>
        </div>
        <div className="border-3 border-brutal-blue p-4">
          <div className="text-sm font-extrabold text-brutal-blue">{t("pipeline.bqWins")}</div>
          <div className="text-xs text-brutal-gray mt-2 leading-relaxed">{t("pipeline.bqWins.desc")}</div>
        </div>
      </div>

      <SectionHeader title={t("pipeline.syntax")} />
      <div className="mb-10 bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <DataTable
          data={pipeline.syntax as unknown as Record<string, unknown>[]}
          columns={[
            { key: "concept", label: "Concept" },
            { key: "postgresql", label: "PostgreSQL" },
            { key: "bigquery", label: "BigQuery" },
          ]}
        />
      </div>

      <SectionHeader title={t("pipeline.archComp")} />
      <div className="bg-brutal-dark-gray border-3 border-brutal-gray p-4">
        <DataTable
          data={pipeline.architecture as unknown as Record<string, unknown>[]}
          columns={[
            { key: "dimension", label: "Dimension" },
            { key: "postgresql", label: "PostgreSQL" },
            { key: "bigquery", label: "BigQuery" },
          ]}
        />
      </div>
    </div>
  );
}
