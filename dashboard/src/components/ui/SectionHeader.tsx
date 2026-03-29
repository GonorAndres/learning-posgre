interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="bg-brutal-white text-brutal-black px-4 py-3 mb-6">
      <h2 className="text-lg font-extrabold tracking-tight uppercase">{title}</h2>
      {subtitle && (
        <p className="text-xs text-brutal-gray tracking-wider mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
