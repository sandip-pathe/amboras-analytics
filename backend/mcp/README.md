# Cartograph MCP Server

This MCP server exposes store-scoped analytics tools over stdio.

## Run

From backend folder:

```bash
npm run mcp:start
```

Default API base:

- `http://localhost:3001/api/v1`

Override with:

- `API_BASE_URL`

## Tools

- `mint_store_token`
- `get_overview`
- `get_top_products`
- `get_recent_activity`
- `get_live_visitors`
- `get_alerts`
- `get_dashboard_snapshot`
- `verify_store_isolation`

## Notes

- All tools require a `storeId` and are scoped per store.
- Date-range params (`startDate`, `endDate`) are passed through to analytics endpoints.
- `verify_store_isolation` compares two stores and reports whether recent event IDs overlap. Shared product IDs are reported as catalog overlap, not as isolation failure.
