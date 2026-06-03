# Changelog

All notable changes to Cartograph are documented here.

## Unreleased

### Added

- Market-facing README for the open-source ecommerce analytics starter.
- Final project plan, market scout, deployment guide, architecture notes, connector roadmap, outreach kit, proof checklist, and demo runbook.
- MIT license, contributing guide, security policy, and code of conduct.
- Dockerfiles for backend and frontend.
- Root Docker Compose file for local PoC rehearsal.
- Render Blueprint for backend and PostgreSQL deployment.
- Backend health endpoint at `/api/v1/health`.
- Live event replay script via `npm run demo:live`.
- Backend scale proof shortcut via `npm run scale:proof`.
- Tenant isolation unit tests for event ingestion.
- GitHub issue templates, pull request template, and CI workflow.
- Cartograph connector API for browser tracking, WooCommerce order webhooks, and Shopify order webhooks.
- Store Signals API and dashboard panel for merchant-friendly alerts.
- Technical deep dive, integration guide, and community launch kit.

### Changed

- Renamed the product from the original spike branding to Cartograph.
- Updated repo links to `sandip-pathe/Cartograph`.
- Replaced earlier project docs with product and proof-of-work docs.
- Made React Query DevTools development-only.
- Removed Google font build-time dependency for offline-safe frontend builds.
- Updated frontend Next.js dependency and PostCSS override to clear dependency audit advisories.
- Updated backend dependencies through regular audit fix.
- Reworked app root response from the default scaffold response to API metadata.
- Made the e2e smoke tests independent of database setup.
- Adjusted MCP store isolation output so shared product IDs are catalog overlap, not tenant leakage.

### Fixed

- Event ingestion now rejects writes where the request body `store_id` differs from the authenticated store.
- Frontend live feed range buffering no longer relies on stale eslint disables.
- `frontend/.env.example` is no longer hidden by `frontend/.gitignore`.
- Duplicate webhook event IDs are handled as idempotent skips instead of double-counting revenue.
