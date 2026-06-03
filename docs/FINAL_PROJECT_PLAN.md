# Final Project Plan

## Project Goal

Turn Cartograph into a public proof-of-work project that can be shown to merchants, ecommerce agencies, recruiters, and technical founders.

The project should communicate three things:

1. It solves a recognizable ecommerce analytics pain.
2. It has credible engineering behind it.
3. It is packaged well enough to run, deploy, and discuss with real users.

## Product Positioning

Cartograph is an open-source real-time ecommerce analytics starter for custom storefronts, WooCommerce-style stores, and agencies that need a live store pulse without building the analytics layer from scratch.

It is not trying to beat Triple Whale, Northbeam, or Polar Analytics on attribution. The wedge is smaller and more practical:

- fast store-level revenue and conversion dashboards
- real-time activity feed
- self-hostable backend
- developer-friendly event API
- custom storefront tracking snippet
- WooCommerce and Shopify order webhook adapters
- merchant-friendly Store Signals
- AI-readable analytics via MCP

## Target Users

Primary:

- ecommerce agencies building client dashboards
- WooCommerce developers who want faster reporting
- custom/headless storefront founders
- small merchants who want plain-English live store visibility

Secondary:

- hiring managers evaluating backend/full-stack engineering skill
- AI builders looking for MCP-enabled business data examples

## Definition of Done

### Local Product

- Backend builds successfully.
- Frontend builds successfully.
- Backend tests cover tenant write isolation.
- Frontend lint passes.
- Dashboard renders the core analytics workflow.
- Event ingestion cannot write across stores.
- React Query DevTools are development-only.
- Health endpoint exists for hosted/runtime checks.
- Live demo replay script can stream synthetic events.
- Connector routes ingest browser, WooCommerce, and Shopify events.
- Alerts endpoint and dashboard Store Signals panel exist.

### Open-Source Readiness

- Root README explains the real-world problem and architecture.
- Backend and frontend READMEs are project-specific.
- MIT license exists.
- `_workspace/` remains ignored.
- Env examples exist for backend and frontend.
- Dockerfiles and Compose exist for local PoC rehearsal.
- GitHub CI, issue templates, and PR template exist.
- Contributing, security, code of conduct, changelog, and license exist.
- Known limitations are honest and up to date.

### Market Readiness

- Market scout document exists.
- Deployment guide exists.
- Demo runbook exists.
- Launch checklist exists.
- Outreach scripts exist.
- Connector guide exists.
- Architecture notes exist.
- Hosted demo can be created from the instructions once hosting credentials are available.

## Launch Phases

### Phase 1: Proof-of-Work Packaging

Status: complete locally.

Deliverables:

- security and production polish fixes
- root README rewrite
- docs for market, deployment, architecture, connectors, and outreach
- local verification results

### Phase 2: Hosted Demo

Recommended stack:

- frontend on Vercel
- backend on Render or Railway
- database on Neon Postgres

Deliverables:

- public dashboard URL
- demo store credentials or demo store ID
- seeded demo database
- short walkthrough clip or GIF

### Phase 3: Connector Packaging

Recommended first install package: WooCommerce.

Why:

- WooCommerce stores often suffer from reporting bloat and live database load.
- WordPress developers and agencies are accessible for outreach.
- A plugin/webhook connector is easier to explain than ad attribution.

Implemented connector path:

- receive WooCommerce order webhooks
- receive Shopify order webhooks
- map orders to `purchase` events
- browser snippet for `page_view`, `add_to_cart`, checkout, and purchase events

Next connector packaging:

- small WooCommerce plugin for webhook setup
- Shopify install/helper flow
- historical order import

### Phase 4: Feedback Outreach

Target 30 to 50 people:

- WooCommerce freelancers
- small Shopify/WooCommerce agencies
- indie ecommerce founders
- technical founders building marketplaces

Goal:

- 10 replies
- 5 demo views
- 3 calls or async feedback threads
- 1 clear next feature request

### Phase 5: Iterate Toward Product

Based on feedback, choose one:

- agency starter kit
- WooCommerce reporting plugin
- custom storefront analytics backend
- AI analytics assistant using the MCP server

## Product Tweaks That Matter Most

1. Add proper store/user auth.
2. Add hashed, revocable connector keys.
3. Add rate limiting and native webhook signature verification.
4. Add a hosted public demo.
5. Add one-page case study: "2M events, dashboard still fast."
6. Package WooCommerce/Shopify install helpers.

## Risks

- The analytics dashboard market is crowded.
- Shopify merchants already have native analytics and freemium options.
- Demo auth should not be mistaken for production security.
- True unique visitor tracking needs session identifiers.
- Connector keys are proof-of-concept HMAC keys, not a complete key-management system.

## Success Criteria

This project succeeds even without customers if it becomes a credible public artifact:

- repo looks professional
- hosted demo works
- architecture is clear
- market thesis is realistic
- outreach starts conversations
- the project demonstrates backend, frontend, real-time, data, and AI-tooling skill
