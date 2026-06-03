# Deployment Guide

This guide prepares Cartograph for a hosted proof-of-concept. It assumes a simple split deployment:

- Frontend: Vercel
- Backend: Render or Railway
- Database: Neon Postgres

Other platforms work as long as they provide a public backend URL and a PostgreSQL connection string.

## 1. Prepare The Database

Create a PostgreSQL database and copy the connection string.

Recommended for a lightweight PoC:

- Neon Postgres
- Supabase Postgres
- Railway Postgres
- Render Postgres

Set:

```env
DATABASE_URL="postgresql://..."
```

Then run migrations from a local machine or deploy shell:

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
```

For a public demo, keep the seeded stores:

- `store_alpha`
- `store_beta`
- `store_gamma`

## 2. Deploy The Backend

Option A: use the included Render Blueprint.

1. Push the repo to GitHub.
2. Create a Render Blueprint from `render.yaml`.
3. Set `CORS_ORIGINS` to the deployed frontend URL after the frontend is live.
4. Trigger a backend deploy.

Option B: configure the backend service manually.

Backend service settings:

- Root directory: `backend`
- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npm run start:prod`

Environment variables:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="replace-with-a-long-random-secret"
CONNECTOR_INGEST_SECRET="replace-with-a-long-random-secret"
PUBLIC_API_URL="https://your-backend-domain"
PORT=3001
CORS_ORIGINS="https://your-frontend-domain.vercel.app,https://your-storefront-domain.com"
```

After deploy, confirm:

```bash
curl https://your-backend-domain/api/v1/health
```

Expected response includes `{"status":"ok"}`. For auth:

```bash
curl -X POST "https://your-backend-domain/api/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"storeId":"store_alpha"}'
```

## 3. Deploy The Frontend

Frontend service settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Output: Next.js default

Environment variables:

```env
NEXT_PUBLIC_API_URL="https://your-backend-domain"
```

After deploy:

1. Open `/login`.
2. Enter `store_alpha`.
3. Generate access token.
4. Confirm `/dashboard` loads.

## 4. Smoke Test The Live Feed

Create a token:

```bash
TOKEN=$(curl -s -X POST "https://your-backend-domain/api/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"storeId":"store_alpha"}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).access_token))")
```

Send a purchase event:

```bash
curl -X POST "https://your-backend-domain/api/v1/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_hosted_demo_001",
    "store_id": "store_alpha",
    "event_type": "purchase",
    "timestamp": "2026-06-02T12:00:00Z",
    "data": {
      "product_id": "prod_012",
      "amount": 249.99,
      "currency": "USD"
    }
  }'
```

Expected:

- response includes `{"success":true,"created":true}`
- live feed shows the event without refresh
- revenue aggregates update after React Query refetch or manual refresh

You can also use the scripted replay from `backend`:

```bash
API_URL=https://your-backend-domain STORE_ID=store_alpha npm run demo:live
```

## 5. Smoke Test A Connector

Mint a scoped connector key:

```bash
CONNECTOR=$(curl -s "https://your-backend-domain/api/v1/connectors/ingest-key" \
  -H "Authorization: Bearer $TOKEN")
INGEST_KEY=$(node -e "const data = JSON.parse(process.argv[1]); console.log(data.ingest_key)" "$CONNECTOR")
```

Send a browser-style event:

```bash
curl -X POST "https://your-backend-domain/api/v1/connectors/track" \
  -H "Content-Type: application/json" \
  -d "{
    \"store_id\": \"store_alpha\",
    \"ingest_key\": \"$INGEST_KEY\",
    \"event_type\": \"add_to_cart\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"data\": {
      \"product_id\": \"prod_012\"
    }
  }"
```

Expected:

- response includes `{"success":true}`
- dashboard recent activity shows the event
- `GET /api/v1/analytics/alerts` returns a valid response

## 6. Docker Local PoC

From the repo root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5432`
- backend on `localhost:3001`
- frontend on `localhost:3000`

Then seed data:

```bash
cd backend
npx prisma db seed
```

## 7. Production Caveats

This hosted PoC is for demos.

Before accepting real merchant data:

- replace demo auth with real users
- store hashed, revocable scoped ingest keys
- add rate limiting to connector ingestion
- verify WooCommerce and Shopify native webhook signatures
- avoid long-lived JWTs in SSE URLs
- add PostgreSQL Row Level Security
- add Redis Pub/Sub for multi-instance live streams
- add privacy and data retention policies

## 8. Public Demo Checklist

- Root README includes demo URL.
- Backend CORS allows frontend domain.
- Seeded demo database has meaningful data.
- Demo token flow works.
- Live event curl works.
- `npm run demo:live` works against the hosted backend.
- Dashboard screenshot is current.
- `_workspace/` is not committed.
