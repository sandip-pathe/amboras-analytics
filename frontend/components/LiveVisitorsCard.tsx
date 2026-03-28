type LiveVisitorsCardProps = {
  activeVisitors: number;
  pageViews: number;
  cartsStarted: number;
  checkoutsStarted: number;
  purchases: number;
  purchaseRate: number;
  windowMinutes: number;
  asOf?: string;
};

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function LiveVisitorsCard({
  activeVisitors,
  pageViews,
  cartsStarted,
  checkoutsStarted,
  purchases,
  purchaseRate,
  windowMinutes,
  asOf,
}: LiveVisitorsCardProps) {
  const asOfLabel = asOf
    ? new Date(asOf).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <article className="rounded-xl border border-[#e8e4de] bg-white/95 p-5 backdrop-blur-[2px] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-3xl font-semibold leading-none tracking-[-0.015em] text-[#1a1a1a] sm:text-4xl">
          {activeVisitors}
        </p>
        <span className="inline-flex items-center gap-2 text-xs text-[#6b6b66]">
          <span className="h-2 w-2 rounded-full bg-[#16a34a] animate-pulse" />
          Live
        </span>
      </div>

      <p className="mt-2.5 text-[13px] leading-snug text-[#6b6b66]">
        People on your store now
      </p>
      <p className="mt-1 text-xs text-[#888880]">
        Last {windowMinutes} minutes
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-[#6b6b66] sm:grid-cols-2">
        <div className="rounded border border-[#ece9e3] bg-[#fcfcfb] px-2 py-1.5">
          Visitors: <span className="text-[#1a1a1a]">{pageViews}</span>
        </div>
        <div className="rounded border border-[#ece9e3] bg-[#fcfcfb] px-2 py-1.5">
          Added to cart: <span className="text-[#1a1a1a]">{cartsStarted}</span>
        </div>
        <div className="rounded border border-[#ece9e3] bg-[#fcfcfb] px-2 py-1.5">
          Started checkout:{" "}
          <span className="text-[#1a1a1a]">{checkoutsStarted}</span>
        </div>
        <div className="rounded border border-[#ece9e3] bg-[#fcfcfb] px-2 py-1.5">
          Sales: <span className="text-[#1a1a1a]">{purchases}</span>
        </div>
      </div>

      <p className="mt-3 text-xs text-[#888880]">
        Purchase rate:{" "}
        <span className="text-[#1a1a1a]">{formatPercent(purchaseRate)}</span>
      </p>
      <p className="mt-1 text-xs text-[#9a978f]">As of {asOfLabel}</p>
    </article>
  );
}
