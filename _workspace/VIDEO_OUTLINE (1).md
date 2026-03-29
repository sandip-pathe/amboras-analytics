## PART 1 — DEMO (0:00 – 4:30)

### 0:00 – 0:30 | Opening — one sentence, then show

Don't introduce yourself for 2 minutes. Open with the product.

Say:
> "Hey, so this is the real-time analytics dashboard I built for Amboras store owners.
> I'm just going to show you around the live app real quick, and then jump into the code to show you how a couple of the interesting parts actually work."

That's it. Then go straight to the dashboard.

---

### 0:30 – 1:30 | The Dashboard

You're already logged in. Walk the layout top to bottom. Keep moving —
don't linger on any single thing more than 15 seconds unless it's interesting.

Talk track:
- Point to the 4 metric cards: "Up top we have these main cards—stuff like revenue, conversion rate, and live visitors. These load instantly, and I'll explain the database trick I used for that later."
- Point to conversion rate: "The conversion rate is basically just purchases divided by page views, handled on the backend so the frontend stays dumb."
- Point to the line chart: "Here's the revenue trend over the last 30 days. I seeded some fake history so we actually have something to look at."
- Point to the event type chart: "This shows what people are actually doing. I made sure to translate the raw database event names into plain English, so business owners actually understand it."
- Point to top products: "Down here are the top 10 products, ranked by revenue. If someone makes a purchase, this list updates."
- Point to live feed: "And over on the right is the live feed."

---

### 1:30 – 2:30 | The Money Moment — Live Event Demo

This is the most important 60 seconds of the whole video.

Steps:
1. Show the live feed — activity is there, green dot is live
2. Say: "Actually, let me show you the live feed working right now. I'm going to jump into my terminal and manually fire off a fake purchase event to the backend."
3. Switch to your terminal — paste and run:

```bash
curl -X POST http://localhost:3001/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_STORE_ALPHA_JWT" \
  -d '{
    "event_id": "evt_live_demo_001",
    "store_id": "store_alpha",
    "event_type": "purchase",
    "timestamp": "2026-03-28T13:00:00Z",
    "data": {
      "product_id": "prod_012",
      "amount": 249.99,
      "currency": "USD"
    }
  }'
```

4. Switch back to the dashboard — the event appears in the feed
5. Say: "And boom... there it is. Popped up instantly. I didn't even have to refresh, and I didn't use heavy WebSockets either. It's just Server-Sent Events—basically the server pushing data the second it gets it."

---

### 2:30 – 3:30 | Date Range Filter + Multi-tenancy

Show the date range filter briefly:
> "Oh, and let me show you the date filter real quick. You can switch this window to 90 days, and it's still super fast because it's reading from a summarized table, not scanning every single event."

Then — this is important for the multi-tenancy requirement:
> "One really important thing—this whole dashboard is locked down to whoever is logged in. The JWT token has the store ID in it. So if I switch to another store's token..."

Switch to a different store token briefly to show the numbers change.
> "...you'll see totally different numbers. Every single backend query isolates to that store. No accidental data leaks."

---

### 3:30 – 4:30 | Performance Claim

Open Chrome DevTools → Network tab → show the overview request.

Say:
> "If I pop open the network tab, look at this. The main overview request takes like [X] milliseconds, even though there's 100,000 events in my database. The secret is that it literally doesn't query the main events table at all. Let me show you what I mean in the code."

That sentence is the hook into Part 2.

---

## PART 2 — CODE WALKTHROUGH (4:30 – 10:30)

Pick exactly two things. Don't try to walk through everything.
Deep on two > shallow on six.

---

### 4:30 – 7:30 | Thing 1: The Aggregation Architecture

Open `events.service.ts`, navigate to `ingestEvent`.

Talk track:
> "When a new event hits the API, I wrap the entire operation in a database transaction. 
> The first thing it does is save the raw event exactly as it occurred, creating an immutable history."

Point to the Prisma create call.

> "But reading millions of raw events to power the dashboard would be too slow. So, in that exact same transaction, it updates a daily summary table. It increments the visitor count, or if it's a purchase, it adds to the daily revenue."

Point to the $executeRaw UPSERT.

> "Because of this, when the dashboard loads, the backend doesn't touch the massive events table. It just reads the pre-calculated daily totals. That means the dashboard loads instantly whether you have a hundred events or ten million."

Pause. Let that land.

