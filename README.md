# Store Analytics Dashboard

Real-time, multi-tenant analytics dashboard for Amboras store owners. Each store owner logs in, sees only their data, and gets meaningful business insights, not raw event logs.

I built everything the assignment asked for & Bonus Points tasks, plus an **MCP server** that exposes the analytics as AI-callable tools. More on why at the bottom.

---

## 📹 Video Demo
**[Watch the 8-minute walkthrough on YouTube](https://youtu.be/ZPBcP68M4h8)**
![alt text](image.png)

---

## Setup Instructions

**You'll need:** Node 18+, PostgreSQL running locally.

### 1. Clone & Set up Backend
```bash
git clone https://github.com/your-username/amboras-analytics.git
cd amboras-analytics/backend
npm install
cp .env.example .env
```
Ensure your `.env` has:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amboras_analytics?schema=public"
JWT_SECRET="dev-secret-change-in-production"
```
```bash
npx prisma migrate dev
npx prisma db seed    # speeds ~100k events, prints JWT tokens for login!
npm run start:dev     # runs on http://localhost:3001
```

### 2. Set up Frontend
```bash
cd ../frontend
npm install
cp .env.example .env.local
```
Ensure `.env.local` has:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```
```bash
npm run dev           # runs on http://localhost:3000
```

### 3. Log In to Dashboard
1. Go to `http://localhost:3000/login`
2. Look at your Terminal 1 (Backend start) for the Seed output.
3. Enter the Store ID (e.g. `store_alpha`) and paste the generated JWT Token.
4. Submit — you are now logged in!

### 4. Optional: Run MCP Server
In a third terminal:
```bash
cd backend
npm run mcp:start 
```

---

## Architecture Decisions

### Data Aggregation Strategy
- **Decision:** Write-time pre-aggregation instead of read-time computation. Every event ingestion also UPSERTs into a `store_daily_stats` table (one row per store, per day, per event type) using atomic `ON CONFLICT DO UPDATE` increments.
- **Why:** The hard constraint was keeping the overview endpoint under <500ms "even with millions of events." A naive read-time SQL approach (`SELECT SUM...`) scales linearly with row count, meaning load times slow down precisely as exactly as the customer succeeds. Reading from pre-computed daily buckets turns tens of millions of rows into a maximum of 450 rows per 90-day window. O(1) latency regardless of scale.
- **Trade-offs:** We sacrifice write-path simplicity. Every event write now creates write amplification (hitting two tables). A crash between the two writes could create a temporary inconsistency window (raw vs stats). I gained immense read-speed guarantees at the cost of eventual outbox/transaction complexity required for production.

### Real-time vs. Batch Processing
- **Decision:** Real-time push using Server-Sent Events (SSE) combined with an application-layer `EventEmitter`.
- **Why:** I deliberately chose not to use WebSockets. This dashboard is strictly unidirectional (Data streams Server -> Client, client never sends socket messages back). SSE runs over standard HTTP, leverages native browser reconnection APIs, and bypasses the handshake overhead of WebSockets. NestJS pairs this cleanly with RxJS Observables.
- **Trade-offs:** Gained pure protocol simplicity. Sacrificed bidirectional capability (unnecessary here anyway). The current implementation uses an in-memory event emitter, meaning horizontal scale-out would break real-time routing unless bounded to Redis Pub/Sub, but the pattern established cleanly supports swapping brokers later. 

### Frontend Data Fetching
- **Decision:** Total separation of pipelines: **React Query** manages historical aggregate data (snapshot), while a raw **custom React Hook + EventSource** connection manages the real-time event feed (patch).
- **Why:** Mixing real-time patches into React Query's background cache mechanisms caused race conditions. Background invalidations (`stale-while-revalidate`) would continually overwrite prepend arrays sourced from the SSE connection. By splitting them, React Query definitively owns absolute truths, and the dedicated `useLiveFeed` handles pure un-persisted UI increments safely.
- **Trade-offs:** We manage two sets of network boundaries instead of one unified data stream. It increases boilerplate marginally, but drastically guarantees pure component rendering cycles and predictable scope.

### Performance Optimizations
- **Database Indexing:** Raw database queries (`Recent Activity`, `Top Products`) utilize strict composite indexes spanning `[store_id, timestamp]` and `[store_id, event_type, timestamp]`.
- **Stale-While-Revalidate Caching:** Frontend React-Query components mask slow fetches by caching and passively updating data in 60-second background windows.
- **Aggregated Polling:** "Live Visitors" snapshot avoids heavy recalculations. It polls aggregated snapshot data with 10-second intervals rather than piping every page view individually through the DOM.
- **Micro-caching:** Rate-limiting UI layout reflows down to sliced arrays limits the DOM nodes rendered at any single sequence to a maximum of 20 elements. 


Measured with `curl` against 100,000 seeded events:
- `GET /api/v1/analytics/overview`: **126ms** (Reads ~450 rows from `store_daily_stats`)
- `GET /api/v1/analytics/top-products`: **52ms** (Indexed scan limit)
- `GET /api/v1/analytics/recent-activity`: **38ms** (`LIMIT 20` on exact timestamps)

All stay exceptionally safe below 500ms.

---

## Known Limitations

1. **Authentication shortcut:** For demo scope, submitting a storeId inherently validates standard. Real scope requires true user verification and non-exposable tokens.
2. **SSE Custom Headers:** Browser `EventSource` lacks native Header parameters for Authorization. It currently passes JWTs via URL query params (`?token`). In production, this would leverage ephemeral Short-Lived handshake tokens.
3. **Database Consistency:** No Prisma Transaction wrapper currently exists bridging the `events` inject and `store_daily_stats`. A network interruption could offset stats.
4. **Horizontal Scalability:** SSE and Local memory Node mapping limits real-time scaling to vertical instances. 
5. **Data Row Level Security:** Tenant Isolation filters app side via Guard tokens, missing the robust database level RLS configurations PostgreSQL supports natively.

---

## What I'd Improve With More Time

- **TimescaleDB Continuous Aggregates:** Manually maintaining our `store_daily_stats` table demonstrates the mechanic. Doing it with Native TimescaleDB automates temporal bucketing via hyper-tables perfectly.
- **PostgreSQL RLS (Row Level Security):** Setting hard security barriers via User Token injection directly into PG.
- **Redis Pub/Sub:** Swapping Node's memory event emitter for Redis guarantees multi-cluster node propagation.
- **Transactional Outbox Pattern:** Hard fail-safes linking the `event` commit and external `stat` aggregate pipeline reliably.
- **Rich AI-Tooling:** Additional MCP tools allowing the agent to set alert triggers ("Ping me if Conversion Drops past X%").

---

## Time Spent

Approximately 4 hours - backend ~1.5h, seed script ~10min, frontend ~1h, design iteration ~30min, MCP server ~30min, README + documentation ~30min.
