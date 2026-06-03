import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService alerts', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    storeDailyStat: {
      findMany: jest.fn(),
    },
    event: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns merchant-friendly alerts from live funnel and revenue signals', async () => {
    const service = new AnalyticsService(prisma);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([
        { event_type: 'page_view', event_count: 25 },
        { event_type: 'checkout_started', event_count: 2 },
      ])
      .mockResolvedValueOnce([
        { product_id: 'prod_today', revenue: 200, orders: 4 },
      ])
      .mockResolvedValueOnce([
        { product_id: 'prod_yesterday', revenue: 300, orders: 5 },
      ]);

    prisma.storeDailyStat.findMany = jest.fn().mockResolvedValue([
      { date: today, eventType: 'purchase', count: 1, revenue: 40 },
      {
        date: yesterday,
        eventType: 'purchase',
        count: 3,
        revenue: 120,
      },
    ]);
    prisma.event.findFirst = jest.fn().mockResolvedValue({
      timestamp: new Date('2026-03-28T13:00:00Z'),
      productId: 'prod_today',
      amount: 50,
      currency: 'USD',
    });

    const response = await service.getAlerts('store_alpha');

    expect(response.alerts.map((alert) => alert.id)).toEqual(
      expect.arrayContaining([
        'high_visitors_zero_carts',
        'checkout_started_no_purchases',
        'revenue_dropped_vs_yesterday',
        'top_product_changed_today',
        'live_sale_happened',
      ]),
    );
    expect(response.alerts[0]).toEqual(
      expect.objectContaining({
        title: 'High visitors, zero carts',
        metricValue: '25',
      }),
    );
  });
});
