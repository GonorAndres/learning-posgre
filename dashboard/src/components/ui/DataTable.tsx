"use client";

import { useState } from "react";

interface Column<T> {
  key: keyof T;
  label: string;
  format?: (val: T[keyof T], row: T) => string;
  align?: "left" | "right";
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  maxRows?: number;
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  maxRows = 20,
}: DataTableProps<T>) {
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
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b-3 border-brutal-white">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => handleSort(col.key)}
                className={`px-3 py-2 font-bold tracking-wider uppercase cursor-pointer hover:text-brutal-yellow transition-colors ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.label}
                {sortCol === col.key && (sortDir === "asc" ? " ^" : " v")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-brutal-dark-gray hover:bg-brutal-dark-gray transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`px-3 py-2 ${col.align === "right" ? "text-right" : "text-left"}`}
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
    </div>
  );
}
