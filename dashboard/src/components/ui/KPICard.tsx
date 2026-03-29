"use client";

import { useEffect, useRef, useState } from "react";

interface KPICardProps {
  value: number;
  label: string;
  format?: (n: number) => string;
  accent?: string;
}

function useCountUp(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
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

export default function KPICard({ value, label, format, accent }: KPICardProps) {
  const animated = useCountUp(value);
  const display = format ? format(animated) : Math.round(animated).toLocaleString();

  return (
    <div className="border-3 border-brutal-white bg-brutal-dark-gray p-5 shadow-[4px_4px_0px_0px_#f5f5f0]">
      <div
        className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none"
        style={{ color: accent || "#f5f5f0" }}
      >
        {display}
      </div>
      <div className="text-xs tracking-[0.2em] uppercase text-brutal-gray mt-2 font-bold">
        {label}
      </div>
    </div>
  );
}
