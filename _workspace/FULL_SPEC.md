# Amboras Analytics — Full Context Spec

> This is the architectural brain of the project.
> Read this before starting. Don't follow it like a recipe — understand it, then build.

---

## What We're Building

A real-time analytics dashboard for a multi-tenant eCommerce platform. Store owners log in and see their revenue, conversion rate, top products, and a live activity feed — all loading in under 500ms even with millions of events in the DB.

The hard problem isn't the dashboard. It's making the analytics fast. That's the entire architectural game.

---

## Stack Decisions (Already Made)

| Layer | Choice | Why |
|---|---|---|
| Backend | NestJS + TypeScript | Required by assignment |
| ORM | Prisma | Schema-first, type-safe, clean migrations |
| DB | PostgreSQL | Required |
| Real-time | SSE via `@Sse()` | Dashboard is read-only. SSE is the correct tool for unidirectional push. WebSockets are overkill. |
| Event bus | `@nestjs/event-emitter` | In-process pub/sub to wire ingestion → SSE stream |
| Auth | JWT via `@nestjs/jwt` + `passport-jwt` | storeId lives in the token payload |
| Validation | `class-validator` + `class-transformer` | NestJS idiomatic |
| Frontend | Next.js 14 App Router + TypeScript | Required |
| Styling | Tailwind CSS | Dark theme, utility-first |
| Data fetching | `@tanstack/react-query` v4 | Handles caching, loading, error, background refresh |
| Charts | Recharts | Lightweight, composable, works with React |

---

## The Core Architectural Decision

**Write-time aggregation via a pre-aggregated stats table.**

Every time an event is ingested:
1. Write the raw event to the `events` table (source of truth)
2. UPSERT into `store_daily_stats` — increment the count, add revenue if it's a purchase

The analytics endpoint never touches the `events` table. It reads from `store_daily_stats`, which has at most `(number of stores) × (days) × 5 event types` rows. For 3 stores over 90 days: 1,350 rows. A query on 1,350 rows is always fast regardless of how many events have been ingested.

**This is why the dashboard loads in <50ms even with 10M events.**

The alternative — querying and aggregating the raw events table at read time — is a full index scan that gets slower as data grows. Fine for a demo, wrong architecture.

---

## Folder Structure

```
amboras-analytics/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-auth.guard.ts
│   │   ├── events/
│   │   │   ├── events.module.ts
│   │   │   ├── events.controller.ts
│   │   │   ├── events.service.ts
│   │   │   └── dto/create-event.dto.ts
│   │   └── analytics/
│   │       ├── analytics.module.ts
│   │       ├── analytics.controller.ts
│   │       └── analytics.service.ts
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── dashboard/page.tsx
│   │   ├── components/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   ├── EventTypeChart.tsx
│   │   │   ├── TopProducts.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useAnalytics.ts
│   │   │   └── useLiveFeed.ts
│   │   └── lib/
│   │       ├── api.ts
│   │       └── queryClient.ts
│   └── package.json
├── README.md
└── .env.example
```

---

## Environment Variables

```env
# Backend (.env)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amboras"
JWT_SECRET="dev-secret-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001

# Frontend (.env.local)
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Database Schema

Two tables do all the work.

**`events`** — raw event log, append-only, never updated
- Indexed on `(store_id, timestamp)` — for recent-activity query
- Indexed on `(store_id, event_type, timestamp)` — for top-products query
- These two indexes cover every query that touches this table

**`store_daily_stats`** — pre-aggregated, one row per (store, date, event_type)
- Unique constraint on `(store_id, date, event_type)` — enables the UPSERT
- Indexed on `(store_id, date)` — for the analytics overview query
- This is what makes everything fast

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum EventType {
  page_view
  add_to_cart
  remove_from_cart
  checkout_started
  purchase
}

model Event {
  id        String    @id @default(cuid())
  eventId   String    @unique @map("event_id")
  storeId   String    @map("store_id")
  eventType EventType @map("event_type")
  timestamp DateTime
  productId String?   @map("product_id")
  amount    Decimal?  @db.Decimal(10, 2)
  currency  String?
  createdAt DateTime  @default(now()) @map("created_at")

  @@index([storeId, timestamp])
  @@index([storeId, eventType, timestamp])
  @@map("events")
}

model StoreDailyStat {
  id        String    @id @default(cuid())
  storeId   String    @map("store_id")
  date      DateTime  @db.Date
  eventType EventType @map("event_type")
  count     Int       @default(0)
  revenue   Decimal   @default(0) @db.Decimal(10, 2)

  @@unique([storeId, date, eventType])
  @@index([storeId, date])
  @@map("store_daily_stats")
}
```

