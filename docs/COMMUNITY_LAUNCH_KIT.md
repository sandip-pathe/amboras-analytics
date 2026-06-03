# Community Launch Kit

This is the low-maintenance launch kit for Cartograph.

Goal:

- put the repo in front of people who might use or fork it
- ask for feedback without pretending it is a finished SaaS
- make the project discoverable
- avoid turning this into a long-running marketing chore

Repo:

```text
https://github.com/sandip-pathe/Cartograph
```

## Best One-Line Positioning

```text
Cartograph is an open-source real-time ecommerce analytics starter with a Next.js dashboard, NestJS/Postgres backend, live events, Store Signals, and simple WooCommerce/Shopify/custom-store connectors.
```

Shorter:

```text
Open-source real-time ecommerce analytics for custom storefronts and agencies.
```

## Where To Post

Use only a few places. Do not spam every community.

Good first targets:

- GitHub profile pinned repo
- LinkedIn or X/Twitter personal post
- Hacker News "Show HN"
- Reddit communities where self-promotion is allowed
- Indie Hackers product/build-in-public post
- DEV.to or Hashnode technical writeup
- WooCommerce or WordPress developer groups where feedback posts are allowed

Rule of thumb:

- ask for feedback
- disclose that it is open-source/proof-of-work
- do not claim production readiness
- mention the repo clearly
- check each community's self-promotion rules before posting

## Five-Minute GitHub Cleanup

Set repo description:

```text
Open-source real-time ecommerce analytics starter for custom storefronts, WooCommerce, Shopify webhooks, and agencies.
```

Suggested topics:

```text
ecommerce
analytics
woocommerce
shopify
nextjs
nestjs
postgresql
prisma
realtime
self-hosted
mcp
sse
open-source
proof-of-work
```

Pin the repo on the GitHub profile if possible.

## Show HN Draft

Title:

```text
Show HN: Cartograph - open-source real-time ecommerce analytics starter
```

Post:

```text
I built Cartograph, an open-source real-time ecommerce analytics starter.

The idea is simple: store raw ecommerce events, pre-aggregate daily stats at write time, and keep the merchant dashboard fast even as event volume grows.

It includes:
- NestJS + PostgreSQL + Prisma backend
- Next.js dashboard
- Server-Sent Events live activity feed
- browser tracking snippet for custom storefronts
- WooCommerce and Shopify order webhook adapters
- merchant-friendly Store Signals
- MCP tools for AI-readable analytics

This is not an attribution product or a finished SaaS. I built it as proof-of-work and as a starter for agencies/custom storefront teams that need a self-hostable live store pulse.

Repo: https://github.com/sandip-pathe/Cartograph

I would especially appreciate feedback on whether the connector surface is useful enough for WooCommerce/custom storefront projects, and what would make this worth installing.
```

## Reddit / Forum Draft

Use this only where project sharing is allowed.

Title:

```text
I built an open-source real-time ecommerce analytics starter
```

Post:

```text
I built Cartograph, an open-source ecommerce analytics starter for custom storefronts, WooCommerce-style stores, and agencies.

It is focused on live store visibility rather than attribution:
- event ingestion for page views, carts, checkout, and purchases
- write-time daily aggregation so dashboards avoid scanning raw events
- live activity feed with Server-Sent Events
- Store Signals like "checkout started but no purchases" and "live sale happened"
- browser tracking snippet
- WooCommerce and Shopify order webhook adapters
- Next.js dashboard + NestJS/Postgres backend

Repo:
https://github.com/sandip-pathe/Cartograph

I am not selling anything. I am mostly looking for blunt feedback from people who build or run stores:
- Would this be useful as a self-hosted starter?
- Is WooCommerce/custom storefront the right wedge?
- What is missing before you would try it?
```

## WooCommerce / WordPress Developer Draft

Title:

```text
Feedback wanted: open-source live analytics starter for WooCommerce-style stores
```

Post:

```text
I built Cartograph, an open-source real-time ecommerce analytics starter.

The WooCommerce angle:
- order webhooks can map paid orders into purchase events
- dashboard reads come from pre-aggregated stats instead of scanning raw events
- recent activity and Store Signals are written in merchant-friendly language
- the backend is self-hostable with NestJS, Postgres, and Prisma

Repo:
https://github.com/sandip-pathe/Cartograph

It is not production-hardened yet. The current connector uses scoped ingest keys, but still needs hashed/revocable keys, rate limits, and native webhook signature verification before real merchant data.

I would love feedback from WooCommerce devs:
- Is a lightweight external analytics layer useful?
- Would a small plugin for webhook setup be enough?
- What reports/signals should be added first?
```

## DEV.to / Hashnode Article Draft

Title:

```text
Building a real-time ecommerce analytics starter with NestJS, Postgres, Next.js, and SSE
```

Outline:

```text
I built Cartograph as an open-source proof-of-work project: real-time ecommerce analytics for custom storefronts and agencies.

1. Problem
Small stores and agencies often need a simple answer to "what is happening in the store right now?" GA4 is powerful but setup-heavy, and native dashboards may not expose a live event-level view.

2. Architecture
The backend stores raw events and updates daily aggregate rows during ingestion. The dashboard overview reads aggregate rows instead of scanning the raw event table.

3. Write path
Every event write inserts into `events` and UPSERTs into `store_daily_stats` inside one transaction. Duplicate event IDs are treated as idempotent skips for webhook retries.

4. Real-time layer
The dashboard uses Server-Sent Events for live activity. SSE is enough because updates only flow from server to dashboard.

5. Connectors
Cartograph includes a browser snippet plus WooCommerce and Shopify order webhook adapters. These normalize store data into the same event shape.

6. Store Signals
Instead of only charts, the dashboard computes signals like "checkout started but no purchases" and "live sale happened."

7. What is not production-ready
Demo auth, deterministic HMAC ingest keys, no rate limits, no webhook signature verification, in-process SSE fanout.

Repo:
https://github.com/sandip-pathe/Cartograph
```

## LinkedIn / X Draft

```text
I finished Cartograph, an open-source real-time ecommerce analytics starter.

It includes:
- Next.js merchant dashboard
- NestJS + Postgres + Prisma backend
- write-time aggregation for fast dashboard reads
- Server-Sent Events live feed
- browser tracking snippet
- WooCommerce + Shopify order webhook adapters
- Store Signals like live sales and checkout stalls
- MCP tools for AI-readable analytics

I built it as proof-of-work and as a starter for custom storefront/agencies that need a self-hosted live store pulse.

Repo: https://github.com/sandip-pathe/Cartograph

Feedback welcome, especially from people who build WooCommerce/custom ecommerce projects.
```

## Thirty-Minute "Post And Forget" Checklist

Do these once:

- add GitHub repo description
- add GitHub topics
- pin Cartograph on GitHub profile
- post one LinkedIn or X update
- post one Show HN
- post one Reddit/forum feedback request if rules allow it
- add the DEV.to/Hashnode technical article only if you want one longer artifact
- ignore vanity metrics for a week

Do not do this unless replies are actually useful:

- daily reposting
- cold DM spam
- premature Product Hunt launch
- building more features without feedback
- arguing with low-effort comments

## What To Do If Someone Replies

Ask only three things:

```text
1. What kind of store/project do you work on?
2. What would make this worth installing?
3. Which connector should be strongest first: WooCommerce, Shopify, or custom storefront?
```

If the same request appears three times, turn it into a GitHub issue.

If no one replies, the project still works as a public proof-of-work artifact.
