interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** The one thing the section shows. Rendered as a highlighted strip so a
      reader who skims headers still leaves with the finding. */
  takeaway?: string;
}

export default function SectionHeader({ title, subtitle, takeaway }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <div className="bg-brutal-white text-brutal-black px-4 py-3">
        <h2 className="text-lg font-extrabold tracking-tight uppercase">{title}</h2>
        {subtitle && (
          <p className="text-xs text-brutal-gray tracking-wider mt-0.5">{subtitle}</p>
        )}
      </div>
      {takeaway && (
        <p className="border-l-4 border-brutal-yellow bg-brutal-dark-gray text-brutal-light-gray text-sm px-4 py-2 prose-brutal">
          <span className="text-brutal-yellow font-bold" aria-hidden="true">&rarr; </span>
          {takeaway}
        </p>
      )}
    </div>
  );
}
