import type { StoreAlert } from "../lib/api";

type AlertsPanelProps = {
  alerts: StoreAlert[];
  isLoading?: boolean;
};

const ALERT_STYLES: Record<
  StoreAlert["severity"],
  { border: string; dot: string; label: string; text: string }
> = {
  critical: {
    border: "border-[#f1b8b8] bg-[#fff7f7]",
    dot: "bg-[#dc2626]",
    label: "text-[#991b1b]",
    text: "text-[#5f1c1c]",
  },
  warning: {
    border: "border-[#f0d7a8] bg-[#fffaf0]",
    dot: "bg-[#d97706]",
    label: "text-[#92400e]",
    text: "text-[#634414]",
  },
  info: {
    border: "border-[#c9e2f3] bg-[#f4fafe]",
    dot: "bg-[#0369a1]",
    label: "text-[#075985]",
    text: "text-[#31576b]",
  },
  success: {
    border: "border-[#b9e2c6] bg-[#f4fbf6]",
    dot: "bg-[#16a34a]",
    label: "text-[#166534]",
    text: "text-[#315f3c]",
  },
};

function formatMetric(label: string, value: string) {
  if (label === "Sale time") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  return value;
}

export function AlertsPanel({ alerts, isLoading = false }: AlertsPanelProps) {
  return (
    <section className="rounded-xl border border-[#e8e4de] bg-white/95 p-4 backdrop-blur-[2px] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-[-0.01em] text-[#1f1e1a]">
            Store Signals
          </p>
          <p className="mt-1 text-xs text-[#8f8b84]">
            Latest movement from the store
          </p>
        </div>
        <span className="rounded border border-[#e4dfd8] bg-[#fcfcfb] px-2 py-1 text-xs text-[#6f6d67]">
          {alerts.length}
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-24 animate-pulse rounded-lg border border-[#efece6] bg-[#fcfcfb]" />
          <div className="h-24 animate-pulse rounded-lg border border-[#efece6] bg-[#fcfcfb]" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-lg border border-[#efece6] bg-[#fcfcfb] p-4">
          <p className="text-sm font-medium text-[#2d2b26]">
            No urgent store signals right now
          </p>
          <p className="mt-1 text-xs text-[#888880]">
            Funnel and revenue look steady on the latest check.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {alerts.map((alert) => {
            const style = ALERT_STYLES[alert.severity];

            return (
              <article
                key={alert.id}
                className={`rounded-lg border p-3 ${style.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                      <p
                        className={`truncate text-sm font-medium ${style.label}`}
                      >
                        {alert.title}
                      </p>
                    </div>
                    <p className={`mt-2 text-xs leading-relaxed ${style.text}`}>
                      {alert.message}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8b84]">
                      {alert.metricLabel}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1f1e1a]">
                      {formatMetric(alert.metricLabel, alert.metricValue)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
