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

type TokenResponse = {
  access_token: string;
};

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

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getOverview() {
  return request<OverviewResponse>("/api/v1/analytics/overview");
}

export function getTopProducts() {
  return request<TopProductsResponse>("/api/v1/analytics/top-products");
}

export function getRecentActivity() {
  return request<RecentActivityResponse>("/api/v1/analytics/recent-activity");
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
  TokenResponse,
};
