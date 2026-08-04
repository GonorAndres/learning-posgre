"use client";

import { useI18n } from "@/lib/i18n";

interface PageSummaryProps {
  textKey: string;
}

/** Numbers (with common attached units) get highlighted so the paragraph can
    be skimmed by its facts. Matches both "49,235" and "5.9%" style tokens. */
const NUMBER_TOKEN = /(\d[\d,.]*(?:\s?(?:%|x|ms|km|MB|RUB|B\b|M\b|K\b))?)/g;

function highlightNumbers(text: string) {
  return text.split(NUMBER_TOKEN).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-brutal-yellow font-bold">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

export default function PageSummary({ textKey }: PageSummaryProps) {
  const { t } = useI18n();

  return (
    <div className="border-l-4 border-brutal-yellow bg-brutal-dark-gray px-5 py-4 mb-8">
      <p className="text-[15px] text-brutal-light-gray prose-brutal">
        {highlightNumbers(t(textKey))}
      </p>
    </div>
  );
}
