# 6 Prompts — Amboras Analytics Dashboard

> Paste each prompt into Copilot / Cursor as you work.
> Complete each prompt fully and verify it works before moving to the next.
> Each prompt tells you exactly what "done" looks like.

---

## Prompt 1 — Scaffold + Schema + DB Connection

```
We're building a full-stack analytics dashboard called Amboras.

Project root has two folders: backend/ (NestJS) and frontend/ (Next.js).
We are working in the backend/ folder right now.

Please do the following:

1. Initialize a NestJS project in backend/ with TypeScript. Use npm.

2. Install these packages:
   - @nestjs/config
   - @nestjs/jwt
   - @nestjs/passport
   - @nestjs/event-emitter
   - @nestjs/swagger
   - passport
   - passport-jwt
   - @types/passport-jwt
   - class-validator
   - class-transformer
   - @prisma/client
   - prisma (dev dependency)
   - @paralleldrive/cuid2

3. Initialize Prisma with PostgreSQL.

4. Write this exact Prisma schema:

   Two models:
   
   Event model — stores raw events, append-only:
   - id: cuid, primary key
   - eventId: string, unique (maps to "event_id")
   - storeId: string (maps to "store_id")
   - eventType: EventType enum (maps to "event_type")
   - timestamp: DateTime
   - productId: optional string (maps to "product_id")
   - amount: optional Decimal(10,2)
   - currency: optional string
   - createdAt: DateTime, default now (maps to "created_at")
   - Indexes: [storeId, timestamp] and [storeId, eventType, timestamp]
   - Maps to table "events"

   StoreDailyStat model — pre-aggregated stats, one row per (store, date, eventType):
   - id: cuid, primary key
   - storeId: string (maps to "store_id")
   - date: DateTime @db.Date
   - eventType: EventType enum (maps to "event_type")
   - count: Int, default 0
   - revenue: Decimal, default 0, @db.Decimal(10,2)
   - Unique constraint: [storeId, date, eventType]
   - Index: [storeId, date]
   - Maps to table "store_daily_stats"

   EventType enum values: page_view, add_to_cart, remove_from_cart, checkout_started, purchase

5. Create a PrismaModule and PrismaService (global module that exports PrismaService).

6. Set up ConfigModule globally in AppModule.

7. Install EventEmitterModule.forRoot() in AppModule.

8. In main.ts:
   - Enable CORS for http://localhost:3000
   - Add global ValidationPipe with transform: true and whitelist: true
   - Set global prefix to "api/v1"
   - Read port from environment, default 3001

9. Create a .env file with:
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amboras"
   JWT_SECRET="dev-secret-change-in-production"
   JWT_EXPIRES_IN="7d"
   PORT=3001

10. Run `prisma migrate dev --name init` to create the tables.

Done when:
- `npm run start:dev` runs without errors
- Prisma migration has been applied (tables exist in DB)
- GET http://localhost:3001/api/v1 returns something (even 404 is fine, it means the server is up)
```

---

## Prompt 2 — Auth Module

```
The backend NestJS app is running. Prisma is set up with the events and store_daily_stats tables.

Now build the Auth module. Here's exactly what it needs to do:

This is a demo auth system — no user table, no passwords.
POST /auth/token takes a { storeId: string } body and returns { access_token: string }.
The JWT payload is: { sub: storeId, storeId }.
Document this as a dev-only simplification.

Build:

1. AuthModule, AuthController, AuthService

2. JwtStrategy (passport-jwt):
   - Extract JWT from TWO places (in this order):
     a. Authorization: Bearer <token> header  
     b. req.query.token (query param fallback)
   - The query param fallback is REQUIRED because the browser's native EventSource API
     cannot send custom headers. The SSE endpoint uses this.
   - Validate against JWT_SECRET from ConfigService
   - Return { storeId } as req.user

3. JwtAuthGuard extending AuthGuard('jwt')

4. AuthController:
   - POST /auth/token
   - Body: { storeId: string } — validate with class-validator
   - Returns: { access_token: string }
   - No guard on this endpoint (it's the login endpoint)

5. Register JwtModule with ConfigService, PassportModule in AuthModule.
   Export JwtAuthGuard so other modules can use it.

Done when:
- POST http://localhost:3001/api/v1/auth/token with body { "storeId": "store_alpha" }
  returns a { access_token: "eyJ..." } response
- Decoding the JWT at jwt.io shows { sub: "store_alpha", storeId: "store_alpha" }
```