---

## Incoming Event Shape

This is what the assignment specifies. Your DTO must match this exactly.

```json
{
  "event_id": "evt_123",
  "store_id": "store_456",
  "event_type": "purchase",
  "timestamp": "2026-03-24T10:30:00Z",
  "data": {
    "product_id": "prod_789",
    "amount": 49.99,
    "currency": "USD"
  }
}
```

---

## Critical: `main.ts` Bootstrap (Do Not Skip)

These three things must be in `main.ts`. Without them, the app breaks in ways that are hard to debug:

```typescript
// 1. ValidationPipe — without this, class-validator decorators do nothing
app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

// 2. CORS — without this, every frontend request fails silently
app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });

// 3. Global prefix
app.setGlobalPrefix('api/v1');
```

---

## Auth Design

This is a demo auth system. The `/auth/token` endpoint takes a `storeId` and returns a JWT. No passwords, no user table. Document this as a known limitation.

JWT payload: `{ sub: storeId, storeId }`

The `JwtAuthGuard` must do two things:
1. Standard: read token from `Authorization: Bearer <token>` header
2. SSE fallback: also read token from `?token=<jwt>` query param

Why the fallback? The browser's native `EventSource` API does not support custom headers. For the SSE endpoint, the token must come via query param. The guard needs to handle both.

```typescript
// In jwt.strategy.ts, configure jwtFromRequest to try both:
jwtFromRequest: ExtractJwt.fromExtractors([
  ExtractJwt.fromAuthHeaderAsBearerToken(),
  (req) => req?.query?.token ?? null,
]),
```

---

## Event Ingestion: The UPSERT

This is the most important piece of code in the backend. Get this right and everything else is trivial.

```typescript
// events.service.ts — ingestEvent method
// Step 1: write raw event to events table
// Step 2: UPSERT into store_daily_stats

// For the UPSERT, use Prisma's $executeRaw.
// Critical: generate the cuid() ID in TypeScript BEFORE the SQL call.
// Do not call cuid() inside the SQL string — it doesn't exist in SQL.

const statId = createId(); // generate outside the query
const date = new Date(dto.timestamp);
date.setUTCHours(0, 0, 0, 0); // normalize to start of day

await this.prisma.$executeRaw`
  INSERT INTO store_daily_stats (id, store_id, date, event_type, count, revenue)
  VALUES (
    ${statId},
    ${dto.store_id},
    ${date},
    ${dto.event_type}::"EventType",
    1,
    ${dto.event_type === 'purchase' ? (dto.data?.amount ?? 0) : 0}
  )
  ON CONFLICT (store_id, date, event_type)
  DO UPDATE SET
    count = store_daily_stats.count + 1,
    revenue = store_daily_stats.revenue + EXCLUDED.revenue
`;

// Step 3: emit to SSE stream
this.eventEmitter.emit('event.ingested', {
  eventId: dto.event_id,
  storeId: dto.store_id,
  eventType: dto.event_type,
  timestamp: dto.timestamp,
  amount: dto.data?.amount ?? null,
  productId: dto.data?.product_id ?? null,
});
```

---

## Analytics Service: Query Logic

### Overview endpoint — reads ONLY from store_daily_stats

Pull all rows for the store in the last 30 days. Then compute everything in application code:

