# Launch Checklist

Use this after the repo is pushed and ready to turn into a public proof-of-work project.

## Repository

- [ ] Confirm `_workspace/` is ignored and not visible on GitHub.
- [ ] Confirm README renders correctly on GitHub.
- [ ] Confirm all docs links work.
- [ ] Confirm GitHub Actions CI passes.
- [ ] Add repo topics: `ecommerce`, `analytics`, `nextjs`, `nestjs`, `postgresql`, `mcp`, `sse`, `proof-of-work`.
- [ ] Add a short GitHub repo description.
- [ ] Add the video walkthrough URL to the repo website/sidebar if desired.

## Hosted Demo

- [ ] Create a hosted PostgreSQL database.
- [ ] Deploy backend.
- [ ] Set `DATABASE_URL`, `JWT_SECRET`, `CONNECTOR_INGEST_SECRET`, `PUBLIC_API_URL`, `PORT`, and `CORS_ORIGINS`.
- [ ] Run migrations.
- [ ] Seed demo data.
- [ ] Confirm `GET /api/v1/health` returns `ok`.
- [ ] Deploy frontend.
- [ ] Set `NEXT_PUBLIC_API_URL` to the backend URL.
- [ ] Login with `store_alpha`.
- [ ] Run `API_URL=<backend-url> npm run demo:live` from `backend`.
- [ ] Confirm live events appear without refresh.
- [ ] Mint a connector ingest key for `store_alpha`.
- [ ] Send one `POST /api/v1/connectors/track` event.
- [ ] Confirm Store Signals render on the dashboard.
- [ ] Add the demo URL to the root README.

## Proof Assets

- [ ] Record or update the walkthrough video/GIF.
- [ ] Generate `backend/SCALE_PROOF.md` with `npm run scale:proof`.
- [ ] Add a current dashboard screenshot.
- [ ] Add one short architecture post or thread.

## Outreach

- [ ] Open `docs/COMMUNITY_LAUNCH_KIT.md`.
- [ ] Add GitHub repo description and topics.
- [ ] Pin Cartograph on the GitHub profile.
- [ ] Post one public feedback request.
- [ ] Prepare a list of 30 feedback targets.
- [ ] Send the first 10 feedback messages.
- [ ] Track replies in a simple sheet.
- [ ] Ask specifically whether WooCommerce/custom-store connectors are valuable.
- [ ] Convert repeated feedback into GitHub issues.

## Product Next Steps

- [ ] Store hashed, revocable ingest keys.
- [ ] Add rate limiting to connector ingestion.
- [ ] Verify WooCommerce and Shopify native webhook signatures.
- [ ] Package first WooCommerce install helper.
- [ ] Add Redis Pub/Sub or broker-backed streams.
- [ ] Add PostgreSQL Row Level Security.