---

## Prompt 3 — Event Ingestion

```
Auth module is working. POST /auth/token returns a JWT.

Now build the Events module. This is the most architecturally important part.

The event shape coming in from external sources looks like this:
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

Build POST /api/v1/events with this logic:

1. Create a DTO (CreateEventDto) that validates this exact shape using class-validator.
   The "data" field is optional and nested. Validate product_id, amount, currency as optional fields inside it.

2. In EventsService.ingestEvent():

   Step A — Write the raw event to the events table via Prisma.

   Step B — UPSERT into store_daily_stats.
   
   This is critical — use Prisma $executeRaw.
   
   IMPORTANT: Generate the row ID using createId() from @paralleldrive/cuid2 in TypeScript 
   BEFORE the SQL call. Do NOT call any ID generation function inside the SQL string.
   
   Normalize the timestamp to start-of-day (midnight UTC) for the date field.
   
   The UPSERT SQL:
   - INSERT a new row with count=1 and revenue=(amount if purchase, else 0)
   - ON CONFLICT (store_id, date, event_type) DO UPDATE: increment count by 1, add revenue
   
   Step C — Emit 'event.ingested' via EventEmitter2 with the event data
   (eventId, storeId, eventType, timestamp, amount, productId).

3. Protect POST /events with JwtAuthGuard.

4. EventsModule must import PrismaModule. EventEmitter2 is available globally.

Done when:
- POST /api/v1/events with a valid JWT (Bearer token) and a purchase event body
  succeeds (201 response)
- Checking the DB: one row in "events" table
- Checking the DB: one row in "store_daily_stats" with correct count and revenue
- POST the same event again: store_daily_stats row shows count=2 and doubled revenue
  (the UPSERT is working)
```

---

## Prompt 4 — Analytics Endpoints + SSE

```
Event ingestion works. store_daily_stats is being populated correctly.

Now build the Analytics module with 4 endpoints. Three are HTTP, one is SSE.

IMPORTANT ARCHITECTURE NOTE:
The overview endpoint MUST read from store_daily_stats only — not the events table.
That's the whole point. store_daily_stats has ~150 rows for a store. events has millions.
Reading from the wrong table defeats the entire performance architecture.

All endpoints are protected by JwtAuthGuard. All queries are scoped to req.user.storeId.

---

ENDPOINT 1: GET /api/v1/analytics/overview

Query store_daily_stats for all rows WHERE storeId = req.user.storeId AND date >= 30 days ago.

Then compute in application code (not in SQL):
- revenue.today = SUM(revenue) where date = today and eventType = 'purchase'
- revenue.thisWeek = SUM(revenue) where date >= start of this week and eventType = 'purchase'  
- revenue.thisMonth = SUM(revenue) where date >= first of this month and eventType = 'purchase'
- conversionRate = (total purchase count / total page_view count) * 100, rounded to 2 decimals
- eventsByType = SUM(count) for each eventType across all 30 days
- revenueByDay = array of { date: string, revenue: number } one entry per day, sorted ascending

Return shape:
{
  revenue: { today: number, thisWeek: number, thisMonth: number },
  conversionRate: number,
  eventsByType: { page_view: number, add_to_cart: number, remove_from_cart: number, checkout_started: number, purchase: number },
  revenueByDay: [{ date: string, revenue: number }]
}

---

ENDPOINT 2: GET /api/v1/analytics/top-products

Raw SQL against the events table (this is fine — it's filtered and indexed):
SELECT product_id, SUM(amount) as revenue, COUNT(*) as orders
FROM events
WHERE store_id = $storeId AND event_type = 'purchase'
  AND timestamp >= NOW() - INTERVAL '30 days'
  AND product_id IS NOT NULL
GROUP BY product_id
ORDER BY revenue DESC
LIMIT 10

Return shape: { products: [{ productId: string, revenue: number, orders: number }] }

---

ENDPOINT 3: GET /api/v1/analytics/recent-activity

Prisma query: events WHERE storeId = req.user.storeId ORDER BY timestamp DESC TAKE 20

Return shape: { events: [{ eventId, eventType, timestamp, amount, productId }] }

---

ENDPOINT 4: GET /api/v1/analytics/live  (SSE)

Use NestJS @Sse() decorator. Returns Observable<MessageEvent>.

When a client connects, subscribe to EventEmitter2's 'event.ingested' event.
Filter: only forward events where event.storeId === req.user.storeId.
On client disconnect (unsubscribe), remove the listener.

The JwtAuthGuard already handles token from query param (?token=xxx), so auth just works here.

---

AnalyticsModule imports: PrismaModule.
EventEmitter2 is injectable because EventEmitterModule.forRoot() is in AppModule.

Done when:
- GET /api/v1/analytics/overview returns the correct shape (values may be 0 — seed comes next)
- GET /api/v1/analytics/top-products returns { products: [] }
- GET /api/v1/analytics/recent-activity returns { events: [] }
- In a browser or Postman, opening the SSE endpoint with a token query param
  shows an open connection (it just hangs open — that's correct)
```

