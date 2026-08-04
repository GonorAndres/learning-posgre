"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

// Two groups: the analytics story, then the engineering behind it
const analyticsLinks = [
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

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`
        px-3 py-3 text-xs tracking-widest font-bold no-underline shrink-0 transition-colors
        ${active
          ? "bg-brutal-white text-brutal-black"
          : "text-brutal-muted hover:text-brutal-white hover:bg-brutal-dark-gray"
        }
      `}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { lang, toggle, t } = useI18n();

  // Normalize trailing slashes; /map is the same destination as /
  const current = pathname.replace(/\/+$/, "") || "/";
  const isActive = (href: string) =>
    href === "/" ? current === "/" || current === "/map" : current === href;

  return (
    <nav className="border-b-4 border-brutal-white bg-brutal-black sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-0 overflow-x-auto">
        <Link
          href="/"
          className="text-brutal-yellow font-extrabold text-lg tracking-tight py-3 pr-6 shrink-0 no-underline"
        >
          FLIGHT//DB
        </Link>
        {analyticsLinks.map((link) => (
          <NavLink key={link.href} href={link.href} label={t(link.key)} active={isActive(link.href)} />
        ))}
        <span className="text-brutal-gray px-2 select-none shrink-0" aria-hidden="true">
          //
        </span>
        {engineLinks.map((link) => (
          <NavLink key={link.href} href={link.href} label={t(link.key)} active={isActive(link.href)} />
        ))}

        <button
          onClick={toggle}
          aria-label={t("nav.switchLang")}
          title={t("nav.switchLang")}
          className="ml-auto shrink-0 text-xs px-3 py-1 font-bold tracking-wider border-2 border-brutal-yellow text-brutal-yellow hover:bg-brutal-yellow hover:text-brutal-black transition-colors"
        >
          {lang === "en" ? "ES" : "EN"}
        </button>
      </div>
    </nav>
  );
}
