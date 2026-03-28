# Amboras Analytics — Copilot Vibe Coding Instructions

## Project Overview
Amboras Analytics is a real-time, multi-tenant eCommerce analytics dashboard. 
The core architectural principle is **write-time aggregation**. We push heavy lifting to the ingestion phase to keep read queries blazing fast (<50ms).

## Tech Stack
**Backend:** NestJS, TypeScript, Prisma, PostgreSQL, `@nestjs/event-emitter`, `@nestjs/jwt`.
**Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query v4, Recharts.

## Architectural Rules (CRITICAL)
- **Zero-computation reads:** The Analytics `overview` endpoint MUST read entirely from the `store_daily_stats` table. NEVER query the raw `events` table for overview stats.
- **Event Ingestion UPSERT:** When logging an event, write to the `events` table AND `UPSERT` into `store_daily_stats` within the same flow using `$executeRaw`.
- **Primary Keys out of DB:** Generate `cuid()` IDs in TypeScript *before* passing them into raw SQL queries.
- **Real-time Feed:** Use Server-Sent Events (SSE) via NestJS `@Sse()` decorator. The event payload is broadcast via `@nestjs/event-emitter`.
- **Simplified Auth:** Token endpoints just take `storeId` and return a JWT. The payload is `{ sub: storeId, storeId }`. `JwtAuthGuard` must check both `Authorization: Bearer` and `?token=` query parameters (needed for SSE).

## UI/UX Preferences
- **Theme:** Strict Next.js/Vercel-inspired minimal UI (subtraction-based styling).
- **Colors:** Black (`#000`) base, dim body text (`#888`), thin borders (`border-gray-800` or similar), and extremely restrained accent usage.
- **Spacing:** Subtle padding rhythms. Let elements breathe using structured margins/paddings.
- **Data Visualization:** Clean Recharts with specific event colors (page_view: `#6366f1`, add_to_cart: `#f59e0b`, remove_from_cart: `#ef4444`, checkout_started: `#8b5cf6`, purchase: `#10b981`).
- **CTAs:** Informational terminal commands (e.g., "pip install anaya") should copy to clipboard instead of navigating.

## Coding Style
- Write concise, explicit, and functional TypeScript.
- No class properties for injection where constructor injection is available.
- For React components: Use Server Components by default. Add `"use client"` only when hooks or interactivity (like React Query or SSE) are required. 
- Gracefully handle errors and loading states (skeletons preferred over spinners).