- **Revenue today** = SUM(revenue) WHERE date = today AND eventType = 'purchase'
- **Revenue this week** = SUM(revenue) WHERE date >= start of current week AND eventType = 'purchase'
- **Revenue this month** = SUM(revenue) WHERE date >= first of current month AND eventType = 'purchase'
- **Conversion rate** = total purchase count / total page_view count (last 30 days) × 100
- **Events by type** = SUM(count) grouped by eventType (last 30 days)
- **Revenue by day** = SUM(revenue) WHERE eventType = 'purchase', grouped by date (for line chart)

All of this from at most ~150 rows (30 days × 5 event types). Never touches the events table.

### Top products — raw SQL on events table

```sql
SELECT product_id, SUM(amount) as revenue, COUNT(*) as orders
FROM events
WHERE store_id = $storeId
  AND event_type = 'purchase'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY product_id
ORDER BY revenue DESC
LIMIT 10
```

The `(store_id, event_type, timestamp)` index makes this fast enough.

### Recent activity — simple indexed query

```sql
SELECT * FROM events
WHERE store_id = $storeId
ORDER BY timestamp DESC
LIMIT 20
```

The `(store_id, timestamp)` index makes this trivially fast.

---

## SSE Endpoint

```typescript
// analytics.controller.ts
@Sse('live')
@UseGuards(JwtAuthGuard)
liveEvents(@Req() req): Observable<MessageEvent> {
  return new Observable((observer) => {
    const handler = (event: any) => {
      if (event.storeId === req.user.storeId) {
        observer.next({ data: event } as MessageEvent);
      }
    };
    this.eventEmitter.on('event.ingested', handler);
    // Clean up listener when client disconnects
    return () => this.eventEmitter.off('event.ingested', handler);
  });
}
```

Note: the `AnalyticsModule` must import `EventEmitterModule` to receive events.

---

## Module Wiring (NestJS Dependency Injection)

The most common NestJS mistake for Express developers is forgetting that everything must be explicitly declared.

```typescript
// app.module.ts
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  EventEmitterModule.forRoot(),   // <-- global event bus
  PrismaModule,
  AuthModule,
  EventsModule,
  AnalyticsModule,
]

// prisma.module.ts
// exports: [PrismaService] so other modules can inject it

// events.module.ts
// imports: [PrismaModule]   -- needs PrismaService
// No need to import EventEmitterModule — it's global

// analytics.module.ts
// imports: [PrismaModule]   -- needs PrismaService
// EventEmitter2 is injectable globally once EventEmitterModule.forRoot() is called
```

If Nest throws "can't resolve dependencies of X", it always means one of:
- You forgot to import the module that provides the service
- You forgot to export the service from its module
- You forgot to add the module to app.module.ts

---

## Seed Script Design

**The seed must write to both tables.** This is the most common mistake.

If seed only writes to `events` but analytics reads from `store_daily_stats`, the dashboard shows all zeros. The seed must replicate the same UPSERT logic as the ingestion service.

Parameters:
- 3 stores: `store_alpha`, `store_beta`, `store_gamma`
- 100,000 events total, distributed proportionally across stores
- 90 days of history, biased toward recent dates
- Event type distribution: 65% page_view, 15% add_to_cart, 5% remove_from_cart, 7% checkout_started, 8% purchase
- 20 product IDs cycling through purchases
- Purchase amounts: random between $10 and $500
- At the end: generate and console.log a JWT for each store so you can use them in the frontend

---

## API Response Contracts

```typescript
// GET /api/v1/analytics/overview
{
  revenue: { today: number, thisWeek: number, thisMonth: number },
  conversionRate: number,           // percentage, e.g. 4.2
  eventsByType: {
    page_view: number,
    add_to_cart: number,
    remove_from_cart: number,
    checkout_started: number,
    purchase: number,
  },
  revenueByDay: Array<{ date: string, revenue: number }>  // last 30 days
}

// GET /api/v1/analytics/top-products
{
  products: Array<{ productId: string, revenue: number, orders: number }>
}

// GET /api/v1/analytics/recent-activity
{
  events: Array<{
    eventId: string,
    eventType: string,
    timestamp: string,
    amount: number | null,
    productId: string | null
  }>
}

// SSE stream: /api/v1/analytics/live?token=<jwt>
// Each event is the same shape as recent-activity items
```

