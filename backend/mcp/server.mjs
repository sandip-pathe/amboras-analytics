import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
const STORE_ID_PATTERN = /^[a-z0-9_\-]{2,64}$/i;

function assertStoreId(storeId) {
  if (!STORE_ID_PATTERN.test(storeId)) {
    throw new Error(
      "Invalid storeId. Use 2-64 chars: letters, numbers, underscore, hyphen.",
    );
  }
}

function withDateRange(path, startDate, endDate) {
  const url = new URL(`${API_BASE}${path}`);

  if (startDate) {
    url.searchParams.set("startDate", startDate);
  }

  if (endDate) {
    url.searchParams.set("endDate", endDate);
  }

  return url.toString();
}

async function getStoreToken(storeId) {
  assertStoreId(storeId);

  const response = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ storeId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mint store token (${response.status})`);
  }

  const body = await response.json();
  if (!body?.access_token) {
    throw new Error("Auth response did not contain access_token");
  }

  return body.access_token;
}

async function fetchJson(pathOrUrl, token) {
  const isAbsolute = pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://");
  const url = isAbsolute ? pathOrUrl : `${API_BASE}${pathOrUrl}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return response.json();
}

function asTextContent(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

const server = new McpServer(
  {
    name: "amboras-analytics-mcp",
    version: "1.0.0",
  },
  {
    instructions:
      "Analytics MCP for Amboras. All tools are store-scoped and safe for multi-tenant usage when storeId is provided.",
  },
);

server.tool(
  "mint_store_token",
  "Creates a dev JWT token for a specific storeId.",
  {
    storeId: z.string().min(2).max(64),
  },
  async ({ storeId }) => {
    const token = await getStoreToken(storeId);
    return asTextContent({ storeId, access_token: token });
  },
);

server.tool(
  "get_overview",
  "Fetches dashboard overview metrics for a single store.",
  {
    storeId: z.string().min(2).max(64),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  },
  async ({ storeId, startDate, endDate }) => {
    const token = await getStoreToken(storeId);
    const url = withDateRange("/analytics/overview", startDate, endDate);
    const overview = await fetchJson(url, token);

    return asTextContent({ storeId, startDate, endDate, overview });
  },
);

server.tool(
  "get_top_products",
  "Fetches top products for one store over an optional range.",
  {
    storeId: z.string().min(2).max(64),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  },
  async ({ storeId, startDate, endDate }) => {
    const token = await getStoreToken(storeId);
    const url = withDateRange("/analytics/top-products", startDate, endDate);
    const topProducts = await fetchJson(url, token);

    return asTextContent({ storeId, startDate, endDate, topProducts });
  },
);

server.tool(
  "get_recent_activity",
  "Fetches the recent activity feed for one store over an optional range.",
  {
    storeId: z.string().min(2).max(64),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  },
  async ({ storeId, startDate, endDate }) => {
    const token = await getStoreToken(storeId);
    const url = withDateRange("/analytics/recent-activity", startDate, endDate);
    const recentActivity = await fetchJson(url, token);

    return asTextContent({ storeId, startDate, endDate, recentActivity });
  },
);

server.tool(
  "get_live_visitors",
  "Fetches live visitors snapshot for one store in a rolling window.",
  {
    storeId: z.string().min(2).max(64),
    windowMinutes: z.number().int().min(1).max(120).optional(),
  },
  async ({ storeId, windowMinutes }) => {
    const token = await getStoreToken(storeId);
    const safeWindow = windowMinutes ?? 5;
    const snapshot = await fetchJson(
      `/analytics/live-visitors?windowMinutes=${safeWindow}`,
      token,
    );

    return asTextContent({ storeId, snapshot });
  },
);

server.tool(
  "get_dashboard_snapshot",
  "Returns overview, top-products, recent-activity, and live-visitors in one call.",
  {
    storeId: z.string().min(2).max(64),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    windowMinutes: z.number().int().min(1).max(120).optional(),
  },
  async ({ storeId, startDate, endDate, windowMinutes }) => {
    const token = await getStoreToken(storeId);
    const safeWindow = windowMinutes ?? 5;

    const [overview, topProducts, recentActivity, liveVisitors] =
      await Promise.all([
        fetchJson(withDateRange("/analytics/overview", startDate, endDate), token),
        fetchJson(
          withDateRange("/analytics/top-products", startDate, endDate),
          token,
        ),
        fetchJson(
          withDateRange("/analytics/recent-activity", startDate, endDate),
          token,
        ),
        fetchJson(`/analytics/live-visitors?windowMinutes=${safeWindow}`, token),
      ]);

    return asTextContent({
      storeId,
      range: { startDate, endDate },
      windowMinutes: safeWindow,
      overview,
      topProducts,
      recentActivity,
      liveVisitors,
    });
  },
);

server.tool(
  "verify_store_isolation",
  "Compares two stores for data isolation by checking top product IDs and recent event IDs do not overlap in responses.",
  {
    primaryStoreId: z.string().min(2).max(64),
    comparisonStoreId: z.string().min(2).max(64),
  },
  async ({ primaryStoreId, comparisonStoreId }) => {
    if (primaryStoreId === comparisonStoreId) {
      throw new Error("Use two different store IDs for isolation verification.");
    }

    const [primaryToken, comparisonToken] = await Promise.all([
      getStoreToken(primaryStoreId),
      getStoreToken(comparisonStoreId),
    ]);

    const [primaryTop, comparisonTop, primaryRecent, comparisonRecent] =
      await Promise.all([
        fetchJson("/analytics/top-products", primaryToken),
        fetchJson("/analytics/top-products", comparisonToken),
        fetchJson("/analytics/recent-activity", primaryToken),
        fetchJson("/analytics/recent-activity", comparisonToken),
      ]);

    const primaryProductIds = new Set(
      (primaryTop.products ?? []).map((p) => p.productId),
    );
    const comparisonProductIds = new Set(
      (comparisonTop.products ?? []).map((p) => p.productId),
    );

    const primaryEventIds = new Set(
      (primaryRecent.events ?? []).map((e) => e.eventId),
    );
    const comparisonEventIds = new Set(
      (comparisonRecent.events ?? []).map((e) => e.eventId),
    );

    const overlappingProductIds = [...primaryProductIds].filter((id) =>
      comparisonProductIds.has(id),
    );
    const overlappingEventIds = [...primaryEventIds].filter((id) =>
      comparisonEventIds.has(id),
    );

    return asTextContent({
      primaryStoreId,
      comparisonStoreId,
      overlap: {
        overlappingProductIds,
        overlappingEventIds,
      },
      isolated:
        overlappingProductIds.length === 0 && overlappingEventIds.length === 0,
    });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed to start", error);
  process.exit(1);
});
