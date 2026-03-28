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
    <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
          Live Visitors ({windowMinutes}m)
        </p>
        <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <p className="mt-3 text-3xl font-semibold text-white">{activeVisitors}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-400">
        <div className="rounded border border-zinc-800 px-2 py-1.5">
          Views: <span className="text-zinc-200">{pageViews}</span>
        </div>
        <div className="rounded border border-zinc-800 px-2 py-1.5">
          Carts: <span className="text-zinc-200">{cartsStarted}</span>
        </div>
        <div className="rounded border border-zinc-800 px-2 py-1.5">
          Checkouts: <span className="text-zinc-200">{checkoutsStarted}</span>
        </div>
        <div className="rounded border border-zinc-800 px-2 py-1.5">
          Purchases: <span className="text-zinc-200">{purchases}</span>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Purchase rate:{" "}
        <span className="text-zinc-200">{formatPercent(purchaseRate)}</span>
      </p>
      <p className="mt-1 text-xs text-zinc-600">As of {asOfLabel}</p>
    </article>
  );
}
