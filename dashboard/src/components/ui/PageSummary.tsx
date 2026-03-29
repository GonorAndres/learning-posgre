"use client";

import { useI18n } from "@/lib/i18n";

interface PageSummaryProps {
  textKey: string;
}

export default function PageSummary({ textKey }: PageSummaryProps) {
  const { t } = useI18n();

  return (
    <div className="border-l-4 border-brutal-yellow bg-brutal-dark-gray px-5 py-4 mb-8">
      <p className="text-sm text-brutal-light-gray leading-relaxed">
        {t(textKey)}
      </p>
    </div>
  );
}
