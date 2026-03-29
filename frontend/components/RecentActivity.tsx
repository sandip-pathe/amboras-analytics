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

const DOT_COLORS: Record<string, string> = {
  page_view: "bg-indigo-500",
  add_to_cart: "bg-amber-500",
  remove_from_cart: "bg-red-500",
  checkout_started: "bg-violet-500",
  purchase: "bg-green-600",
};

function humanizeEventType(eventType: string) {
  switch (eventType) {
    case "page_view":
      return "Visitor browsed your store";
    case "add_to_cart":
      return "Someone added an item to cart";
    case "remove_from_cart":
      return "Someone removed an item from cart";
    case "checkout_started":
      return "A shopper started checkout";
    case "purchase":
      return "A new sale was completed";
    default:
      return "Store activity updated";
  }
}

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
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const rendered = useMemo(() => events.slice(0, 20), [events]);

  return (
    <section className="rounded-xl border border-[#e8e4de] bg-white/95 p-4 backdrop-blur-[2px] sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium tracking-[-0.01em] text-[#1f1e1a]">
          Live Right Now
        </p>
        <div className="flex items-center gap-2 text-xs text-[#7c7973]">
          <span
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-600 animate-pulse" : "bg-[#bbb7b0]"}`}
          />
          {isConnected ? "Live" : "Connecting..."}
        </div>
      </div>

      <div className="max-h-90 space-y-2 overflow-y-auto pr-1">
        {rendered.length === 0 ? (
          <p className="py-4 text-sm text-[#888880]">No activity yet.</p>
        ) : (
          rendered.map((event) => (
            <div
              key={`${event.eventId}:${event.timestamp}`}
              className="animate-[fadeInSlide_320ms_ease-out] rounded-lg border border-[#efece6] bg-[#fdfcfb] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${DOT_COLORS[event.eventType] ?? "bg-[#a7a39a]"}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm leading-snug text-[#2d2b26]">
                      {humanizeEventType(event.eventType)}
                    </p>
                    <p className="truncate text-xs text-[#888880]">
                      {event.productId ? `Product ${event.productId} • ` : ""}
                      {formatRelativeTime(event.timestamp, nowMs)}
                    </p>
                  </div>
                </div>
                {event.amount !== null ? (
                  <span className="shrink-0 text-xs font-medium text-green-700">
                    {formatCurrency(event.amount)}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-[#9a978f]">
                    {formatRelativeTime(event.timestamp, nowMs)}
                  </span>
                )}
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
