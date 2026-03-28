const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type OverviewResponse = {
  revenue: { today: number; thisWeek: number; thisMonth: number };
  conversionRate: number;
  eventsByType: {
    page_view: number;
    add_to_cart: number;
    remove_from_cart: number;
    checkout_started: number;
    purchase: number;
  };
  revenueByDay: Array<{ date: string; revenue: number }>;
};

type TopProductsResponse = {
  products: Array<{ productId: string; revenue: number; orders: number }>;
};

type RecentActivityResponse = {
  events: Array<{
    eventId: string;
    eventType: string;
    timestamp: string;
    amount: number | null;
    productId: string | null;
  }>;
};

type LiveVisitorsResponse = {
  windowMinutes: number;
  activeVisitors: number;
  pageViews: number;
  cartsStarted: number;
  checkoutsStarted: number;
  purchases: number;
  purchaseRate: number;
  asOf: string;
};

type TokenResponse = {
  access_token: string;
};

type DateRangeParams = {
  startDate?: string;
  endDate?: string;
};

function withDateRange(path: string, params?: DateRangeParams): string {
  if (!params?.startDate && !params?.endDate) {
    return path;
  }

  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  return `${path}?${query.toString()}`;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  withAuth = true,
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (withAuth && typeof window !== "undefined") {
    const token = localStorage.getItem("amboras_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const primaryUrl = `${API_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(primaryUrl, {
      ...init,
      headers,
    });
  } catch (error) {
    // Some Windows network setups intermittently fail localhost resolution in browsers.
    if (API_URL.includes("localhost")) {
      const fallbackUrl = `${API_URL.replace("localhost", "127.0.0.1")}${path}`;
      response = await fetch(fallbackUrl, {
        ...init,
        headers,
      });
    } else {
      throw error;
    }
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getOverview(params?: DateRangeParams) {
  return request<OverviewResponse>(
    withDateRange("/api/v1/analytics/overview", params),
  );
}

export function getTopProducts(params?: DateRangeParams) {
  return request<TopProductsResponse>(
    withDateRange("/api/v1/analytics/top-products", params),
  );
}

export function getRecentActivity(params?: DateRangeParams) {
  return request<RecentActivityResponse>(
    withDateRange("/api/v1/analytics/recent-activity", params),
  );
}

export function getLiveVisitors(windowMinutes = 5) {
  return request<LiveVisitorsResponse>(
    `/api/v1/analytics/live-visitors?windowMinutes=${windowMinutes}`,
  );
}

export function postToken(storeId: string) {
  return request<TokenResponse>(
    "/api/v1/auth/token",
    {
      method: "POST",
      body: JSON.stringify({ storeId }),
    },
    false,
  );
}

export type {
  OverviewResponse,
  TopProductsResponse,
  RecentActivityResponse,
  LiveVisitorsResponse,
  TokenResponse,
  DateRangeParams,
};
