import { UnauthorizedException } from '@nestjs/common';
import { EventTypeDto } from '../events/dto/create-event.dto';
import { EventsService } from '../events/events.service';
import { ConnectorsService } from './connectors.service';

describe('ConnectorsService', () => {
  const ingestEvent = jest.fn(async (_storeId, dto) => ({
    created: true,
    eventId: dto.event_id,
  }));

  const eventsService = {
    ingestEvent,
  } as unknown as EventsService;

  let service: ConnectorsService;

  beforeEach(() => {
    process.env.CONNECTOR_INGEST_SECRET = 'test-ingest-secret';
    ingestEvent.mockClear();
    service = new ConnectorsService(eventsService);
  });

  afterEach(() => {
    delete process.env.CONNECTOR_INGEST_SECRET;
  });

  it('accepts browser tracking only with the scoped store ingest key', async () => {
    const config = service.getConnectorConfig('store_alpha');

    await service.track({
      store_id: 'store_alpha',
      ingest_key: config.ingest_key,
      event_id: 'web_add_to_cart_001',
      event_type: EventTypeDto.add_to_cart,
      timestamp: new Date('2026-03-28T10:00:00Z'),
      data: { product_id: 'prod_001' },
    });

    expect(ingestEvent).toHaveBeenCalledWith(
      'store_alpha',
      expect.objectContaining({
        event_id: 'web_add_to_cart_001',
        store_id: 'store_alpha',
        event_type: EventTypeDto.add_to_cart,
        data: expect.objectContaining({ product_id: 'prod_001' }),
      }),
    );

    await expect(
      service.track({
        store_id: 'store_beta',
        ingest_key: config.ingest_key,
        event_type: EventTypeDto.page_view,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps WooCommerce completed order line items into purchase events', async () => {
    const config = service.getConnectorConfig('store_alpha');

    const result = await service.ingestWooCommerceOrder(
      'store_alpha',
      config.ingest_key,
      {
        id: 12345,
        status: 'completed',
        currency: 'USD',
        date_created_gmt: '2026-03-28T12:00:00Z',
        line_items: [
          { id: 11, product_id: 501, total: '29.99' },
          { id: 12, product_id: 502, total: '15.50' },
        ],
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        source: 'woocommerce',
        ingested: 2,
        skipped: 0,
      }),
    );
    expect(ingestEvent).toHaveBeenCalledTimes(2);
    expect(ingestEvent).toHaveBeenNthCalledWith(
      1,
      'store_alpha',
      expect.objectContaining({
        event_id: 'woo_order_12345_line_11',
        event_type: EventTypeDto.purchase,
        data: expect.objectContaining({
          product_id: '501',
          amount: 29.99,
          currency: 'USD',
        }),
      }),
    );
  });

  it('maps Shopify paid order line items into purchase events', async () => {
    const config = service.getConnectorConfig('store_alpha');

    await service.ingestShopifyOrder('store_alpha', config.ingest_key, {
      id: 67890,
      financial_status: 'paid',
      currency: 'USD',
      created_at: '2026-03-28T13:00:00Z',
      line_items: [{ id: 21, product_id: 701, price: '10.00', quantity: 3 }],
    });

    expect(ingestEvent).toHaveBeenCalledWith(
      'store_alpha',
      expect.objectContaining({
        event_id: 'shopify_order_67890_line_21',
        event_type: EventTypeDto.purchase,
        data: expect.objectContaining({
          product_id: '701',
          amount: 30,
          currency: 'USD',
        }),
      }),
    );
  });
});
