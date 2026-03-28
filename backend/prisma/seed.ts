import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';

const prisma = new PrismaClient();

const EVENT_TYPES = {
  page_view: 'page_view',
  add_to_cart: 'add_to_cart',
  remove_from_cart: 'remove_from_cart',
  checkout_started: 'checkout_started',
  purchase: 'purchase',
} as const;

type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

const STORES = ['store_alpha', 'store_beta', 'store_gamma'] as const;
const PRODUCTS = Array.from({ length: 20 }, (_, i) => `prod_${String(i + 1).padStart(3, '0')}`);
const TOTAL_EVENTS = Number(process.env.SEED_TOTAL_EVENTS ?? 100_000);
const BATCH_SIZE = Number(process.env.SEED_BATCH_SIZE ?? 500);

const EVENT_WEIGHTS: Array<{ type: EventType; cumulative: number }> = [
  { type: EVENT_TYPES.page_view, cumulative: 0.65 },
  { type: EVENT_TYPES.add_to_cart, cumulative: 0.8 },
  { type: EVENT_TYPES.remove_from_cart, cumulative: 0.85 },
  { type: EVENT_TYPES.checkout_started, cumulative: 0.92 },
  { type: EVENT_TYPES.purchase, cumulative: 1 },
];

function weightedEventType(): EventType {
  const r = Math.random();
  const match = EVENT_WEIGHTS.find((item) => r <= item.cumulative);
  return match?.type ?? EVENT_TYPES.purchase;
}

function randomStore(): (typeof STORES)[number] {
  return STORES[Math.floor(Math.random() * STORES.length)];
}

function randomProductId(): string {
  return PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
}

function randomAmount(): number {
  const amount = 10 + Math.random() * (500 - 10);
  return Number(amount.toFixed(2));
}

function randomTimestampWithin90Days(): Date {
  const now = new Date();
  const daysBack = Math.pow(Math.random(), 2) * 90;
  const timestamp = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  timestamp.setUTCHours(
    Math.floor(Math.random() * 24),
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 1000),
  );

  return timestamp;
}

function normalizeToUtcDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

async function upsertDailyStat(
  storeId: string,
  date: Date,
  eventType: EventType,
  amount: number,
): Promise<void> {
  const statId = randomUUID();

  await prisma.$executeRaw`
    INSERT INTO store_daily_stats (id, store_id, date, event_type, count, revenue)
    VALUES (
      ${statId},
      ${storeId},
      ${date},
      ${eventType}::"EventType",
      1,
      ${amount}
    )
    ON CONFLICT (store_id, date, event_type)
    DO UPDATE SET
      count = store_daily_stats.count + 1,
      revenue = store_daily_stats.revenue + EXCLUDED.revenue
  `;
}

type PreparedEvent = {
  id: string;
  eventId: string;
  storeId: string;
  eventType: EventType;
  timestamp: Date;
  productId: string | null;
  amount: number | null;
  currency: string | null;
  dateKey: Date;
  statRevenueIncrement: number;
};

async function seed() {
  if (!Number.isFinite(TOTAL_EVENTS) || TOTAL_EVENTS <= 0) {
    throw new Error('SEED_TOTAL_EVENTS must be a positive number');
  }

  if (!Number.isFinite(BATCH_SIZE) || BATCH_SIZE <= 0) {
    throw new Error('SEED_BATCH_SIZE must be a positive number');
  }

  console.log(`Seed config: totalEvents=${TOTAL_EVENTS}, batchSize=${BATCH_SIZE}`);

  console.log('Resetting analytics tables...');
  await prisma.storeDailyStat.deleteMany();
  await prisma.event.deleteMany();

  console.log('Generating and inserting events...');

  for (let offset = 0; offset < TOTAL_EVENTS; offset += BATCH_SIZE) {
    const limit = Math.min(offset + BATCH_SIZE, TOTAL_EVENTS);
    const chunk: PreparedEvent[] = [];

    for (let i = offset; i < limit; i += 1) {
      const storeId = randomStore();
      const eventType = weightedEventType();
      const timestamp = randomTimestampWithin90Days();
      const dateKey = normalizeToUtcDay(timestamp);

      const isPurchase = eventType === EVENT_TYPES.purchase;
      const amountNumber = isPurchase ? randomAmount() : 0;

      chunk.push({
        id: randomUUID(),
        eventId: `evt_${randomUUID()}`,
        storeId,
        eventType,
        timestamp,
        productId: isPurchase ? randomProductId() : null,
        amount: isPurchase ? amountNumber : null,
        currency: isPurchase ? 'USD' : null,
        dateKey,
        statRevenueIncrement: amountNumber,
      });
    }

    await prisma.event.createMany({
      data: chunk.map((event) => ({
        id: event.id,
        eventId: event.eventId,
        storeId: event.storeId,
        eventType: event.eventType,
        timestamp: event.timestamp,
        productId: event.productId,
        amount: event.amount,
        currency: event.currency,
      })),
      skipDuplicates: true,
    });

    for (const event of chunk) {
      await upsertDailyStat(
        event.storeId,
        event.dateKey,
        event.eventType,
        event.eventType === EVENT_TYPES.purchase ? event.statRevenueIncrement : 0,
      );
    }

    if ((offset / BATCH_SIZE + 1) % 20 === 0 || limit === TOTAL_EVENTS) {
      console.log(`Seeded ${limit}/${TOTAL_EVENTS} events`);
    }
  }

  const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

  for (const storeId of STORES) {
    const token = sign({ sub: storeId, storeId }, jwtSecret, { expiresIn: '7d' });
    console.log(`${storeId} token:`, token);
  }

  console.log('Seeding complete.');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
