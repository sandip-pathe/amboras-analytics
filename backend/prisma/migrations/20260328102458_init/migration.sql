-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('page_view', 'add_to_cart', 'remove_from_cart', 'checkout_started', 'purchase');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "product_id" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_daily_stats" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "event_type" "EventType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "store_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_event_id_key" ON "events"("event_id");

-- CreateIndex
CREATE INDEX "events_store_id_timestamp_idx" ON "events"("store_id", "timestamp");

-- CreateIndex
CREATE INDEX "events_store_id_event_type_timestamp_idx" ON "events"("store_id", "event_type", "timestamp");

-- CreateIndex
CREATE INDEX "store_daily_stats_store_id_date_idx" ON "store_daily_stats"("store_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "store_daily_stats_store_id_date_event_type_key" ON "store_daily_stats"("store_id", "date", "event_type");
