# Amboras Analytics Dashboard

Real-time, multi-tenant analytics dashboard for Amboras store owners. Each store owner logs in, sees only their data, and gets meaningful business insights — not raw event logs.

I built everything the assignment asked for, plus an MCP server that exposes the analytics as AI-callable tools. More on why at the bottom.

---

## Quick Start

```bash
git clone https://github.com/your-username/amboras-analytics.git
cd amboras-analytics
```

---

## Quick Demo Start (3 terminals)

If you just want to see it working:

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed    # **Copy the JWT tokens printed here**
npm run start:dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 — MCP (optional, after backend is running):**
```bash
cd backend
npm run mcp:start
```

Then:
1. Open `http://localhost:3000/login`
2. Paste a token from seed output into the JWT field
3. Start the demo

---

## Tech Stack

- **Backend:** NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Data fetching:** @tanstack/react-query v4 + Recharts
- **Real-time:** Server-Sent Events via NestJS `@Sse()` + EventEmitter2
- **Auth:** JWT with storeId in payload via @nestjs/jwt + passport-jwt

---

## Setup

**You'll need:** Node 18+, PostgreSQL running locally.

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Set these in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amboras_analytics?schema=public"
JWT_SECRET="dev-secret-change-in-production"
```

```bash
npx prisma migrate dev
npx prisma db seed    # seeds 100k events, logs JWTs for 3 stores
npm run start:dev     # runs on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Set `.env.local` to:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```bash
npm run dev           # runs on http://localhost:3000
```

### Logging in

When you run `npx prisma db seed`, you'll see output like:

```
✓ Seeded store_alpha: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdG9...
✓ Seeded store_beta: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdG9...
✓ Seeded store_gamma: ...
```

Copy the full token (starts with `eyJ...`) for any store.

1. Go to `http://localhost:3000/login`
2. Enter the store ID (e.g. `store_alpha`) in the first field
3. Paste the full JWT token in the second field
4. Submit — you're logged in

### Sending a test event (to see real-time in action)

Replace `<YOUR_JWT>` with the token you copied above:

```bash
curl -X POST http://localhost:3001/api/v1/events \
  -H "Authorization: Bearer <YOUR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_manual_001",
    "store_id": "store_alpha",
    "event_type": "purchase",
    "timestamp": "2026-03-28T12:00:00.000Z",
    "data": {
      "product_id": "prod_001",
      "amount": 129.99,
      "currency": "USD"
    }
  }'
```

If you're logged in as that store, the event appears in the live activity feed instantly — no page refresh needed.

---

## Architecture Decisions

### 1. Data Aggregation — Write-time, not Read-time

The assignment said the overview endpoint should return in <500ms "even with millions of events." That's the hard constraint. I took it seriously.

The naive approach — `SELECT SUM(amount) FROM events WHERE store_id = X AND date >= today` — works fine at 10,000 rows. At 10 million, it's a full index scan on every dashboard load. It gets slower as the business grows. That's the wrong shape for an analytics product.

**What I built instead:** every event ingestion also UPSERTs into a `store_daily_stats` table. One row per store, per day, per event type. Revenue and count are incremented atomically using PostgreSQL `ON CONFLICT DO UPDATE`.

The overview endpoint reads from `store_daily_stats` only — never touches raw events. For a store with 90 days of history and 5 event types, that's at most 450 rows. Whether the store has 33,000 events or 33 million, the read complexity doesn't change.

**Trade-off I accepted:** write amplification. Every event write hits two tables. A crash between the two writes creates a small inconsistency window (raw events and stats diverge temporarily). I chose this because the read-time guarantee matters more at this stage, and the consistency risk is manageable with a transaction or outbox pattern when this goes to production.

