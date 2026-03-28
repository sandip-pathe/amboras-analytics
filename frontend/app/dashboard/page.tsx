"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useLiveFeed } from "../../hooks/useLiveFeed";
import { EventTypeChart } from "../../components/EventTypeChart";
import { LiveVisitorsCard } from "../../components/LiveVisitorsCard";
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

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildRange(days: number) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
  };
}

function getRangeDayCount(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  return Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, storeId, logout } = useAuth();
  const [rangePreset, setRangePreset] = useState<
    "7d" | "30d" | "90d" | "custom"
  >("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const selectedRange = useMemo(() => {
    if (rangePreset === "7d") return buildRange(7);
    if (rangePreset === "30d") return buildRange(30);
    if (rangePreset === "90d") return buildRange(90);

    const fallback = buildRange(30);
    return {
      startDate: customStartDate || fallback.startDate,
      endDate: customEndDate || fallback.endDate,
    };
  }, [customEndDate, customStartDate, rangePreset]);

  const rangeDayCount = useMemo(
    () => getRangeDayCount(selectedRange.startDate, selectedRange.endDate),
    [selectedRange.endDate, selectedRange.startDate],
  );
  const rangeLabel = `Selected Range (${rangeDayCount} days)`;

  const { overview, topProducts, recentActivity, liveVisitors } =
    useAnalytics(selectedRange);
  const { events: liveEvents, isConnected } = useLiveFeed(
    recentActivity.data?.events,
    selectedRange,
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

  const liveVisitorsData = liveVisitors.data ?? {
    windowMinutes: 5,
    activeVisitors: 0,
    pageViews: 0,
    cartsStarted: 0,
    checkoutsStarted: 0,
    purchases: 0,
    purchaseRate: 0,
    asOf: new Date().toISOString(),
  };

  if (!token) {
    return null;
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-950 px-3 py-6 text-zinc-100 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="h-20 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="h-28 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
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
      <main className="flex min-h-screen items-center justify-center bg-gray-950 px-3 py-6 text-zinc-100 sm:px-6 sm:py-8">
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
    <main className="min-h-screen bg-gray-950 px-3 py-6 text-zinc-100 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                {toStoreName(storeId)}
              </p>
              <h1 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                Analytics Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3 self-start lg:self-auto">
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

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.12em] text-zinc-500 sm:min-w-40">
                Range Preset
                <select
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-zinc-500 sm:w-auto"
                  value={rangePreset}
                  onChange={(event) =>
                    setRangePreset(
                      event.target.value as "7d" | "30d" | "90d" | "custom",
                    )
                  }
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.12em] text-zinc-500 sm:min-w-36">
                Start Date
                <input
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-zinc-500 sm:w-auto"
                  type="date"
                  value={selectedRange.startDate}
                  onChange={(event) => {
                    setRangePreset("custom");
                    setCustomStartDate(event.target.value);
                  }}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.12em] text-zinc-500 sm:min-w-36">
                End Date
                <input
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-zinc-500 sm:w-auto"
                  type="date"
                  value={selectedRange.endDate}
                  onChange={(event) => {
                    setRangePreset("custom");
                    setCustomEndDate(event.target.value);
                  }}
                />
              </label>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <LiveVisitorsCard
            activeVisitors={liveVisitorsData.activeVisitors}
            pageViews={liveVisitorsData.pageViews}
            cartsStarted={liveVisitorsData.cartsStarted}
            checkoutsStarted={liveVisitorsData.checkoutsStarted}
            purchases={liveVisitorsData.purchases}
            purchaseRate={liveVisitorsData.purchaseRate}
            windowMinutes={liveVisitorsData.windowMinutes}
            asOf={liveVisitorsData.asOf}
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
            purchases ÷ page views, selected {rangeDayCount}-day range
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RevenueChart
              data={overview.data.revenueByDay}
              title={`Revenue - ${rangeLabel}`}
            />
          </div>
          <div className="lg:col-span-2">
            <EventTypeChart eventsByType={overview.data.eventsByType} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <TopProducts
            products={topProducts.data.products}
            title={`Top Products - ${rangeLabel}`}
          />
          <RecentActivity events={liveEvents} isConnected={isConnected} />
        </section>
      </div>
    </main>
  );
}