> "I still query the raw events directly for the 'Top Products' list, because that requires grouping by individual items. But splitting the heavy analytics into daily roll-ups is what keeps the main dashboard fast."

Optional one-liner to prove real-time path is event-driven:
> "And once that transaction commits successfully, the system immediately fires off an internal event, which gets pushed right to the live dashboard."

If you want to go deeper, mention what you'd add with more time:
> "In production I'd replace this manual pattern with TimescaleDB
> continuous aggregates — same idea, but more powerful and handles
> arbitrary time bucketing natively."

---

### 7:30 – 10:30 | Thing 2: SSE vs Polling vs WebSockets

Open `analytics.controller.ts`, navigate to the `liveEvents` method.

Talk track:
> "For real-time updates, I chose Server-Sent Events instead of WebSockets.
> The reasoning is simple: the dashboard only receives data—it never sends any back to the server.
> WebSockets force you to pay the overhead of a two-way connection for a one-way problem. SSE is the perfect fit here."

Point to the `@Sse()` decorator and the Observable return.

> "A common problem with streams is security. Here, the real-time endpoint is locked down under the exact same JWT authentication as the rest of the API."

Point to the storeId filter:

> "Most importantly, this stream enforces multi-tenancy. When a store owner connects, the backend reads their store ID from the token and only pipes their specific events down the open connection. There is zero risk of data leaking between tenants."

Then open `jwt.strategy.ts` and say:
> "Because standard browser event sources can't send custom headers, I configured the authentication strategy to accept tokens via the URL query string as well. Simple, secure, and native to the browser."

Then open `frontend/hooks/useLiveFeed.ts` and say:
> "On the client side, a custom React hook manages this connection. It handles re-connecting if the network drops and filters incoming events so the UI updates seamlessly."

Show the DevTools EventStream tab briefly:
> "In the network tab, you can see this single connection staying open permanently. Every time an event occurs, it just flows right in. No heavy polling, no complex handshakes."

---

## PART 3 — REFLECTION (10:30 – 12:00)

Keep this tight. Two things max. Be genuine, not performative.

---

### What was actually challenging

Pick ONE of these real-world issues to talk about. Don't say "CSS was tricky."

Option A (The React Query issue):
> "Honestly, the most annoying part was getting the live feed to play nice with React Query. React Query kept refetching in the background and blowing away the live events I was manually pushing into the UI state in the frontend. I ended up having to tell it to literally never go stale so the two data sources wouldn't fight each other."

Option B (The SQL Gotcha):
> "One weird bug I hit was with the raw SQL for the database UPSERT. I originally tried to generate the unique row IDs right in the SQL string, totally forgetting that `cuid()` is a JavaScript thing, not a database thing. Had to generate them in the TypeScript layer and pass them in."

Either of these shows you actually built it, not just described it.

---

### What you'd do differently

One technical, one product:

Technical:
> "If this were a massive production app, I'd probably add PostgreSQL Row Level Security. Right now, I'm just filtering by `store_id` in the backend code. It works, but if someone forgets one WHERE clause, someone sees another store's data. RLS would literally lock that down at the database level so the app code can't mess it up."

Product:
> "As for features, I think the coolest next step would be setting up an MCP server. Instead of just staring at this dashboard, a store owner could ask their AI assistant, 'Hey, what were my top products this week?' and the AI would just pull exactly this data directly from the backend."

---

### Closing — 15 seconds

> "Anyway, that's pretty much it. I left a bunch more notes in the README about the architecture and the trade-offs I made. Thanks for watching."

Stop recording.

---

## Timing Check

| Section | Target | Hard cap |
|---|---|---|
| Demo | 4:30 | 5:00 |
| Code — Aggregation | 3:00 | 3:30 |
| Code — SSE | 3:00 | 3:30 |
| Reflection | 1:30 | 2:00 |
| **Total** | **12:00** | **14:00** |

If you're running long, cut from the demo section (skip the date range
filter walkthrough). Never cut from the code or reflection — that's
what they're actually evaluating.

---

## The One Thing That Will Make This Video Stand Out

Every other candidate will describe their code.
You will explain *why* you made a decision.

"I used SSE" — description.
"I used SSE because the dashboard is read-only and WebSockets pay the
cost of bidirectional for a one-way problem" — decision.

That's the difference between a developer who builds and an engineer
who thinks. The video is your chance to show which one you are.
