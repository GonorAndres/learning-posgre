"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface Column<T> {
  key: keyof T;
  label: string;
  format?: (val: T[keyof T], row: T) => string;
  align?: "left" | "right";
  /** Emphasize this column's cells (the metric the table is sorted by) */
  emphasis?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  maxRows?: number;
  /** One-line note under the table (source, threshold, reading hint) */
  caption?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  maxRows = 20,
  caption,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const [sortCol, setSortCol] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = sortCol
    ? [...data].sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      })
    : data;

  const rows = sorted.slice(0, maxRows);
  const truncated = data.length > maxRows;

  const handleSort = (key: keyof T) => {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular">
        <thead>
          <tr className="border-b-3 border-brutal-white">
            {columns.map((col) => {
              const active = sortCol === col.key;
              return (
                <th
                  key={String(col.key)}
                  onClick={() => handleSort(col.key)}
                  aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  title={t("table.sortHint")}
                  className={`px-3 py-2 font-bold tracking-wider uppercase cursor-pointer select-none transition-colors ${
                    active ? "text-brutal-yellow" : "hover:text-brutal-yellow"
                  } ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  {col.label}
                  <span className="inline-block w-3 text-brutal-yellow" aria-hidden="true">
                    {active ? (sortDir === "asc" ? "▴" : "▾") : ""}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-brutal-dark-gray hover:bg-brutal-dark-gray transition-colors ${
                i % 2 === 1 ? "bg-brutal-dark-gray/40" : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`px-3 py-2 ${col.align === "right" ? "text-right" : "text-left"} ${
                    col.emphasis ? "text-brutal-yellow font-bold" : ""
                  }`}
                >
                  {col.format
                    ? col.format(row[col.key], row)
                    : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(caption || truncated) && (
        <p className="text-xs text-brutal-muted mt-3 px-1">
          {caption}
          {caption && truncated ? " " : ""}
          {truncated && `${t("table.showing")} ${maxRows} / ${data.length}. ${t("table.sortHint")}.`}
        </p>
      )}
    </div>
  );
}
