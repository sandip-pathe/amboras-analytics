/* eslint-disable no-console */
const { randomUUID } = require('node:crypto');

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const STORE_ID = process.env.STORE_ID ?? 'store_alpha';
const EVENT_COUNT = Number(process.env.EVENT_COUNT ?? 20);
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 1500);

const PRODUCT_IDS = Array.from(
  { length: 20 },
  (_, index) => `prod_${String(index + 1).padStart(3, '0')}`,
);

const EVENT_WEIGHTS = [
  { type: 'page_view', cumulative: 0.56 },
  { type: 'add_to_cart', cumulative: 0.76 },
  { type: 'checkout_started', cumulative: 0.9 },
  { type: 'purchase', cumulative: 1 },
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function pickEventType() {
  const roll = Math.random();
  return EVENT_WEIGHTS.find((event) => roll <= event.cumulative)?.type;
}

function pickProductId() {
  return PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
}

function buildEvent() {
  const eventType = pickEventType();
  const productId = eventType === 'page_view' ? undefined : pickProductId();
  const amount =
    eventType === 'purchase'
      ? Number((20 + Math.random() * 480).toFixed(2))
      : undefined;

  return {
    event_id: `evt_live_${Date.now()}_${randomUUID()}`,
    store_id: STORE_ID,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    data:
      productId || amount
        ? {
            product_id: productId,
            amount,
            currency: amount ? 'USD' : undefined,
          }
        : undefined,
  };
}

async function mintToken() {
  const response = await fetch(`${API_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ storeId: STORE_ID }),
  });

  if (!response.ok) {
    throw new Error(`Could not mint token: ${response.status}`);
  }

  const body = await response.json();
  return body.access_token;
}

async function postEvent(token, event) {
  const response = await fetch(`${API_URL}/api/v1/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Event post failed (${response.status}): ${body.slice(0, 250)}`,
    );
  }
}

async function main() {
  if (!Number.isFinite(EVENT_COUNT) || EVENT_COUNT <= 0) {
    throw new Error('EVENT_COUNT must be a positive number.');
  }

  if (!Number.isFinite(INTERVAL_MS) || INTERVAL_MS < 0) {
    throw new Error('INTERVAL_MS must be zero or greater.');
  }

  console.log(
    `Streaming ${EVENT_COUNT} demo events to ${API_URL} for ${STORE_ID}`,
  );
  const token = await mintToken();

  for (let index = 1; index <= EVENT_COUNT; index += 1) {
    const event = buildEvent();
    await postEvent(token, event);
    const amountLabel = event.data?.amount ? ` $${event.data.amount}` : '';
    console.log(
      `${index}/${EVENT_COUNT} ${event.event_type}${amountLabel} ${event.event_id}`,
    );

    if (index < EVENT_COUNT) {
      await sleep(INTERVAL_MS);
    }
  }

  console.log('Demo event stream complete.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
