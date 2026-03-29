"use client";

import { BRUTAL } from "@/lib/colors";
import { ms } from "@/lib/format";

interface SpeedupBarProps {
  data: { query: string; before_ms: number; after_ms: number; speedup: string }[];
}

export default function SpeedupBar({ data }: SpeedupBarProps) {
  const maxMs = Math.max(...data.map((d) => d.before_ms));

  return (
    <div className="space-y-6">
      {data.map((item) => {
        const beforeW = (item.before_ms / maxMs) * 100;
        const afterW = (item.after_ms / maxMs) * 100;

        return (
          <div key={item.query}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-bold text-brutal-white">{item.query}</span>
              <span className="text-2xl font-extrabold text-brutal-yellow">{item.speedup}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-brutal-gray w-14 shrink-0">BEFORE</span>
                <div className="flex-1 bg-brutal-black h-6 relative">
                  <div
                    className="h-full flex items-center px-2"
                    style={{ width: `${Math.max(beforeW, 5)}%`, background: BRUTAL.red }}
                  >
                    <span className="text-xs font-bold text-brutal-black whitespace-nowrap">{ms(item.before_ms)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brutal-gray w-14 shrink-0">AFTER</span>
                <div className="flex-1 bg-brutal-black h-6 relative">
                  <div
                    className="h-full flex items-center px-2"
                    style={{ width: `${Math.max(afterW, 2)}%`, background: BRUTAL.green }}
                  >
                    <span className="text-xs font-bold text-brutal-black whitespace-nowrap">{ms(item.after_ms)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
