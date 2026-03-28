"use client";

import { useEffect, useMemo, useState } from "react";

type ActivityEvent = {
  eventId: string;
  eventType: string;
  timestamp: string;
  amount: number | null;
  productId: string | null;
};

type RecentActivityProps = {
  events: ActivityEvent[];
  isConnected: boolean;
};

const BADGE_COLORS: Record<string, string> = {
  page_view: "bg-indigo-500/15 text-indigo-300 border-indigo-500/35",
  add_to_cart: "bg-amber-500/15 text-amber-300 border-amber-500/35",
  remove_from_cart: "bg-red-500/15 text-red-300 border-red-500/35",
  checkout_started: "bg-violet-500/15 text-violet-300 border-violet-500/35",
  purchase: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
};

function formatRelativeTime(timestamp: string, nowMs: number) {
  const diff = Math.max(
    0,
    Math.floor((nowMs - new Date(timestamp).getTime()) / 1000),
  );

  if (diff < 60) return `${diff}s ago`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function RecentActivity({ events, isConnected }: RecentActivityProps) {
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const rendered = useMemo(() => events.slice(0, 20), [events]);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">Recent Activity</p>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`}
          />
          {isConnected ? "Live" : "Connecting..."}
        </div>
      </div>

      <div className="max-h-90 space-y-2 overflow-y-auto pr-1">
        {rendered.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500">No recent events yet.</p>
        ) : (
          rendered.map((event) => (
            <div
              key={`${event.eventId}:${event.timestamp}`}
              className="animate-[fadeInSlide_320ms_ease-out] rounded-lg border border-zinc-800 bg-black/30 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-[11px] uppercase tracking-wide ${BADGE_COLORS[event.eventType] ?? "bg-zinc-800 text-zinc-300 border-zinc-700"}`}
                  >
                    {event.eventType}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatRelativeTime(
                      event.timestamp,
                      nowMs || new Date(event.timestamp).getTime(),
                    )}
                  </span>
                </div>
                {event.amount !== null ? (
                  <span className="text-xs font-medium text-emerald-300">
                    {formatCurrency(event.amount)}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
