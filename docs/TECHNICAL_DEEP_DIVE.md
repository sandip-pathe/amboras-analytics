# Technical Deep Dive

This document is for engineers evaluating Cartograph as a proof-of-work project, an open-source starter, or a base for a real ecommerce analytics tool.

## What Cartograph Is

Cartograph is a real-time ecommerce analytics system with five practical goals:

- accept ecommerce events from stores and connectors
- store raw event history
- keep dashboard reads fast with write-time aggregation
- stream live activity to the dashboard
- expose merchant-friendly signals instead of only raw charts

It is not an attribution engine, warehouse, or full customer data platform. The useful wedge is narrower: live store visibility for custom storefronts, WooCommerce-style stores, and agencies that need a reusable analytics layer.

## Core Data Model

The system has two primary tables.

### `events`

The raw source-of-truth event log.

Important fields:

- `event_id`: idempotency key from the client or connector
- `store_id`: tenant boundary
- `event_type`: `page_view`, `add_to_cart`, `remove_from_cart`, `checkout_started`, or `purchase`
- `timestamp`: when the event happened
- `product_id`: optional product reference
- `amount`: purchase amount when relevant
- `currency`: purchase currency

Indexes:

- `[storeId, timestamp]`
- `[storeId, eventType, timestamp]`

### `store_daily_stats`

The pre-aggregated dashboard table.

One row exists per:

```text
store_id + date + event_type
```

This table powers the overview dashboard, event breakdown, conversion rate, and revenue-over-time chart.

## Write Path

All event ingestion goes through `EventsService.ingestEvent`.

Sources:

- authenticated API: `POST /api/v1/events`
- browser snippet: `POST /api/v1/connectors/track`
- WooCommerce adapter: `POST /api/v1/connectors/woocommerce/orders`
- Shopify adapter: `POST /api/v1/connectors/shopify/orders`

The write path does two things in one Prisma transaction:

1. Insert the raw event.
2. UPSERT the matching daily aggregate row.

If either operation fails, neither operation is committed. This keeps the raw event log and aggregate table consistent.

Duplicate `event_id` values are treated as idempotent skips. That matters for webhook retries: a platform can send the same order webhook twice without double-counting revenue.

## Read Path

The dashboard overview reads from `store_daily_stats`, not from the full `events` table.

For a 90-day view with five event types, the backend reads at most:

```text
90 days * 5 event types = 450 aggregate rows per store
```

That is the core performance idea. Raw events remain available for recent activity, top products, live visitor snapshots, and future drilldowns.

## Connector Layer

Connectors normalize outside ecommerce payloads into the internal event shape.

Implemented connectors:

- public tracking snippet for custom storefronts
- direct public tracking endpoint
- WooCommerce order webhook adapter
- Shopify order webhook adapter

Connector security is intentionally simple for the proof-of-concept:

- dashboard users request a scoped ingest key for their store
- connector writes include `store_id` and `ingest_key`
- the backend derives the expected key with HMAC using `CONNECTOR_INGEST_SECRET`
- a key for one store cannot write into another store
- connector writes cannot read analytics

Production hardening should replace deterministic HMAC keys with stored hashed keys, revocation, last-used timestamps, rate limits, and platform-native webhook signature verification.

## Store Signals

The alerts endpoint is designed around merchant language.

Endpoint:

```text
GET /api/v1/analytics/alerts
```

Current rules:

- high visitors, zero carts
- checkout started, no purchases
- revenue dropped vs yesterday
- top product changed today
- live sale happened

These are computed on read from recent events and daily stats. That keeps the proof simple and avoids another persistence layer. If Cartograph becomes a product, the next step is persisted alert history plus notification channels.

## Real-Time Layer

The live feed uses Server-Sent Events.

Flow:

1. The dashboard opens `GET /api/v1/analytics/live?token=...`.
2. The backend subscribes the request to an in-process event bus.
3. When an event is ingested, the event is emitted.
4. The controller forwards it only to clients whose JWT store matches the event store.
5. The frontend prepends live events into local state and merges them with the initial recent-activity response.

SSE is a good fit because the dashboard receives server updates but does not need bidirectional socket messages.

Production hardening:

- short-lived stream tokens
- Redis Pub/Sub or a broker for multiple backend instances
- heartbeat messages

## Tenant Boundaries

Reads use `req.user.storeId` from the JWT.

Authenticated writes require:

```text
JWT storeId === payload store_id
```

Connector writes require:

```text
ingest_key === expected key for payload store_id
```

This keeps the application-level tenant boundary explicit. PostgreSQL Row Level Security would make it stronger in production.

## Important Files

Backend:

- `backend/src/events/events.service.ts`
- `backend/src/connectors/connectors.service.ts`
- `backend/src/analytics/analytics.service.ts`
- `backend/src/analytics/analytics.controller.ts`
- `backend/prisma/schema.prisma`

Frontend:

- `frontend/app/dashboard/page.tsx`
- `frontend/components/AlertsPanel.tsx`
- `frontend/hooks/useAnalytics.ts`
- `frontend/hooks/useLiveFeed.ts`
- `frontend/lib/api.ts`

Docs:

- `docs/ARCHITECTURE.md`
- `docs/CONNECTOR_ROADMAP.md`
- `docs/DEPLOYMENT.md`
- `docs/PROOF_OF_WORK.md`

## Engineering Tradeoffs

Cartograph intentionally chooses a few simple patterns:

- PostgreSQL instead of a warehouse
- write-time aggregation instead of expensive dashboard scans
- SSE instead of WebSockets
- computed alerts instead of an alert-history table
- deterministic HMAC ingest keys for proof-of-concept simplicity
- demo auth instead of production user management

Those tradeoffs make the system easy to inspect, run, and extend. They also define the next serious production work.

## Production Work Left

Before using Cartograph with real merchant data:

- replace demo auth with real user/org/store auth
- store hashed and revocable ingest keys
- add connector rate limiting
- verify WooCommerce and Shopify webhook signatures
- add PostgreSQL Row Level Security
- replace in-process SSE fanout with Redis Pub/Sub or a broker
- add data retention and privacy controls
- add session/customer identifiers for better live visitor counts
