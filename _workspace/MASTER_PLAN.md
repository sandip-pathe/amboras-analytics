# Amboras Assignment — Master Plan

---

## Time Budget (4 hours hard cap)

| Phase | Task | Time |
|---|---|---|
| 0 | Repo setup + scaffold | 15 min |
| 1 | Backend | 90 min |
| 2 | Seed script | 15 min |
| 3 | Frontend | 60 min |
| 4 | Polish + local test | 15 min |
| 5 | README | 20 min |
| 6 | Video | 20 min |
| 7 | Submit | 5 min |

**Total: ~4 hours**

---

## Phase 0 — Repo Setup (15 min)

### Actions
1. Create public GitHub repo: `amboras-analytics`
2. Init the folder structure:
```
amboras-analytics/
├── backend/
├── frontend/
├── README.md
└── .env.example
```
3. Scaffold backend: `nest new backend` (select npm or pnpm)
4. Scaffold frontend: `npx create-next-app@latest frontend` (TypeScript, App Router, Tailwind)
5. Create a root `.gitignore` covering both `node_modules`, `.env` files
6. Push initial empty scaffold commit
7. Copy `.env.example` (refer to Copilot Plan for variables)

---

## Phase 1 — Backend (90 min)

### Order of operations (do this in sequence, not in parallel)

**Step 1.1 — Prisma + DB (15 min)**
- Install Prisma, init with PostgreSQL
- Write the schema (see Copilot Plan for exact schema)
- Run `prisma migrate dev --name init`
- Verify tables exist in DB

**Step 1.2 — Auth module (10 min)**
- Simple JWT strategy: `storeId` in the payload
- A `JwtAuthGuard` that extracts `storeId` from token
- A `/auth/token` endpoint that takes `{ storeId }` and returns a JWT (no password for the demo — it's a dev tool, not a real auth system, document this limitation)

**Step 1.3 — Events module (20 min)**
- `POST /api/v1/events` — ingests a single event
- Validates event shape (class-validator)
- Writes to `events` table
- **Also UPSERTs into `store_daily_stats` table** (this is the key architectural move)
- Don't skip the UPSERT — this is the whole aggregation strategy

**Step 1.4 — Analytics module (30 min)**
- `GET /api/v1/analytics/overview` — reads from `store_daily_stats`, not from `events`
- `GET /api/v1/analytics/top-products` — raw SQL query against `events` table (limited dataset by time window, indexed)
- `GET /api/v1/analytics/recent-activity` — `LIMIT 20 ORDER BY timestamp DESC` on `events`, indexed
- All endpoints protected by `JwtAuthGuard`
- All queries scoped to `req.user.storeId`

**Step 1.5 — SSE endpoint (15 min)**
- `GET /api/v1/analytics/live` — SSE stream using NestJS `@Sse()` decorator
- Uses an in-process EventEmitter (via NestJS `EventEmitter2`)
- When a new event is ingested (Step 1.3), it emits to the stream
- Frontend subscribes and receives new events without polling

---

## Phase 2 — Seed Script (15 min)

**This is not optional. A dashboard with 20 rows proves nothing.**

Write `backend/prisma/seed.ts`:
- 5 fake stores, each gets a JWT logged to console (copy these for frontend testing)
- 100,000 events spread across 90 days
- Realistic distribution: ~70% page_view, ~15% add_to_cart, ~5% remove_from_cart, ~5% checkout_started, ~5% purchase
- 20 fake product IDs cycling through purchases
- Spread timestamps randomly across 90 days with a bias toward recent dates (more recent = more events)

Run `npx ts-node prisma/seed.ts` and verify analytics endpoints return non-trivial data.

---

## Phase 3 — Frontend (60 min)

### Order of operations

**Step 3.1 — Setup (5 min)**
- Install: `@tanstack/react-query`, `recharts`, `axios` (or native fetch)
- Set up React Query provider in root layout
- Set up env variable: `NEXT_PUBLIC_API_URL`

**Step 3.2 — Auth flow (5 min)**
- A simple login page: text input for `storeId`, calls `/auth/token`, stores JWT in localStorage
- A simple `useAuth` hook that reads JWT and decodes storeId
- Redirect to dashboard if logged in, redirect to login if not

**Step 3.3 — Dashboard page (35 min)**

Layout (top to bottom):
1. **Header row** — Store name, "Last updated: X seconds ago"
2. **Revenue cards row** — Today / This Week / This Month (3 cards)
3. **Conversion rate card** — Big number, formula beneath it
4. **Two-column row:**
   - Left: Line chart — Revenue over last 30 days (Recharts `LineChart`)
   - Right: Bar chart — Events by type (Recharts `BarChart`)
5. **Two-column row:**
   - Left: Top products table (product ID + revenue)
   - Right: Recent activity feed (event type + timestamp, live-updating via SSE)

**Step 3.4 — SSE hook (15 min)**
- `useRecentActivity` hook that:
  - Initial load: fetches `/api/v1/analytics/recent-activity` via React Query
  - Then opens SSE connection to `/api/v1/analytics/live`
  - Prepends new events to the list, caps at 20
  - Handles SSE reconnection via `EventSource` native behavior

---

## Phase 4 — Polish + Local Test (15 min)

- Run the app fresh: clear DB, re-seed, open dashboard
- Check every metric looks right against seed data (mental math check)
- Test on mobile viewport (Chrome devtools)
- Check loading states work (slow network in devtools)
- Check error state works (stop the backend, see what happens)
- Fix any broken things

---

## Phase 5 — README (20 min)

Do not write this last-minute. It's 40% of the evaluation.

Structure:
1. Setup instructions (exact commands, no ambiguity)
2. Architecture Decisions — fill each section with your actual reasoning:
   - Data Aggregation: pre-aggregated stats table + why
   - Real-time: SSE + why not WebSockets
   - Multi-tenancy: JWT + application-level + mention RLS
   - Performance: write what you measured (seed 100k rows, endpoint X returns in Yms)
3. Known Limitations (honest ones)
4. What I'd improve with more time
5. Time spent

The README is where you sound like a senior engineer. Write it like you're explaining to a peer, not a professor.

---

## Phase 6 — Video (20 min)

**Don't wing this. Spend 5 min planning what you'll show.**

### Script outline

**Demo (3-5 min)**
- Open the login page, paste a store JWT, hit login
- Dashboard loads — point out the three revenue cards loading fast (mention you have 100k events)
- Scroll down, show the charts
- Open a second terminal, fire a `curl POST /api/v1/events` with a purchase event
- Show it appear in the live feed in real time — this is your money moment
- Open Chrome devtools → Network tab, show the SSE connection staying open

**Code walkthrough (5-8 min)**

Pick two things:
1. The event ingestion + UPSERT pattern (`events.service.ts`) — explain why you write to two tables and what that buys you at read time
2. The SSE implementation — show `@Sse()` decorator, show the EventEmitter wiring, show the frontend hook

**Reflection (2 min)**
- Challenging: getting SSE and React Query to play together (initial load + stream)
- Would do differently: RLS at the DB level instead of application-level filtering

---

## Phase 7 — Submit (5 min)

- Final `git push`
- Check repo is public
- Email: vaibhav@ecomcoder.com
  - Subject: `Sandeep Pathe — Full-Stack Intern Submission`
  - Body: GitHub link, video link, one sentence on what you're most proud of