---

## Frontend Architecture

### Auth

Simple: login page takes a storeId, calls `POST /auth/token`, stores the JWT in `localStorage`. A `useAuth` hook reads it and provides `{ token, storeId, logout }`. Root page checks for token — redirect to `/dashboard` if present, `/login` if not.

### Data Fetching

React Query v4. Install: `@tanstack/react-query@4`.

Two hooks:
- `useAnalytics()` — fetches all three endpoints in parallel, `refetchInterval: 60_000`
- `useLiveFeed()` — manages the SSE connection + merges with initial recent-activity data

### The Live Feed Hook — Getting This Right

The tricky part: you have two data sources (initial HTTP fetch + ongoing SSE stream) and they need to merge cleanly without React Query overwriting SSE events on background refetch.

Approach:
1. Fetch initial events from `/recent-activity` via React Query (runs once, `staleTime: Infinity`)
2. Open SSE connection, prepend new events to a separate local state array
3. Render: SSE events first (most recent), then initial fetch events below, cap at 20 total
4. On unmount: close `EventSource`

By keeping them in separate state, React Query background refetches don't clobber the live events.

```typescript
// useLiveFeed.ts — concept
const [liveEvents, setLiveEvents] = useState([]);
const { data: initialEvents } = useQuery(['recent'], fetchRecentActivity, {
  staleTime: Infinity,  // don't refetch — SSE handles freshness
});

useEffect(() => {
  const source = new EventSource(
    `${API_URL}/api/v1/analytics/live?token=${token}`
  );
  source.onmessage = (e) => {
    const event = JSON.parse(e.data);
    setLiveEvents(prev => [event, ...prev].slice(0, 20));
  };
  return () => source.close();
}, [token]);

const allEvents = [...liveEvents, ...(initialEvents?.events ?? [])].slice(0, 20);
```

### Dashboard Layout

Dark theme. Clean. Professional. Avoid the generic purple-gradient SaaS template look.

```
┌─────────────────────────────────────────────────────┐
│ [Store Name]                          ● Live         │
├──────────────┬──────────────┬──────────────────────┤
│ Today        │ This Week    │ This Month            │
│ $X,XXX       │ $XX,XXX      │ $XXX,XXX              │
├──────────────┴──────────────┴──────────────────────┤
│ Conversion Rate: 4.2%  (purchases / page views)     │
├────────────────────────┬────────────────────────────┤
│ Revenue (30 days)      │ Events by Type             │
│ [LineChart]            │ [BarChart]                 │
├────────────────────────┼────────────────────────────┤
│ Top Products           │ Live Activity              │
│ rank | id | rev | ord  │ [scrolling event feed]     │
└────────────────────────┴────────────────────────────┘
```

Chart colors:
- page_view: `#6366f1`
- add_to_cart: `#f59e0b`
- remove_from_cart: `#ef4444`
- checkout_started: `#8b5cf6`
- purchase: `#10b981`

---

## Known Limitations to Document

1. Auth has no passwords — storeId alone generates a token. In production this would use a real user system.
2. SSE token-in-query-param is not ideal for production (tokens in server logs). Use HTTP/2 or a handshake token in production.
3. UPSERT is not atomic with the event write — a crash between the two writes leaves events table and stats table temporarily out of sync. Wrap in a transaction or use a message queue in production.
4. In-process EventEmitter doesn't survive horizontal scaling — at multiple instances, SSE events only reach clients connected to the same server. Production fix: Redis pub/sub.
5. Top products query still scans events table — fine for this demo, but at 100M+ events use a separate aggregation table or TimescaleDB continuous aggregates.

---

## What to Measure and Report

After seeding 100k events, run these with `curl -w "\nTime: %{time_total}s\n"` and report the actual numbers in your README:

- `GET /api/v1/analytics/overview` — expect <50ms
- `GET /api/v1/analytics/top-products` — expect <200ms
- `GET /api/v1/analytics/recent-activity` — expect <20ms

These numbers are your proof that the architecture works.