---

## Prompt 5 — Seed Script + Frontend Setup

```
The entire backend is working. All 4 analytics endpoints return correct shapes.

Two tasks in this prompt: seed script, then frontend bootstrap.

---

TASK A: Seed Script (backend/prisma/seed.ts)

Write a seed script that:

Stores:
- store_alpha, store_beta, store_gamma

Products: 20 products, IDs like prod_001 through prod_020

Event type weights: page_view 65%, add_to_cart 15%, remove_from_cart 5%, checkout_started 7%, purchase 8%

Generate 100,000 events total across all stores.
Spread timestamps across the last 90 days. Bias toward recent: generate a random number of
days back using Math.pow(Math.random(), 2) * 90 to get exponential recency bias.

For each event:
- If purchase: pick a random product, amount between $10 and $500 (random float, 2 decimals)
- Otherwise: no product, no amount

Write each event to both tables — first insert into events, then UPSERT into store_daily_stats
using the same logic as the ingestion service. Use raw SQL for the UPSERT.

Batch the event inserts in chunks of 500 using createMany for performance.
The store_daily_stats UPSERTs must happen one by one (they're incremental).

At the end, generate a JWT for each store using the same JWT_SECRET and log it:
console.log('store_alpha token:', sign({ sub: 'store_alpha', storeId: 'store_alpha' }, JWT_SECRET))
(use jsonwebtoken package or the same JWT setup as the auth service)

Add "prisma": { "seed": "ts-node prisma/seed.ts" } to package.json.
Run with: npx prisma db seed

---

TASK B: Frontend Bootstrap (work in frontend/ folder)

1. Create Next.js app with TypeScript, App Router, Tailwind CSS.

2. Install: @tanstack/react-query@4  recharts  @tanstack/react-query-devtools

3. Create frontend/.env.local:
   NEXT_PUBLIC_API_URL=http://localhost:3001

4. Set up React Query provider in app/layout.tsx (client component wrapper).

5. Create lib/api.ts — a fetch wrapper that:
   - Reads base URL from NEXT_PUBLIC_API_URL
   - Reads JWT from localStorage (key: 'amboras_token')
   - Attaches Authorization: Bearer <token> header
   - Throws an error with the response status if response is not ok
   - Exports typed functions: getOverview(), getTopProducts(), getRecentActivity()
   - Also exports postToken(storeId: string) for login (no auth header needed here)

6. Create hooks/useAuth.ts:
   - Reads token from localStorage
   - Provides: { token, storeId, login(token), logout() }
   - login() saves to localStorage, logout() clears it
   - Use useState + useEffect to sync with localStorage

7. Root page.tsx: check for token in localStorage, redirect to /dashboard if present, /login if not.

8. Create app/login/page.tsx:
   - A single text input for storeId
   - A submit button
   - On submit: call POST /auth/token, save the token, redirect to /dashboard
   - Show error if it fails
   - Keep it clean and dark-themed

Done when:
- npx prisma db seed runs successfully and logs 3 JWTs to console
- Query the DB: store_daily_stats should have ~1,350 rows (3 stores × 90 days × 5 types = max 1,350)
- GET /api/v1/analytics/overview with a seeded store's JWT returns real revenue numbers (not zeros)
- npm run dev in frontend/ starts without errors
- Visiting http://localhost:3000/login shows the login page
- Entering a storeId and submitting redirects to /dashboard (will be blank — that's fine)
```

---

## Prompt 6 — Dashboard UI + Live Feed

