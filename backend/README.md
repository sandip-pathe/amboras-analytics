# Cartograph Backend

NestJS API for the Cartograph real-time ecommerce analytics dashboard.

## Responsibilities

- Mint demo JWTs for store-scoped access.
- Ingest ecommerce events.
- Ingest custom storefront, WooCommerce, and Shopify connector events.
- Write raw event history to PostgreSQL.
- Maintain daily aggregate stats during ingestion.
- Serve store-scoped analytics endpoints.
- Compute merchant-friendly Store Signals.
- Stream live activity over Server-Sent Events.
- Expose analytics through the MCP stdio server.

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

API base URL: `http://localhost:3001/api/v1`

Health check: `http://localhost:3001/api/v1/health`

## Scripts

- `npm run start:dev`: start the API in watch mode.
- `npm run build`: compile the NestJS app.
- `npm test -- --runInBand`: run unit tests.
- `npm run mcp:start`: start the MCP analytics server.
- `npm run demo:live`: stream synthetic events into a running backend.
- `npm run scale:proof`: generate the optional 2M-event scale proof.

## Key Files

- `src/events/events.service.ts`: event write path and aggregation UPSERT.
- `src/connectors/connectors.service.ts`: scoped ingest keys, tracking snippet, WooCommerce, and Shopify mappers.
- `src/analytics/analytics.service.ts`: store-scoped analytics queries.
- `src/analytics/analytics.controller.ts`: HTTP and SSE endpoints.
- `prisma/schema.prisma`: `events` and `store_daily_stats` schema.
- `scripts/scale-proof.js`: optional 2M-event performance proof.

## Production Notes

The current auth endpoint is intentionally demo-only. A production version should replace it with real user auth, hashed and revocable ingest keys, PostgreSQL Row Level Security, rate limiting, native webhook signature verification, and short-lived stream tokens for SSE.
