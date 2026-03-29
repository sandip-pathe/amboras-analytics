type MetricCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  variant?: "default" | "primary";
};

export function MetricCard({
  label,
  value,
  sublabel,
  variant = "default",
}: MetricCardProps) {
  const isPrimary = variant === "primary";

  return (
    <article
      className={`rounded-xl p-5 backdrop-blur-[2px] sm:p-6 ${
        isPrimary
          ? "border border-[#c9e2f3] bg-[#f4fafe]"
          : "border border-[#e8e4de] bg-white/95"
      }`}
    >
      <p
        className={`text-3xl font-semibold leading-none tracking-[-0.015em] sm:text-4xl ${
          isPrimary ? "text-[#01579b]" : "text-[#1a1a1a]"
        }`}
      >
        {value}
      </p>
      <p
        className={`mt-2.5 text-[13px] leading-snug ${
          isPrimary ? "text-[#3f6786]" : "text-[#6b6b66]"
        }`}
      >
        {label}
      </p>
      {sublabel ? (
        <p
          className={`mt-1.5 text-xs ${isPrimary ? "text-[#5882a1]" : "text-[#888880]"}`}
        >
          {sublabel}
        </p>
      ) : null}
    </article>
  );
}
