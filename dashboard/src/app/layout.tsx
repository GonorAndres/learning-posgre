import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ClientShell from "@/components/layout/ClientShell";

const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/JetBrainsMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/JetBrainsMono-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/JetBrainsMono-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flight Analytics // PostgreSQL Deep Dive",
  description:
    "5.74M rows of Russian airline data analyzed in PostgreSQL, migrated to BigQuery. Interactive brutalist dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-mono), monospace" }}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
