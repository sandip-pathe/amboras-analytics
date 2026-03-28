type MetricCardProps = {
  label: string;
  value: string;
  sublabel?: string;
};

export function MetricCard({ label, value, sublabel }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-[#e8e4de] bg-white/95 p-5 backdrop-blur-[2px] sm:p-6">
      <p className="text-3xl font-semibold leading-none tracking-[-0.015em] text-[#1a1a1a] sm:text-4xl">
        {value}
      </p>
      <p className="mt-2.5 text-[13px] leading-snug text-[#6b6b66]">{label}</p>
      {sublabel ? (
        <p className="mt-1.5 text-xs text-[#888880]">{sublabel}</p>
      ) : null}
    </article>
  );
}
