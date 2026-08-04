"use client";

import { useEffect, useRef, useState } from "react";

interface KPICardProps {
  value: number;
  label: string;
  /** One short line of context under the label: what the number is measured
      against, or why it matters. */
  sub?: string;
  format?: (n: number) => string;
  accent?: string;
}

function useCountUp(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(target);
      return;
    }
    startTime.current = null;
    const animate = (timestamp: number) => {
      if (startTime.current === null) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(target * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return current;
}

export default function KPICard({ value, label, sub, format, accent }: KPICardProps) {
  const animated = useCountUp(value);
  const display = format ? format(animated) : Math.round(animated).toLocaleString();

  return (
    <div className="border-3 border-brutal-white bg-brutal-dark-gray p-5 shadow-[4px_4px_0px_0px_#f5f5f0]">
      <div
        className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none tabular"
        style={{ color: accent || "#f5f5f0" }}
      >
        {display}
      </div>
      <div className="text-xs tracking-[0.2em] uppercase text-brutal-muted mt-2 font-bold">
        {label}
      </div>
      {sub && (
        <div className="text-xs text-brutal-muted mt-1 leading-relaxed">
          {sub}
        </div>
      )}
    </div>
  );
}
