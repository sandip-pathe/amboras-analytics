# Demo Steps — Complete Walkthrough

Follow these exact steps in order. This is your permanent reference.

---

## **BEFORE YOU START**

Verify you have:
- PostgreSQL running locally
- Node 18+
- Backend `.env` file set up (should already be done, but verify):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amboras_analytics?schema=public"
JWT_SECRET="dev-secret-change-in-production"
PORT=3001
```

---

## **PART 1: START THE BACKEND**

Open **Terminal 1**:

```bash
cd /c/x/amboras-analytics/backend
npm install
npm run start:dev
```

Wait for the output:
```
✓ Nest application successfully started
```

**Leave this running.**

---

## **PART 2: START THE FRONTEND**

Open **Terminal 2**:

```bash
cd /c/x/amboras-analytics/frontend
npm install
npm run dev
```

Wait for:
```
✓ Ready in 2.1s
```

**Leave this running.**

---

## **PART 3: LOGIN & GET JWT TOKEN**

1. Open browser: `http://localhost:3000/login`
2. You'll see the login form with `store_alpha` pre-filled
3. Click **"Generate Access Token"**
4. You're now logged in to the dashboard

**To get the JWT token for curl commands:**
1. Open **Chrome DevTools** (F12)
2. Go to **Application** tab
3. Go to **Storage** → **Local Storage** → `http://localhost:3000`
4. Find `amboras_token`
5. **Copy the entire value** (it's a long string starting with `eyJ...`)

---

## **PART 4: SEND TEST EVENT (MANUAL CURL)**

Open **Terminal 3** (a fresh terminal):

```bash
TOKEN="PASTE_YOUR_TOKEN_HERE"
```

Replace `PASTE_YOUR_TOKEN_HERE` with the JWT token you copied above. Example:
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdG9yZV9hbHBoYSIsInN0b3JlSWQiOiJzdG9yZV9hbHBoYSIsImlhdCI6MTc3NDcxMzY5MCwiZXhwIjoxNzc1MzE4NDkwfQ.DVEEWun0Dxo9ZQWeihWdSDxE5q4G5NcXuF1orKbi784"
```

Verify it's saved:
```bash
echo $TOKEN
```

Now send the event:
```bash
curl -X POST "http://127.0.0.1:3001/api/v1/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_live_demo_012","store_id":"store_alpha","event_type":"purchase","timestamp":"2026-03-28T13:59:00Z","data":{"product_id":"prod_009","amount":700.99,"currency":"USD"}}'
```

**Expected response:**
```
{"success":true}
```

---

## **PART 5: WATCH IT ON DASHBOARD**

1. Go back to browser at `http://localhost:3000/dashboard`
2. Look at the **live activity feed** (bottom left)
3. Your event should appear there **instantly**
4. Watch the **revenue cards** update if applicable

---

## **REPEAT FOR DEMO**

Send more events by changing the values:

```bash
curl -X POST "http://127.0.0.1:3001/api/v1/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_demo_002","store_id":"store_alpha","event_type":"purchase","timestamp":"2026-03-28T13:05:00Z","data":{"product_id":"prod_015","amount":399.99,"currency":"USD"}}'
```

Change:
- `event_id` — make it unique each time (e.g., `evt_demo_002`, `evt_demo_003`)
- `amount` — different prices
- `product_id` — different products
- `timestamp` — slightly later time

Each event will appear in the live feed within **~100ms**.

---

## **FOR VIDEO RECORDING**

Use this exact curl command:

```bash
curl -X POST "http://localhost:3001/api/v1/events" \
  -H "Authorization: Bearer YOUR_STORE_ALPHA_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_live_demo_001",
    "store_id": "store_alpha",
    "event_type": "purchase",
    "timestamp": "2026-03-28T13:00:00Z",
    "data": {
      "product_id": "prod_012",
      "amount": 249.99,
      "currency": "USD"
    }
  }'
```

Replace `YOUR_STORE_ALPHA_JWT` with your actual token.

---

## **TROUBLESHOOTING**

**Backend says "address already in use":**
```bash
pkill -f "node"
pkill -f "npm"
```

Then restart backend.

**401 Unauthorized on curl:**
- Your token is expired or invalid
- Go back to login, click "Generate Access Token" again
- Copy the new token to Terminal 3

**500 Internal Server Error:**
- Database schema not set up
- Run: `cd backend && npx prisma migrate deploy`

**"Failed to fetch" on frontend:**
- Make sure backend is running on port 3001
- Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3001`

---

## **YOU'RE DONE**

All three terminals running. Backend, frontend, and you can send events any time.
