# Connector Roadmap

The current app proves the analytics engine. To put it in market, Amboras needs a way to receive real store data with minimal setup.

## Recommended First Connector: WooCommerce

WooCommerce is the best first wedge because:

- agencies and freelancers are reachable
- reporting speed is a known pain
- stores often have custom plugins and workflows
- a lightweight analytics layer is easier to justify than a full attribution suite

## Version 1 Connector Scope

### Required

- Store owner creates an Amboras store.
- Amboras issues a scoped ingest key.
- WooCommerce plugin stores the key.
- Plugin sends purchase events when an order is created.
- Optional historical sync imports recent orders.

### Event Mapping

| WooCommerce Signal | Amboras Event |
| --- | --- |
| Product page viewed | `page_view` |
| Add to cart | `add_to_cart` |
| Remove from cart | `remove_from_cart` |
| Checkout page opened | `checkout_started` |
| Order created / paid | `purchase` |

### Purchase Event Shape

```json
{
  "event_id": "woo_order_12345",
  "store_id": "store_alpha",
  "event_type": "purchase",
  "timestamp": "2026-06-02T12:00:00Z",
  "data": {
    "product_id": "prod_012",
    "amount": 249.99,
    "currency": "USD"
  }
}
```

If one order has multiple products, start simple:

- emit one purchase event for the order total
- set `product_id` to the highest-value line item

Later:

- add order ID
- add line-item table
- support multiple product rows per purchase

## Custom Storefront Connector

For headless/custom stores, ship a small server-side helper first.

Example:

```ts
await fetch("https://amboras.example.com/api/v1/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer STORE_INGEST_TOKEN"
  },
  body: JSON.stringify({
    event_id: "evt_123",
    store_id: "store_alpha",
    event_type: "purchase",
    timestamp: new Date().toISOString(),
    data: {
      product_id: "prod_012",
      amount: 249.99,
      currency: "USD"
    }
  })
});
```

Do not put long-lived admin JWTs in browser JavaScript. A public tracking snippet needs scoped ingest keys and rate limiting first.

## Shopify Connector

Shopify is attractive, but harder as a first wedge because:

- native analytics already exists
- app approval and install flow are more involved
- strong analytics competitors already serve Shopify deeply

Best Shopify route:

1. Start with webhooks for orders.
2. Add app proxy or pixel for visitor/cart events.
3. Position as a live pulse and open-source backend, not attribution.

## Ingest Key Design

Future schema:

```text
stores
  id
  name
  created_at

store_ingest_keys
  id
  store_id
  key_hash
  name
  last_used_at
  revoked_at
  created_at
```

API behavior:

- dashboard auth uses user JWT
- event collector uses ingest key
- collector can only write events for its own store
- collector cannot read analytics

## Minimum Marketable Connector Milestone

Amboras becomes meaningfully marketable when one of these is true:

- a WooCommerce store can connect and show purchases within 10 minutes
- a custom storefront can install a helper and see live events
- a demo store can replay synthetic events continuously in the hosted dashboard

Until then, the project is primarily a proof-of-work artifact.
