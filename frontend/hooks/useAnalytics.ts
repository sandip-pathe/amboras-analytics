"use client";

import { useQuery } from "@tanstack/react-query";
import { getOverview, getRecentActivity, getTopProducts } from "../lib/api";

export function useAnalytics() {
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: getOverview,
    refetchInterval: 60_000,
  });

  const topProducts = useQuery({
    queryKey: ["top-products"],
    queryFn: getTopProducts,
    refetchInterval: 60_000,
  });

  const recentActivity = useQuery({
    queryKey: ["recent-activity"],
    queryFn: getRecentActivity,
    staleTime: Infinity,
  });

  return { overview, topProducts, recentActivity };
}
