"use client";

import { usePathname } from "next/navigation";
import { I18nProvider } from "@/lib/i18n";
import Nav from "./Nav";
import Footer from "./Footer";
import PageFooterNav from "./PageFooterNav";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The map fills the viewport exactly; chrome below it would force a scroll
  const isMapRoute = pathname === "/" || pathname.replace(/\/+$/, "") === "/map";

  return (
    <I18nProvider>
      <Nav />
      <main className="flex-1">
        {children}
        {!isMapRoute && (
          <div className="max-w-[1400px] mx-auto px-4">
            <PageFooterNav />
          </div>
        )}
      </main>
      {!isMapRoute && <Footer />}
    </I18nProvider>
  );
}