I also considered materialized views (good, but refresh lag) and TimescaleDB continuous aggregates (the right long-term answer — I'd move here with more time). The pre-aggregated table is the simplest version of the right idea.

---

### 2. Real-time — SSE, not WebSockets

I want to be direct about this: a lot of people reach for WebSockets when they hear "real-time." I didn't, because WebSockets are bidirectional and this dashboard is purely read-only. The server pushes data to the client. The client never sends data back after connecting. There's no reason to pay the cost of full duplex.

Server-Sent Events fit the data flow exactly. They run over plain HTTP, browsers handle reconnection automatically, and NestJS has native `@Sse()` support that wraps cleanly over an RxJS Observable.

The flow: `POST /events` → EventEmitter2 fires internally → SSE handler picks it up → browser receives the event → live feed updates. End-to-end under 100ms.

The live-visitors card polls `GET /api/v1/analytics/live-visitors` with a 10-second interval and also subscribes to the `/live-visitors/stream` SSE endpoint for immediate updates — it estimates active visitors from page_view volume in a rolling window.

**One honest limitation:** `EventSource` in the browser doesn't support custom headers, so the JWT is passed as a query parameter for the SSE connection (`?token=...`). Tokens in server logs aren't ideal. In production I'd use a short-lived handshake token issued at connection time.

---

### 3. Frontend — React Query + SSE as separate concerns

React Query handles the three HTTP analytics endpoints with stale-while-revalidate caching and 60-second background refresh. The SSE live feed is managed in a separate `useLiveFeed` hook with a native `EventSource`.

I kept them separate deliberately. Early on I tried merging them — React Query's background refetch was overwriting SSE events that had been prepended locally. The state kept getting clobbered. Separating them solved it cleanly: React Query owns aggregate snapshot data, SSE owns the incremental live feed. The `recent-activity` query gets `staleTime: Infinity` because SSE is already handling freshness for that piece.

**Trade-off:** two data pipelines to reason about. Worth it for the state clarity.

---

### 4. Multi-tenancy — JWT scoping at every layer

Every analytics endpoint extracts `storeId` from the JWT payload via `JwtStrategy` and filters all queries to that store. The guard runs on every protected route. I tested this explicitly — logging in as `store_alpha` and confirming you cannot see `store_beta` data.

The honest limitation here: application-level filtering is the primary enforcement layer. A future developer who adds an endpoint and forgets the `WHERE store_id` clause creates a data leak. The production fix is PostgreSQL Row Level Security — RLS enforces isolation at the database level regardless of what the application code does. It's on my list.

---

## Performance

Measured with `curl -w "%{time_total}s"` against 100,000 seeded events (store_alpha: ~33k events, 90 days of history):

| Endpoint | Time | Why |
|---|---|---|
| `GET /analytics/overview` | **48ms** | Reads ~450 rows from store_daily_stats |
| `GET /analytics/top-products` | **52ms** | Indexed scan, purchases only, last 30 days |
| `GET /analytics/recent-activity` | **38ms** | LIMIT 20 on indexed timestamp |

All endpoints stay well under the 500ms constraint. The pre-aggregated stats approach guarantees this regardless of event volume.

---

## Beyond the Requirements — MCP Server

The assignment had a bonus list: live visitors, real-time updates, date range filtering, performance optimizations. I built all of those.

I also added something not on the list: an MCP (Model Context Protocol) server at `/ai`.

Here's why I think it matters for Amboras specifically.

Amboras is positioned as an AI-native platform — the idea is that AI does everything from store creation to marketing to analytics. If that's true, the dashboard can't be the only interface to store data. An AI agent shouldn't have to scrape a web page to answer "how are my top products trending this week?" It should be able to call a tool directly.

MCP is the protocol that makes that possible. It exposes backend functionality as structured, AI-callable tools. I built four:

- `get_store_overview` — revenue, conversion rate, event counts for a date range
- `get_top_products` — top 10 by revenue
- `get_revenue_trend` — daily revenue array for trend analysis
- `analyze_conversion_funnel` — page_view → cart → checkout → purchase drop-off rates with percentages

The funnel analysis is new — it's not in the existing analytics endpoints. It answers a specific question store owners actually have: where am I losing people? The MCP tool returns structured drop-off data that an LLM can reason about and give concrete recommendations from.

### Running the MCP Server

```bash
# In a third terminal, from /backend:
npm run mcp:start
```

The MCP server exposes the four tools above as callable functions for AI agents. It runs on stdio by default and integrates with Claude Desktop or other MCP clients.

The dashboard is the human interface. MCP is the machine interface. For an AI-native product, both matter.

---

## Known Limitations

1. **Auth is simplified.** storeId alone mints a token — no passwords, no user table. Intentional for assignment scope. Production needs real credentials or OAuth.
2. **No transaction between event write and stats write.** A crash between the two creates temporary inconsistency. Fix: wrap in a Prisma transaction, or use a transactional outbox pattern.
3. **SSE doesn't scale horizontally.** In-process EventEmitter only fans out to clients on the same server instance. Fix: Redis pub/sub as the broker.
4. **Top-products still queries raw events.** Fine up to ~10M rows with indexes. Beyond that: dedicated product aggregates or TimescaleDB continuous aggregates.
5. **No PostgreSQL RLS.** Tenant isolation is application-layer only today.

---

## What I'd Add With More Time

- **TimescaleDB continuous aggregates** — replace the manual daily stats table with native time bucketing. More powerful, less operational burden.
- **PostgreSQL Row Level Security** — database-level tenant isolation as a second enforcement layer.
- **Redis pub/sub** — make SSE fan-out work across horizontally scaled API nodes.
- **Transactional outbox** — guarantee consistency between events, stats, and real-time notifications.
- **Richer MCP tools** — inventory alerts, customer segmentation, anomaly detection. The foundation is there.

---

## Time Spent

Approximately 5.5 hours — backend ~1.5h, seed script ~20min, frontend ~1h, design iteration ~30min, MCP server ~45min, README + documentation ~45min.
