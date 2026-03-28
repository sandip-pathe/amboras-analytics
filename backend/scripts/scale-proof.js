/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const { sign } = require('jsonwebtoken');
const fs = require('node:fs/promises');
const path = require('node:path');

const prisma = new PrismaClient();

const SCALE_STORE_ID = 'store_scale';
const TARGET_EVENTS = 2_000_000;

function nowIsoDate() {
  return new Date().toISOString();
}

async function timed(label, fn) {
  const startedAt = Date.now();
  const result = await fn();
  const elapsedMs = Date.now() - startedAt;
  return { label, elapsedMs, result };
}

async function measureEndpoint(url, token) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const elapsedMs = Date.now() - startedAt;
  const body = await response.text();

  return {
    url,
    status: response.status,
    elapsedMs,
    bytes: body.length,
  };
}

async function main() {
  const report = {
    runAt: nowIsoDate(),
    storeId: SCALE_STORE_ID,
    targetEvents: TARGET_EVENTS,
    steps: [],
    measures: [],
    counts: {},
  };

  const existingCount = await prisma.event.count({
    where: { storeId: SCALE_STORE_ID },
  });

  if (existingCount < TARGET_EVENTS) {
    report.steps.push(`Existing ${SCALE_STORE_ID} events: ${existingCount}. Rebuilding scale dataset to ${TARGET_EVENTS}.`);

    report.steps.push('Deleting prior scale rows.');
    await prisma.$executeRawUnsafe(
      "DELETE FROM events WHERE store_id = 'store_scale'",
    );
    await prisma.$executeRawUnsafe(
      "DELETE FROM store_daily_stats WHERE store_id = 'store_scale'",
    );

    const insertEvents = await timed('insert_events', () =>
      prisma.$executeRawUnsafe(`
        INSERT INTO events (id, event_id, store_id, event_type, timestamp, product_id, amount, currency, created_at)
        SELECT
          substr(md5(('scale' || t.gs::text || t.r::text)), 1, 24),
          'evt_scale_' || t.gs::text,
          'store_scale',
          CASE
            WHEN t.r < 0.65 THEN 'page_view'::"EventType"
            WHEN t.r < 0.80 THEN 'add_to_cart'::"EventType"
            WHEN t.r < 0.85 THEN 'remove_from_cart'::"EventType"
            WHEN t.r < 0.92 THEN 'checkout_started'::"EventType"
            ELSE 'purchase'::"EventType"
          END,
          NOW()
            - (floor(t.r2 * 90)::int || ' days')::interval
            - (floor(t.r3 * 86400)::int || ' seconds')::interval,
          CASE
            WHEN t.r >= 0.92 THEN 'prod_' || lpad((1 + floor(t.r4 * 20)::int)::text, 3, '0')
            ELSE NULL
          END,
          CASE
            WHEN t.r >= 0.92 THEN round((10 + (t.r4 * 490))::numeric, 2)
            ELSE NULL
          END,
          CASE
            WHEN t.r >= 0.92 THEN 'USD'
            ELSE NULL
          END,
          NOW()
        FROM (
          SELECT gs, random() AS r, random() AS r2, random() AS r3, random() AS r4
          FROM generate_series(1, 2000000) AS gs
        ) AS t
      `),
    );
    report.steps.push(`Inserted events in ${insertEvents.elapsedMs}ms.`);

    const upsertStats = await timed('insert_stats', () =>
      prisma.$executeRawUnsafe(`
        INSERT INTO store_daily_stats (id, store_id, date, event_type, count, revenue)
        SELECT
          substr(md5(('scale_stat' || e.store_id || date_trunc('day', e.timestamp)::date::text || e.event_type::text)), 1, 24),
          e.store_id,
          date_trunc('day', e.timestamp)::date,
          e.event_type,
          COUNT(*)::int,
          COALESCE(SUM(e.amount), 0)::numeric(10, 2)
        FROM events e
        WHERE e.store_id = 'store_scale'
        GROUP BY e.store_id, date_trunc('day', e.timestamp)::date, e.event_type
        ON CONFLICT (store_id, date, event_type)
        DO UPDATE SET
          count = EXCLUDED.count,
          revenue = EXCLUDED.revenue
      `),
    );
    report.steps.push(`Built stats in ${upsertStats.elapsedMs}ms.`);
  } else {
    report.steps.push(
      `Scale dataset already present (${existingCount} events). Skipping reload.`,
    );
  }

  const eventCount = await prisma.event.count({
    where: { storeId: SCALE_STORE_ID },
  });
  const statCount = await prisma.storeDailyStat.count({
    where: { storeId: SCALE_STORE_ID },
  });

  report.counts = {
    eventCount,
    statCount,
  };

  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const token = sign({ sub: SCALE_STORE_ID, storeId: SCALE_STORE_ID }, jwtSecret, {
    expiresIn: '7d',
  });

  const baseUrl = process.env.API_URL || 'http://localhost:3001';

  report.measures.push(
    await measureEndpoint(`${baseUrl}/api/v1/analytics/overview`, token),
  );
  report.measures.push(
    await measureEndpoint(`${baseUrl}/api/v1/analytics/top-products`, token),
  );
  report.measures.push(
    await measureEndpoint(`${baseUrl}/api/v1/analytics/recent-activity`, token),
  );

  const lines = [
    '# Scale Proof (2M Events)',
    '',
    `- Run At: ${report.runAt}`,
    `- Store: ${report.storeId}`,
    `- Event Count: ${report.counts.eventCount}`,
    `- Stats Rows: ${report.counts.statCount}`,
    '',
    '## Steps',
    ...report.steps.map((step) => `- ${step}`),
    '',
    '## Endpoint Timings',
    '| Endpoint | Status | Time (ms) | Response Bytes |',
    '|---|---:|---:|---:|',
    ...report.measures.map(
      (m) => `| ${m.url.replace(baseUrl, '')} | ${m.status} | ${m.elapsedMs} | ${m.bytes} |`,
    ),
    '',
  ];

  const outPath = path.resolve(__dirname, '..', 'SCALE_PROOF.md');
  await fs.writeFile(outPath, lines.join('\n'), 'utf8');

  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
