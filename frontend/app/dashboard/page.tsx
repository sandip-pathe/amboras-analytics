"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useLiveFeed } from "../../hooks/useLiveFeed";
import { EventTypeChart } from "../../components/EventTypeChart";
import { MetricCard } from "../../components/MetricCard";
import { RecentActivity } from "../../components/RecentActivity";
import { RevenueChart } from "../../components/RevenueChart";
import { TopProducts } from "../../components/TopProducts";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function toStoreName(storeId: string | null) {
  if (!storeId) return "Store";
  return storeId
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, storeId, logout } = useAuth();
  const { overview, topProducts, recentActivity } = useAnalytics();
  const { events: liveEvents, isConnected } = useLiveFeed(
    recentActivity.data?.events,
  );

  useEffect(() => {
    if (token === null) {
      router.replace("/login");
    }
  }, [router, token]);

  const isLoading =
    overview.isLoading || topProducts.isLoading || recentActivity.isLoading;

  const hasError =
    overview.isError || topProducts.isError || recentActivity.isError;

  if (!token) {
    return null;
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-950 px-6 py-8 text-zinc-100">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="h-20 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
            <div className="h-28 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
            <div className="h-28 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          </div>
          <div className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="h-80 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 lg:col-span-3" />
            <div className="h-80 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 lg:col-span-2" />
          </div>
        </div>
      </main>
    );
  }

  if (hasError || !overview.data || !topProducts.data || !recentActivity.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 py-8 text-zinc-100">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
          <p className="text-sm text-zinc-400">
            Could not load analytics data.
          </p>
          <button
            className="mt-4 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
            onClick={() => {
              overview.refetch();
              topProducts.refetch();
              recentActivity.refetch();
            }}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                {toStoreName(storeId)}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">
                Analytics Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span
                  className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`}
                />
                {isConnected ? "Live" : "Connecting..."}
              </div>
              <button
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Today's Revenue"
            value={formatCurrency(overview.data.revenue.today)}
          />
          <MetricCard
            label="This Week"
            value={formatCurrency(overview.data.revenue.thisWeek)}
          />
          <MetricCard
            label="This Month"
            value={formatCurrency(overview.data.revenue.thisMonth)}
          />
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-8 text-center">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
            Conversion Rate
          </p>
          <p className="mt-3 text-5xl font-semibold text-white">
            {formatPercent(overview.data.conversionRate)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            purchases ÷ page views, last 30 days
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RevenueChart data={overview.data.revenueByDay} />
          </div>
          <div className="lg:col-span-2">
            <EventTypeChart eventsByType={overview.data.eventsByType} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <TopProducts products={topProducts.data.products} />
          <RecentActivity events={liveEvents} isConnected={isConnected} />
        </section>
      </div>
    </main>
  );
}