```
Everything is wired up. Seed data is in the DB. Frontend auth works.
Now build the actual dashboard.

---

HOOKS first (src/hooks/):

useAnalytics.ts:
  Three React Query calls in parallel using useQuery:
  - queryKey: ['overview'] → getOverview()  — refetchInterval: 60_000
  - queryKey: ['top-products'] → getTopProducts()  — refetchInterval: 60_000
  - queryKey: ['recent-activity'] → getRecentActivity()  — staleTime: Infinity (SSE handles freshness)
  Export all three results.

useLiveFeed.ts:
  Takes initialEvents from the recent-activity query as a param.
  Manages two state pieces:
  - liveEvents: events that have arrived via SSE (useState, starts empty)
  - isConnected: boolean
  
  On mount: open EventSource to `${API_URL}/api/v1/analytics/live?token=${token}`
  On message: parse JSON, prepend to liveEvents, keep only latest 20
  On error: set isConnected false
  On open: set isConnected true
  On unmount: source.close()

  Return: { 
    events: [...liveEvents, ...(initialEvents ?? [])].slice(0, 20),
    isConnected 
  }

---

COMPONENTS (src/components/):

MetricCard.tsx:
  Props: label, value (formatted string), sublabel (optional)
  Clean card with a subtle border, large value text, small label above

RevenueChart.tsx:
  Props: data (array of { date: string, revenue: number })
  Recharts LineChart — 30 days of revenue
  X-axis: abbreviated date (MMM DD), Y-axis: dollar values
  Line color: #10b981

EventTypeChart.tsx:
  Props: eventsByType object
  Recharts BarChart — one bar per event type
  Colors: page_view #6366f1, add_to_cart #f59e0b, remove_from_cart #ef4444, checkout_started #8b5cf6, purchase #10b981

TopProducts.tsx:
  Props: products array
  Clean table: Rank | Product ID | Revenue | Orders
  Rank shown as #1, #2, etc. Revenue formatted as currency.

RecentActivity.tsx:
  Props: events array, isConnected boolean
  Scrollable feed, latest event at top
  Each row: colored badge for event type + event type name + timestamp (relative: "2s ago") + amount if purchase
  Show a pulsing green dot if isConnected, grey dot if not
  When new events arrive, they should visually appear at the top (CSS transition: opacity + translateY)

---

DASHBOARD PAGE (app/dashboard/page.tsx):

"use client" — this is a client component.

Check auth on mount: if no token, redirect to /login.

Layout (dark theme, bg-gray-950):

Header:
  Left: Store name (derive from storeId) + "Analytics Dashboard"
  Right: Live indicator (pulsing green dot + "Live" text, or grey "Connecting...")

Row 1 — 3 MetricCards side by side:
  Today's Revenue | This Week | This Month

Row 2 — Conversion rate as a standalone stat:
  Big number centered, with label "Conversion Rate" and sub-label "purchases ÷ page views, last 30 days"

Row 3 — Two charts side by side:
  RevenueChart (60% width) | EventTypeChart (40% width)

Row 4 — Two panels side by side:
  TopProducts (50%) | RecentActivity (50%)

Loading state: show skeleton placeholders (gray animated pulse) while data is fetching.
Error state: show a simple error message with a retry button.

---

FINAL WIRING:

In the dashboard page:
1. Call useAnalytics() to get overview, topProducts, recentActivity data
2. Call useLiveFeed(recentActivity?.events) to get the merged live feed
3. Pass data down to each component

---

Done when:
- Dashboard loads and shows real revenue numbers from seed data
- All three revenue cards show different non-zero values
- Charts render with data
- Top products table shows 10 products
- Recent activity shows 20 events
- Open a new terminal and POST a purchase event to the backend with a store_alpha JWT
  — the event should appear at the top of the live activity feed without refreshing the page
- Open Chrome devtools → Network tab → filter by "EventStream" — you should see the SSE connection
  and events flowing through it in real time
```

---

## After All 6 Prompts — Before README and Video

Run this in the backend to measure your actual performance:

```bash
# Get a token first
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"storeId":"store_alpha"}' | jq -r '.access_token')

# Measure each endpoint
curl -s -w "\nTime: %{time_total}s\n" -o /dev/null \
  http://localhost:3001/api/v1/analytics/overview \
  -H "Authorization: Bearer $TOKEN"

curl -s -w "\nTime: %{time_total}s\n" -o /dev/null \
  http://localhost:3001/api/v1/analytics/top-products \
  -H "Authorization: Bearer $TOKEN"

curl -s -w "\nTime: %{time_total}s\n" -o /dev/null \
  http://localhost:3001/api/v1/analytics/recent-activity \
  -H "Authorization: Bearer $TOKEN"
```

Put the actual numbers in your README. They are your proof.
