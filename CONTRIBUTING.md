# Contributing

Thanks for taking a look at Cartograph.

This project is currently a proof-of-work and early product exploration repo. Contributions are welcome, especially around ecommerce connectors, deployment docs, tests, and production hardening.

## Local Setup

Backend:

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Verification

Before opening a PR, run:

```bash
cd backend
npm audit --audit-level=moderate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
node --check scripts/live-demo.js

cd ../frontend
npm audit --audit-level=moderate
npm run build
npm run lint
```

## Development Notes

- Keep `_workspace/` private and untracked.
- Do not commit `.env` files or real merchant data.
- Keep merchant-facing UI language plain and non-technical.
- Preserve tenant isolation: store-scoped reads and writes must use authenticated store context.
- Use structured APIs/parsers over ad hoc string parsing when possible.
- Keep docs honest about demo auth and production limitations.

## Good First Contributions

- WooCommerce connector spike.
- Store ingest-key design.
- Alert rule proof of concept.
- Redis Pub/Sub replacement for in-process SSE events.
- Hosted demo smoke-test script.
- More tenant isolation tests.
