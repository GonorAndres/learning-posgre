"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const exploreLinks = [
  { href: "/", key: "nav.map" },
  { href: "/overview", key: "nav.overview" },
  { href: "/delays", key: "nav.delays" },
  { href: "/revenue", key: "nav.revenue" },
  { href: "/fleet", key: "nav.fleet" },
];

const engineLinks = [
  { href: "/internals", key: "nav.internals" },
  { href: "/pipeline", key: "nav.pipeline" },
];

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t-4 border-brutal-white bg-brutal-black mt-16">
      <div className="max-w-[1400px] mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-8">
        <div>
          <div className="text-brutal-yellow font-extrabold text-lg tracking-tight">FLIGHT//DB</div>
          <p className="text-brutal-muted text-xs mt-2 prose-brutal">
            {t("footer.tagline")}
          </p>
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            {["POSTGRESQL 16", "BIGQUERY", "PYTHON ETL", "NEXT.JS"].map((tag) => (
              <span key={tag} className="border border-brutal-gray px-2 py-1 text-brutal-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold tracking-widest text-brutal-white mb-3">{t("footer.explore")}</div>
          <ul className="space-y-2">
            {exploreLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-xs text-brutal-muted no-underline hover:text-brutal-yellow transition-colors tracking-wider">
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-bold tracking-widest text-brutal-white mb-3">{t("footer.engine")}</div>
          <ul className="space-y-2">
            {engineLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-xs text-brutal-muted no-underline hover:text-brutal-yellow transition-colors tracking-wider">
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-6 text-xs font-bold tracking-widest text-brutal-muted border-2 border-brutal-gray px-3 py-1 hover:text-brutal-black hover:bg-brutal-white hover:border-brutal-white transition-colors"
          >
            &uarr; {t("footer.top")}
          </button>
        </div>
      </div>
    </footer>
  );
}
