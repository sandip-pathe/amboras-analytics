# Proof-of-Work Checklist

Cartograph is meant to show product thinking and engineering execution. This checklist ties each proof claim to concrete evidence in the repo.

## Product Proof

Claim: The app maps to a real ecommerce analytics pain.

Evidence:

- `docs/MARKET_SCOUT.md`
- `docs/OUTREACH.md`
- merchant-first dashboard language in `frontend/app/dashboard/page.tsx`

## Backend Proof

Claim: The backend can ingest events and keep dashboard reads fast.

Evidence:

- `backend/src/events/events.service.ts`
- `backend/src/analytics/analytics.service.ts`
- `backend/prisma/schema.prisma`
- `backend/scripts/scale-proof.js`

Verification:

```bash
cd backend
npm audit --audit-level=moderate
npm run build
npm test -- --runInBand
```

## Connector Proof

Claim: Real store surfaces can send data without dashboard JWTs.

Evidence:

- `backend/src/connectors/connectors.controller.ts`
- `backend/src/connectors/connectors.service.ts`
- `backend/src/connectors/connectors.service.spec.ts`
- `docs/CONNECTOR_ROADMAP.md`

Verification:

```bash
cd backend
npm test -- --runInBand
```

Manual check:

```bash
curl "http://localhost:3001/api/v1/connectors/ingest-key" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Store Signals Proof

Claim: The dashboard surfaces merchant-friendly operational alerts, not only charts.

Evidence:

- `backend/src/analytics/analytics.service.ts`
- `backend/src/analytics/analytics.service.spec.ts`
- `frontend/components/AlertsPanel.tsx`
- `frontend/app/dashboard/page.tsx`

Verification:

```bash
cd backend
npm test -- --runInBand

cd ../frontend
npm run build
npm run lint
```

Runtime check:

```bash
curl http://localhost:3001/api/v1/health
```

## Tenant Isolation Proof

Claim: Store-scoped tokens cannot write events for another store.

Evidence:

- `backend/src/events/events.service.ts`
- `backend/src/events/events.service.spec.ts`

Verification:

```bash
cd backend
npm test -- --runInBand
```

## Frontend Proof

Claim: The dashboard compiles and presents merchant-friendly analytics.

Evidence:

- `frontend/app/dashboard/page.tsx`
- `frontend/hooks/useAnalytics.ts`
- `frontend/hooks/useLiveFeed.ts`
- `frontend/components`

Verification:

```bash
cd frontend
npm audit --audit-level=moderate
npm run build
npm run lint
```

## Real-Time Proof

Claim: The live feed updates without refreshing.

Evidence:

- `backend/src/analytics/analytics.controller.ts`
- `frontend/hooks/useLiveFeed.ts`

Manual verification:

1. Start backend and frontend.
2. Login as `store_alpha`.
3. Run `npm run demo:live` from `backend`.
4. Confirm it appears in the live feed.

## AI Tooling Proof

Claim: Analytics can be exposed as AI-callable tools.

Evidence:

- `backend/mcp/server.mjs`
- `backend/mcp/README.md`

Verification:

```bash
cd backend
npm run mcp:start
```

## Market Launch Proof

Claim: The project is ready to become a hosted PoC.

Evidence:

- `.github/workflows/ci.yml`
- `.github/ISSUE_TEMPLATE`
- `.github/pull_request_template.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `render.yaml`
- `docker-compose.yml`
- `docs/FINAL_PROJECT_PLAN.md`
- `docs/DEPLOYMENT.md`
- `docs/DEMO_RUNBOOK.md`
- `docs/CONNECTOR_ROADMAP.md`
- `docs/LAUNCH_CHECKLIST.md`

Remaining external dependency:

- hosting credentials and public URLs
