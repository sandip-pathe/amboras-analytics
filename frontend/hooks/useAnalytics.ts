"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type DateRangeParams,
  getLiveVisitors,
  getOverview,
  getRecentActivity,
  getTopProducts,
} from "../lib/api";

export function useAnalytics(range?: DateRangeParams) {
  const overview = useQuery({
    queryKey: ["overview", range?.startDate ?? null, range?.endDate ?? null],
    queryFn: () => getOverview(range),
    refetchInterval: 60_000,
  });

  const topProducts = useQuery({
    queryKey: [
      "top-products",
      range?.startDate ?? null,
      range?.endDate ?? null,
    ],
    queryFn: () => getTopProducts(range),
    refetchInterval: 60_000,
  });

  const recentActivity = useQuery({
    queryKey: [
      "recent-activity",
      range?.startDate ?? null,
      range?.endDate ?? null,
    ],
    queryFn: () => getRecentActivity(range),
    staleTime: Infinity,
  });

  const liveVisitors = useQuery({
    queryKey: ["live-visitors", 5],
    queryFn: () => getLiveVisitors(5),
    refetchInterval: 10_000,
  });

  return { overview, topProducts, recentActivity, liveVisitors };
}
