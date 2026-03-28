type MetricCardProps = {
  label: string;
  value: string;
  sublabel?: string;
};

export function MetricCard({ label, value, sublabel }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {sublabel ? (
        <p className="mt-2 text-xs text-zinc-500">{sublabel}</p>
      ) : null}
    </article>
  );
}
