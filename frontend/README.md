# Amboras Frontend

Next.js dashboard for Amboras real-time ecommerce analytics.

## Responsibilities

- Demo login for store-scoped JWTs.
- Merchant-friendly dashboard for revenue, conversion, top products, and live activity.
- React Query snapshot fetching for aggregate data.
- EventSource live feed for real-time activity updates.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Frontend URL: `http://localhost:3000`

## Scripts

- `npm run dev`: start local development.
- `npm run build`: compile production build.
- `npm run lint`: run ESLint.

## Key Files

- `app/dashboard/page.tsx`: dashboard composition and date range state.
- `lib/api.ts`: typed API wrapper.
- `hooks/useAnalytics.ts`: React Query analytics fetches.
- `hooks/useLiveFeed.ts`: SSE connection and feed merge logic.
- `components/`: cards, charts, tables, and live activity UI.

## Production Notes

React Query DevTools are only mounted in development. The hosted demo should point `NEXT_PUBLIC_API_URL` at the deployed backend URL.
