# Connector Guide

Cartograph now includes three simple ingestion paths:

- a public tracking snippet for custom storefronts
- a WooCommerce order webhook adapter
- a Shopify order webhook adapter

Each connector writes through the same event service as the authenticated API, so raw events, daily aggregates, SSE updates, recent activity, top products, and Store Signals all stay consistent.

## Scoped Ingest Keys

Authenticated dashboard users can request connector settings:

```bash
curl "http://localhost:3001/api/v1/connectors/ingest-key" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response shape:

```json
{
  "store_id": "store_alpha",
  "ingest_key": "cg_...",
  "tracking_snippet": "<script async src=\"...\"></script>",
  "endpoints": {
    "track": "http://localhost:3001/api/v1/connectors/track",
    "woocommerce_orders": "http://localhost:3001/api/v1/connectors/woocommerce/orders",
    "shopify_orders": "http://localhost:3001/api/v1/connectors/shopify/orders"
  },
  "headers": {
    "x-cartograph-store-id": "store_alpha",
    "x-cartograph-ingest-key": "cg_..."
  }
}
```

For the proof-of-concept, keys are deterministic HMAC values derived from `CONNECTOR_INGEST_SECRET` and the store ID. This keeps setup simple while still preventing one store key from writing to another store. A production version should store hashed keys with names, last-used timestamps, revocation, and rate limits.

## Custom Storefront Snippet

Install the returned script tag on a storefront page:

```html
<script
  async
  src="https://your-backend-domain/api/v1/connectors/snippet.js?store_id=store_alpha&ingest_key=cg_..."
></script>
```

The snippet sends a `page_view` event on load and exposes:

```js
window.Cartograph.track("page_view", {});
window.Cartograph.trackAddToCart({ product_id: "prod_012" });
window.Cartograph.trackCheckoutStarted({});
window.Cartograph.trackPurchase({
  product_id: "prod_012",
  amount: 249.99,
  currency: "USD"
});
```

Direct collector endpoint:

```bash
curl -X POST "http://localhost:3001/api/v1/connectors/track" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "store_alpha",
    "ingest_key": "cg_...",
    "event_type": "add_to_cart",
    "timestamp": "2026-03-28T13:00:00Z",
    "data": {
      "product_id": "prod_012"
    }
  }'
```

## WooCommerce Webhook

Endpoint:

```text
POST /api/v1/connectors/woocommerce/orders
```

Headers:

```text
x-cartograph-store-id: store_alpha
x-cartograph-ingest-key: cg_...
```

Mapping:

| WooCommerce status | Cartograph event |
| --- | --- |
| `processing` | `purchase` |
| `completed` | `purchase` |
| `pending` | `checkout_started` |
| `on-hold` | `checkout_started` |

For paid orders, Cartograph emits one purchase event per line item so top-product revenue works immediately. If a payload has no line items, it emits one order-level purchase event.

The mapper reads common WooCommerce order fields such as `id`, `status`, `currency`, `date_created_gmt`, `date_paid_gmt`, `total`, and `line_items`.

## Shopify Webhook

Endpoint:

```text
POST /api/v1/connectors/shopify/orders
```

Headers:

```text
x-cartograph-store-id: store_alpha
x-cartograph-ingest-key: cg_...
```

Mapping:

| Shopify financial status | Cartograph event |
| --- | --- |
| `paid` | `purchase` |
| `partially_paid` | `purchase` |
| `partially_refunded` | `purchase` |
| `pending` | `checkout_started` |
| `authorized` | `checkout_started` |

For paid orders, Cartograph emits one purchase event per line item using `price * quantity`. If a payload has no line items, it emits one order-level purchase event from the order total.

The mapper reads common Shopify order fields such as `id`, `financial_status`, `currency`, `created_at`, `processed_at`, `current_total_price`, `total_price`, and `line_items`.

## Idempotency

Connector event IDs are deterministic for WooCommerce and Shopify order lines:

- `woo_order_<order_id>_line_<line_id>`
- `shopify_order_<order_id>_line_<line_id>`

The raw `events.event_id` column is unique. Duplicate webhook retries are treated as idempotent skips and do not double-count revenue.

## Next Hardening Steps

1. Store hashed, revocable ingest keys.
2. Add per-key rate limits.
3. Verify platform-native webhook signatures.
4. Package a small WooCommerce plugin for one-click webhook setup.
5. Package a Shopify install flow or Hydrogen helper.
