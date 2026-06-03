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

type AnalyticsRange = {
  startDate: Date;
  endDate: Date;
  endExclusiveTimestamp: Date;
};

export type LiveVisitorsSummary = {
  windowMinutes: number;
  activeVisitors: number;
  pageViews: number;
  cartsStarted: number;
  checkoutsStarted: number;
  purchases: number;
  purchaseRate: number;
  asOf: string;
};

export type StoreAlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export type StoreAlert = {
  id: string;
  severity: StoreAlertSeverity;
  title: string;
  message: string;
  metricLabel: string;
  metricValue: string;
  createdAt: string;
};

export type StoreAlertsResponse = {
  generatedAt: string;
  windowMinutes: number;
  alerts: StoreAlert[];
};

type TopProductSignal = {
  productId: string;
  revenue: number;
  orders: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(
    startDateRaw?: string,
    endDateRaw?: string,
  ): AnalyticsRange {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const parsedEnd = endDateRaw ? new Date(endDateRaw) : new Date(today);
    const endDate = Number.isNaN(parsedEnd.getTime())
      ? new Date(today)
      : parsedEnd;
    endDate.setUTCHours(0, 0, 0, 0);

    const parsedStart = startDateRaw ? new Date(startDateRaw) : null;
    const startDate =
      parsedStart && !Number.isNaN(parsedStart.getTime())
        ? parsedStart
        : (() => {
            const fallback = new Date(endDate);
            fallback.setUTCDate(fallback.getUTCDate() - 29);
            return fallback;
          })();

    startDate.setUTCHours(0, 0, 0, 0);

    if (startDate > endDate) {
      const swappedStart = new Date(endDate);
      const swappedEnd = new Date(startDate);
      swappedStart.setUTCHours(0, 0, 0, 0);
      swappedEnd.setUTCHours(0, 0, 0, 0);

      const endExclusiveTimestamp = new Date(swappedEnd);
      endExclusiveTimestamp.setUTCDate(endExclusiveTimestamp.getUTCDate() + 1);

      return {
        startDate: swappedStart,
        endDate: swappedEnd,
        endExclusiveTimestamp,
      };
    }

    const endExclusiveTimestamp = new Date(endDate);
    endExclusiveTimestamp.setUTCDate(endExclusiveTimestamp.getUTCDate() + 1);

    return {
      startDate,
      endDate,
      endExclusiveTimestamp,
    };
  }

  async getOverview(
    storeId: string,
    startDateRaw?: string,
    endDateRaw?: string,
  ) {
    const range = this.resolveRange(startDateRaw, endDateRaw);

    const weekStart = new Date(range.endDate);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

    const monthStart = new Date(
      Date.UTC(range.endDate.getUTCFullYear(), range.endDate.getUTCMonth(), 1),
    );

    const rows = await this.prisma.storeDailyStat.findMany({
      where: {
        storeId,
        date: {
          gte: range.startDate,
          lte: range.endDate,
        },
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
    const dayCount =
      Math.floor(
        (range.endDate.getTime() - range.startDate.getTime()) /
          (24 * 60 * 60 * 1000),
      ) + 1;

    for (let i = 0; i < dayCount; i += 1) {
      const d = new Date(range.startDate);
      d.setUTCDate(range.startDate.getUTCDate() + i);
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

        if (rowDate.getTime() === range.endDate.getTime()) {
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

  async getTopProducts(
    storeId: string,
    startDateRaw?: string,
    endDateRaw?: string,
  ) {
    const range = this.resolveRange(startDateRaw, endDateRaw);

    const rows = await this.prisma.$queryRaw<
      Array<{ product_id: string; revenue: unknown; orders: unknown }>
    >`
      SELECT product_id, SUM(amount) AS revenue, COUNT(*) AS orders
      FROM events
      WHERE store_id = ${storeId}
        AND event_type = 'purchase'
        AND timestamp >= ${range.startDate}
        AND timestamp < ${range.endExclusiveTimestamp}
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

  async getRecentActivity(
    storeId: string,
    startDateRaw?: string,
    endDateRaw?: string,
  ) {
    const range = this.resolveRange(startDateRaw, endDateRaw);

    const events = await this.prisma.event.findMany({
      where: {
        storeId,
        timestamp: {
          gte: range.startDate,
          lt: range.endExclusiveTimestamp,
        },
      },
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

  async getLiveVisitors(
    storeId: string,
    windowMinutesRaw?: number,
  ): Promise<LiveVisitorsSummary> {
    const windowMinutes =
      typeof windowMinutesRaw === 'number' && Number.isFinite(windowMinutesRaw)
        ? Math.min(Math.max(Math.floor(windowMinutesRaw), 1), 120)
        : 5;

    const rows = await this.prisma.$queryRaw<
      Array<{ event_type: string; event_count: unknown }>
    >`
      SELECT event_type::text AS event_type, COUNT(*)::bigint AS event_count
      FROM events
      WHERE store_id = ${storeId}
        AND timestamp >= NOW() - (${windowMinutes} * INTERVAL '1 minute')
      GROUP BY event_type
    `;

    const counts = {
      page_view: 0,
      add_to_cart: 0,
      remove_from_cart: 0,
      checkout_started: 0,
      purchase: 0,
    };

    for (const row of rows) {
      const key = row.event_type as keyof typeof counts;
      if (key in counts) {
        counts[key] = Number(row.event_count ?? 0);
      }
    }

    const pageViews = counts.page_view;
    const purchases = counts.purchase;

    const summary: LiveVisitorsSummary = {
      windowMinutes,
      // Estimate until session/user tracking is introduced.
      activeVisitors: pageViews,
      pageViews,
      cartsStarted: counts.add_to_cart,
      checkoutsStarted: counts.checkout_started,
      purchases,
      purchaseRate:
        pageViews === 0
          ? 0
          : Number(((purchases / pageViews) * 100).toFixed(2)),
      asOf: new Date().toISOString(),
    };

    return summary;
  }

  async getAlerts(storeId: string): Promise<StoreAlertsResponse> {
    const now = new Date();
    const generatedAt = now.toISOString();
    const windowMinutes = 30;
    const recentStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
    const liveSaleStart = new Date(now.getTime() - 15 * 60 * 1000);

    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const [
      recentRows,
      revenueRows,
      recentPurchase,
      todayTopProduct,
      yesterdayTopProduct,
    ] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ event_type: string; event_count: unknown }>
      >`
        SELECT event_type::text AS event_type, COUNT(*)::bigint AS event_count
        FROM events
        WHERE store_id = ${storeId}
          AND timestamp >= ${recentStart}
        GROUP BY event_type
      `,
      this.prisma.storeDailyStat.findMany({
        where: {
          storeId,
          eventType: 'purchase',
          date: {
            in: [today, yesterday],
          },
        },
        select: {
          date: true,
          count: true,
          revenue: true,
        },
      }),
      this.prisma.event.findFirst({
        where: {
          storeId,
          eventType: 'purchase',
          timestamp: {
            gte: liveSaleStart,
          },
        },
        orderBy: { timestamp: 'desc' },
        select: {
          timestamp: true,
          productId: true,
          amount: true,
          currency: true,
        },
      }),
      this.getTopProductForDay(storeId, today),
      this.getTopProductForDay(storeId, yesterday),
    ]);

    const counts = this.emptyEventCounts();
    for (const row of recentRows) {
      const key = row.event_type as keyof EventsByType;
      if (key in counts) {
        counts[key] = Number(row.event_count ?? 0);
      }
    }

    const revenueByDay = new Map<string, number>();
    for (const row of revenueRows) {
      revenueByDay.set(row.date.toISOString().slice(0, 10), Number(row.revenue));
    }

    const todayRevenue = revenueByDay.get(today.toISOString().slice(0, 10)) ?? 0;
    const yesterdayRevenue =
      revenueByDay.get(yesterday.toISOString().slice(0, 10)) ?? 0;

    const alerts: StoreAlert[] = [];

    if (counts.page_view >= 15 && counts.add_to_cart === 0) {
      alerts.push({
        id: 'high_visitors_zero_carts',
        severity: 'warning',
        title: 'High visitors, zero carts',
        message: `${counts.page_view} visitors landed in the last ${windowMinutes} minutes, but nobody added an item to cart.`,
        metricLabel: 'Visitors',
        metricValue: String(counts.page_view),
        createdAt: generatedAt,
      });
    }

    if (counts.checkout_started > 0 && counts.purchase === 0) {
      alerts.push({
        id: 'checkout_started_no_purchases',
        severity: 'critical',
        title: 'Checkout started, no purchases',
        message: `${counts.checkout_started} checkout starts have not turned into a purchase in the last ${windowMinutes} minutes.`,
        metricLabel: 'Checkout starts',
        metricValue: String(counts.checkout_started),
        createdAt: generatedAt,
      });
    }

    if (yesterdayRevenue >= 50 && todayRevenue < yesterdayRevenue * 0.5) {
      alerts.push({
        id: 'revenue_dropped_vs_yesterday',
        severity: 'warning',
        title: 'Revenue dropped vs yesterday',
        message: `Today is at ${this.formatMoney(todayRevenue)} after ${this.formatMoney(yesterdayRevenue)} yesterday.`,
        metricLabel: 'Today',
        metricValue: this.formatMoney(todayRevenue),
        createdAt: generatedAt,
      });
    }

    if (
      todayTopProduct &&
      yesterdayTopProduct &&
      todayTopProduct.productId !== yesterdayTopProduct.productId
    ) {
      alerts.push({
        id: 'top_product_changed_today',
        severity: 'info',
        title: 'Top product changed today',
        message: `Product ${todayTopProduct.productId} is leading today after product ${yesterdayTopProduct.productId} led yesterday.`,
        metricLabel: 'Today revenue',
        metricValue: this.formatMoney(todayTopProduct.revenue),
        createdAt: generatedAt,
      });
    }

    if (recentPurchase) {
      alerts.push({
        id: 'live_sale_happened',
        severity: 'success',
        title: 'Live sale happened',
        message: `Latest sale was ${this.formatMoney(
          Number(recentPurchase.amount ?? 0),
          recentPurchase.currency ?? 'USD',
        )}${recentPurchase.productId ? ` for product ${recentPurchase.productId}` : ''}.`,
        metricLabel: 'Sale time',
        metricValue: recentPurchase.timestamp.toISOString(),
        createdAt: generatedAt,
      });
    }

    return {
      generatedAt,
      windowMinutes,
      alerts,
    };
  }

  private async getTopProductForDay(
    storeId: string,
    date: Date,
  ): Promise<TopProductSignal | null> {
    const endExclusiveTimestamp = new Date(date);
    endExclusiveTimestamp.setUTCDate(endExclusiveTimestamp.getUTCDate() + 1);

    const rows = await this.prisma.$queryRaw<
      Array<{ product_id: string; revenue: unknown; orders: unknown }>
    >`
      SELECT product_id, COALESCE(SUM(amount), 0) AS revenue, COUNT(*) AS orders
      FROM events
      WHERE store_id = ${storeId}
        AND event_type = 'purchase'
        AND timestamp >= ${date}
        AND timestamp < ${endExclusiveTimestamp}
        AND product_id IS NOT NULL
      GROUP BY product_id
      ORDER BY revenue DESC
      LIMIT 1
    `;

    const [topProduct] = rows;
    if (!topProduct) {
      return null;
    }

    return {
      productId: topProduct.product_id,
      revenue: Number(topProduct.revenue ?? 0),
      orders: Number(topProduct.orders ?? 0),
    };
  }

  private emptyEventCounts(): EventsByType {
    return {
      page_view: 0,
      add_to_cart: 0,
      remove_from_cart: 0,
      checkout_started: 0,
      purchase: 0,
    };
  }

  private formatMoney(value: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
