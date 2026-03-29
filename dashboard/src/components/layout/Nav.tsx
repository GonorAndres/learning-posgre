"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const links = [
  { href: "/", key: "nav.map" },
  { href: "/overview", key: "nav.overview" },
  { href: "/delays", key: "nav.delays" },
  { href: "/revenue", key: "nav.revenue" },
  { href: "/fleet", key: "nav.fleet" },
  { href: "/internals", key: "nav.internals" },
  { href: "/pipeline", key: "nav.pipeline" },
];

export default function Nav() {
  const pathname = usePathname();
  const { lang, toggle, t } = useI18n();

  return (
    <nav className="border-b-4 border-brutal-white bg-brutal-black sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-0 overflow-x-auto">
        <Link
          href="/"
          className="text-brutal-yellow font-extrabold text-lg tracking-tight py-3 pr-6 shrink-0 no-underline"
        >
          FLIGHT//DB
        </Link>
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                px-3 py-3 text-xs tracking-widest font-bold no-underline shrink-0 transition-colors
                ${active
                  ? "bg-brutal-white text-brutal-black"
                  : "text-brutal-gray hover:text-brutal-white hover:bg-brutal-dark-gray"
                }
              `}
            >
              {t(link.key)}
            </Link>
          );
        })}

        <button
          onClick={toggle}
          className="ml-auto shrink-0 text-xs px-3 py-1 font-bold tracking-wider border-2 border-brutal-yellow text-brutal-yellow hover:bg-brutal-yellow hover:text-brutal-black transition-colors"
        >
          {lang === "en" ? "ES" : "EN"}
        </button>
      </div>
    </nav>
  );
}
