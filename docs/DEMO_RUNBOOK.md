# Demo Runbook

Use this when recording a walkthrough, sharing a demo with someone, or testing the hosted PoC.

## Local Demo

Terminal 1:

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Terminal 2:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Browser:

1. Open `http://localhost:3000/login`.
2. Use `store_alpha`.
3. Generate access token.
4. Land on `/dashboard`.

## Docker Demo

From the repo root:

```bash
docker compose up --build
```

Then seed the Docker database:

```bash
docker compose exec backend npx prisma db seed
```

Open:

- frontend: `http://localhost:3000`
- backend health: `http://localhost:3001/api/v1/health`

## Trigger Live Events

From `backend`:

```bash
npm run demo:live
```

Useful options:

```bash
STORE_ID=store_alpha EVENT_COUNT=50 INTERVAL_MS=800 npm run demo:live
```

For hosted demos:

```bash
API_URL=https://your-backend-domain STORE_ID=store_alpha npm run demo:live
```

Watch the "Live Right Now" feed in the dashboard while the script runs.

## Walkthrough Talk Track

1. Show the dashboard first.
2. Explain the merchant question: "what is happening in my store right now?"
3. Show revenue cards, conversion, top products, and live activity.
4. Run `npm run demo:live`.
5. Watch new events appear without refresh.
6. Open `events.service.ts` and explain raw event insert plus daily aggregate UPSERT.
7. Open `analytics.service.ts` and explain why overview reads aggregate rows.
8. Mention limitations: demo auth, estimated live visitors, in-process SSE bus.
9. Close with the market wedge: open-source live analytics starter for custom/WooCommerce storefronts.

## Demo Reset

To reseed local Postgres:

```bash
cd backend
npx prisma db seed
```

To reset Docker Postgres:

```bash
docker compose down -v
docker compose up --build
```

Then seed again.
