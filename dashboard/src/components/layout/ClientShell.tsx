"use client";

import { I18nProvider } from "@/lib/i18n";
import Nav from "./Nav";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <Nav />
      <main className="flex-1">{children}</main>
    </I18nProvider>
  );
}
