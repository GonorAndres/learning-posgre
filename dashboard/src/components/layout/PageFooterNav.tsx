"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

// The reading order of the site, used for prev/next
const ORDER = [
  { href: "/", key: "nav.map" },
  { href: "/overview", key: "nav.overview" },
  { href: "/delays", key: "nav.delays" },
  { href: "/revenue", key: "nav.revenue" },
  { href: "/fleet", key: "nav.fleet" },
  { href: "/internals", key: "nav.internals" },
  { href: "/pipeline", key: "nav.pipeline" },
];

export default function PageFooterNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const current = pathname.replace(/\/+$/, "") || "/";
  const idx = ORDER.findIndex((p) => p.href === current);
  if (idx === -1) return null;

  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;

  return (
    <div className="mt-14 grid grid-cols-2 gap-4">
      {prev ? (
        <Link
          href={prev.href}
          className="group border-3 border-brutal-gray p-4 no-underline transition-colors hover:border-brutal-white"
        >
          <div className="text-xs text-brutal-muted tracking-widest font-bold">
            &larr; {t("pagenav.prev")}
          </div>
          <div className="text-brutal-white font-extrabold text-sm tracking-wider mt-1 group-hover:text-brutal-yellow transition-colors">
            {t(prev.key)}
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group border-3 border-brutal-yellow p-4 no-underline text-right transition-all hover:bg-brutal-yellow"
        >
          <div className="text-xs text-brutal-muted tracking-widest font-bold group-hover:text-brutal-black">
            {t("pagenav.next")} &rarr;
          </div>
          <div className="text-brutal-yellow font-extrabold text-sm tracking-wider mt-1 group-hover:text-brutal-black transition-colors">
            {t(next.key)}
          </div>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
