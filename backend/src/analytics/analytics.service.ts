import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type RevenueSummary = {
  today: number;
  thisWeek: number;
  thisMonth: number;
};

type EventsByType = {
  page_view: number;
  add_to_cart: number;
  remove_from_cart: number;
  checkout_started: number;
  purchase: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(storeId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    const weekStart = new Date(today);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

    const monthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );

    const rows = await this.prisma.storeDailyStat.findMany({
      where: {
        storeId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    const revenue: RevenueSummary = {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
    };

    const eventsByType: EventsByType = {
      page_view: 0,
      add_to_cart: 0,
      remove_from_cart: 0,
      checkout_started: 0,
      purchase: 0,
    };

    let purchaseCount = 0;
    let pageViewCount = 0;

    const revenueByDayMap = new Map<string, number>();
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(thirtyDaysAgo);
      d.setUTCDate(thirtyDaysAgo.getUTCDate() + i);
      revenueByDayMap.set(d.toISOString().slice(0, 10), 0);
    }

    for (const row of rows) {
      const rowDate = new Date(row.date);
      rowDate.setUTCHours(0, 0, 0, 0);

      const rowDateKey = rowDate.toISOString().slice(0, 10);
      const countValue = row.count;
      const revenueValue = Number(row.revenue);

      eventsByType[row.eventType as keyof EventsByType] += countValue;

      if (row.eventType === 'purchase') {
        purchaseCount += countValue;

        if (rowDate.getTime() === today.getTime()) {
          revenue.today += revenueValue;
        }

        if (rowDate >= weekStart) {
          revenue.thisWeek += revenueValue;
        }

        if (rowDate >= monthStart) {
          revenue.thisMonth += revenueValue;
        }

        revenueByDayMap.set(
          rowDateKey,
          (revenueByDayMap.get(rowDateKey) ?? 0) + revenueValue,
        );
      }

      if (row.eventType === 'page_view') {
        pageViewCount += countValue;
      }
    }

    const conversionRate =
      pageViewCount === 0
        ? 0
        : Number(((purchaseCount / pageViewCount) * 100).toFixed(2));

    const revenueByDay = [...revenueByDayMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, dayRevenue]) => ({
        date,
        revenue: Number(dayRevenue.toFixed(2)),
      }));

    return {
      revenue: {
        today: Number(revenue.today.toFixed(2)),
        thisWeek: Number(revenue.thisWeek.toFixed(2)),
        thisMonth: Number(revenue.thisMonth.toFixed(2)),
      },
      conversionRate,
      eventsByType,
      revenueByDay,
    };
  }

  async getTopProducts(storeId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ product_id: string; revenue: unknown; orders: unknown }>
    >`
      SELECT product_id, SUM(amount) AS revenue, COUNT(*) AS orders
      FROM events
      WHERE store_id = ${storeId}
        AND event_type = 'purchase'
        AND timestamp >= NOW() - INTERVAL '30 days'
        AND product_id IS NOT NULL
      GROUP BY product_id
      ORDER BY revenue DESC
      LIMIT 10
    `;

    return {
      products: rows.map((row) => ({
        productId: row.product_id,
        revenue: Number(row.revenue ?? 0),
        orders: Number(row.orders ?? 0),
      })),
    };
  }

  async getRecentActivity(storeId: string) {
    const events = await this.prisma.event.findMany({
      where: { storeId },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: {
        eventId: true,
        eventType: true,
        timestamp: true,
        amount: true,
        productId: true,
      },
    });

    return {
      events: events.map((event) => ({
        eventId: event.eventId,
        eventType: event.eventType,
        timestamp: event.timestamp,
        amount: event.amount === null ? null : Number(event.amount),
        productId: event.productId,
      })),
    };
  }
}
