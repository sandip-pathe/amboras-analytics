# Market Scout

Current date: June 2, 2026.

## A. What Does The App Do?

Amboras Analytics ingests ecommerce behavior events and turns them into a live merchant dashboard.

Current capabilities:

- event ingestion for visitor, cart, checkout, and purchase events
- raw event storage
- daily pre-aggregated stats
- revenue and conversion dashboard
- top products
- recent activity
- live visitor snapshot
- Server-Sent Events feed
- store-scoped analytics APIs
- MCP tools for AI-accessible analytics

## B. What Problem Does It Solve?

The problem is not "people need charts." The problem is:

> Store owners and ecommerce teams need a fast, simple, trustworthy view of what is happening right now without building a full analytics stack.

Pain signals:

- GA4 ecommerce setup requires event configuration, GTM tags, parameters, and debug mode. Google notes ecommerce reports can take up to 24 hours to populate after setup.
- Shopify analytics is useful, but its overview dashboard is focused on cards, reports, and refresh windows rather than an event-level live feed.
- WooCommerce reporting can become slow when analytics runs on the same WordPress database.
- Agencies repeatedly rebuild dashboard and reporting layers for clients.

## C. Who Has The Problem?

Best-fit segments:

1. WooCommerce store owners and WordPress agencies.
2. Ecommerce agencies managing multiple client stores.
3. Custom/headless storefront teams.
4. Marketplace founders who need tenant-scoped analytics.
5. Small merchants who find GA4 too technical.
6. Developers who want an open-source analytics backend starter.

## D. Is This Real Pain?

Yes, but the broad market is crowded.

Existing options:

- Shopify already has analytics dashboard cards and report drilldowns.
- Triple Whale has a free plan and paid plans with broad integrations, attribution, benchmarks, and AI features.
- Polar Analytics targets Shopify brands with centralized ecommerce data.
- Northbeam focuses on higher-spend ecommerce attribution and media measurement.
- Metorik targets WooCommerce/Shopify analytics and explicitly sells speed by processing reports off-site.

What that means:

- Competing as "another ecommerce dashboard" is weak.
- Competing as a cheaper Triple Whale is also weak.
- The credible wedge is open-source, real-time, self-hostable analytics for custom/WooCommerce/headless stores.

## E. How Can We Put It In Market With Tweaks?

### Wedge

Position it as:

> Open-source real-time ecommerce analytics for custom storefronts and agencies.

Avoid:

> Triple Whale clone.

### First Marketable Version

Minimum additions:

- hosted demo
- WooCommerce connector plan or first implementation
- public README with clear architecture
- scale proof report
- demo video/GIF
- outreach scripts

### First Real Connector

WooCommerce is the best first connector because:

- WooCommerce stores are more likely to feel reporting/database pain.
- WordPress freelancers and agencies are reachable.
- The product can start as a lightweight reporting layer without ad attribution.

### Early Outreach

Ask for feedback, not money.

Best targets:

- WooCommerce agency owners
- Shopify/WooCommerce freelancers
- custom storefront builders
- founders of small ecommerce tools

### Strong Product Angles

- "Live feed of what shoppers are doing now."
- "Dashboard stays fast because it reads aggregate rows, not millions of raw events."
- "Self-hostable analytics backend for custom ecommerce projects."
- "AI-ready analytics via MCP."
- "Plain merchant language instead of raw event names."

## Competitor Notes

- Shopify Analytics overview dashboard: https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard/using-the-overview-dashboard
- GA4 ecommerce setup: https://support.google.com/analytics/answer/12200568
- Triple Whale pricing: https://www.triplewhale.com/pricing
- Polar Analytics: https://www.polaranalytics.com/lp/us
- Northbeam pricing: https://www.northbeam.io/pricing
- Metorik WooCommerce analytics: https://metorik.com/woocommerce/analytics

## Bottom Line

The pain is real, but the broad category is mature. The practical path is to use Amboras as:

1. a public proof-of-work artifact
2. an open-source starter kit
3. a conversation starter with agencies
4. a base for one connector-led product wedge
