# Integration Guide

This guide shows how to connect a storefront or ecommerce platform to Cartograph.

## 1. Start The App Locally

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

Open:

```text
http://localhost:3000/login
```

Use a seeded store ID such as:

```text
store_alpha
```

## 2. Mint A Demo JWT

```bash
curl -X POST "http://localhost:3001/api/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"storeId":"store_alpha"}'
```

Save the `access_token`.

## 3. Mint A Connector Ingest Key

```bash
curl "http://localhost:3001/api/v1/connectors/ingest-key" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

The response includes:

- `store_id`
- `ingest_key`
- `tracking_snippet`
- connector endpoint URLs
- webhook headers

## 4. Custom Storefront Tracking

Add the returned script tag to a custom storefront:

```html
<script
  async
  src="http://localhost:3001/api/v1/connectors/snippet.js?store_id=store_alpha&ingest_key=YOUR_INGEST_KEY"
></script>
```

The snippet automatically sends one `page_view` event.

It also exposes helper methods:

```js
window.Cartograph.trackAddToCart({
  product_id: "prod_012"
});

window.Cartograph.trackCheckoutStarted({});

window.Cartograph.trackPurchase({
  product_id: "prod_012",
  amount: 249.99,
  currency: "USD"
});
```

If the snippet is installed on another domain, add that storefront origin to backend `CORS_ORIGINS`.

Example:

```env
CORS_ORIGINS="http://localhost:3000,https://your-store.com"
```

## 5. Direct Tracking API

Use this for custom backends or server-side ecommerce events:

```bash
curl -X POST "http://localhost:3001/api/v1/connectors/track" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "store_alpha",
    "ingest_key": "YOUR_INGEST_KEY",
    "event_id": "custom_add_to_cart_001",
    "event_type": "add_to_cart",
    "timestamp": "2026-03-28T13:00:00Z",
    "data": {
      "product_id": "prod_012"
    }
  }'
```

Supported event types:

```text
page_view
add_to_cart
remove_from_cart
checkout_started
purchase
```

Purchase event example:

```bash
curl -X POST "http://localhost:3001/api/v1/connectors/track" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "store_alpha",
    "ingest_key": "YOUR_INGEST_KEY",
    "event_id": "custom_purchase_001",
    "event_type": "purchase",
    "timestamp": "2026-03-28T13:05:00Z",
    "data": {
      "product_id": "prod_012",
      "amount": 249.99,
      "currency": "USD"
    }
  }'
```

## 6. WooCommerce Orders

Endpoint:

```text
POST /api/v1/connectors/woocommerce/orders
```

Preferred headers:

```text
x-cartograph-store-id: store_alpha
x-cartograph-ingest-key: YOUR_INGEST_KEY
```

If your webhook tool cannot set custom headers, put the same values in the URL:

```text
http://localhost:3001/api/v1/connectors/woocommerce/orders?store_id=store_alpha&ingest_key=YOUR_INGEST_KEY
```

Supported mapping:

| WooCommerce status | Cartograph event |
| --- | --- |
| `processing` | `purchase` |
| `completed` | `purchase` |
| `pending` | `checkout_started` |
| `on-hold` | `checkout_started` |

Paid orders emit one purchase event per line item. Duplicate webhook retries are skipped through the unique `event_id`.

Minimal local test payload:

```bash
curl -X POST "http://localhost:3001/api/v1/connectors/woocommerce/orders?store_id=store_alpha&ingest_key=YOUR_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "status": "completed",
    "currency": "USD",
    "date_created_gmt": "2026-03-28T13:00:00Z",
    "line_items": [
      {
        "id": 11,
        "product_id": 501,
        "total": "29.99"
      }
    ]
  }'
```

## 7. Shopify Orders

Endpoint:

```text
POST /api/v1/connectors/shopify/orders
```

Preferred headers:

```text
x-cartograph-store-id: store_alpha
x-cartograph-ingest-key: YOUR_INGEST_KEY
```

If needed, pass key data through the webhook URL:

```text
http://localhost:3001/api/v1/connectors/shopify/orders?store_id=store_alpha&ingest_key=YOUR_INGEST_KEY
```

Supported mapping:

| Shopify financial status | Cartograph event |
| --- | --- |
| `paid` | `purchase` |
| `partially_paid` | `purchase` |
| `partially_refunded` | `purchase` |
| `pending` | `checkout_started` |
| `authorized` | `checkout_started` |

Paid orders emit one purchase event per line item using `price * quantity`.

Minimal local test payload:

```bash
curl -X POST "http://localhost:3001/api/v1/connectors/shopify/orders?store_id=store_alpha&ingest_key=YOUR_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 67890,
    "financial_status": "paid",
    "currency": "USD",
    "created_at": "2026-03-28T13:00:00Z",
    "line_items": [
      {
        "id": 21,
        "product_id": 701,
        "price": "10.00",
        "quantity": 3
      }
    ]
  }'
```

## 8. Confirm Data Appears

Dashboard:

```text
http://localhost:3000/dashboard
```

API checks:

```bash
curl "http://localhost:3001/api/v1/analytics/recent-activity" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl "http://localhost:3001/api/v1/analytics/alerts" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

No dashboard data:

- confirm the event `store_id` matches the store you logged into
- confirm `timestamp` is inside the selected dashboard date range
- confirm the event type is one of the supported values

Connector returns `401`:

- mint a fresh ingest key from `/api/v1/connectors/ingest-key`
- confirm `CONNECTOR_INGEST_SECRET` did not change between minting and sending
- confirm the key belongs to the same `store_id`

Snippet does not send events:

- add the storefront domain to `CORS_ORIGINS`
- check the browser console for blocked requests
- confirm `PUBLIC_API_URL` points at the backend users can reach

Webhook sent twice:

- this is expected
- duplicate `event_id` values are idempotent skips
- revenue should not double-count

Store Signals are empty:

- alerts are rule-based and may not trigger for every event
- send a purchase to trigger "Live sale happened"
- send checkout events without purchase to trigger the checkout signal
