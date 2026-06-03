import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { CreateEventDto, EventTypeDto } from '../events/dto/create-event.dto';
import { EventsService } from '../events/events.service';
import { PublicTrackEventDto } from './dto/public-track-event.dto';

type JsonRecord = Record<string, unknown>;

type ConnectorIngestResult = {
  success: true;
  source: 'tracking_snippet' | 'woocommerce' | 'shopify';
  ingested: number;
  skipped: number;
  eventIds: string[];
};

type PreparedConnectorEvent = {
  source: 'tracking_snippet' | 'woocommerce' | 'shopify';
  eventId: string;
  eventType: EventTypeDto;
  timestamp: Date;
  productId?: string;
  amount?: number;
  currency?: string;
};

const STORE_ID_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;
const PURCHASED_WOO_STATUSES = new Set(['processing', 'completed']);
const CHECKOUT_WOO_STATUSES = new Set(['pending', 'on-hold']);
const PURCHASED_SHOPIFY_FINANCIAL_STATUSES = new Set([
  'paid',
  'partially_paid',
  'partially_refunded',
]);
const CHECKOUT_SHOPIFY_FINANCIAL_STATUSES = new Set(['pending', 'authorized']);

@Injectable()
export class ConnectorsService {
  constructor(private readonly eventsService: EventsService) {}

  getConnectorConfig(storeId: string) {
    this.assertStoreId(storeId);

    const ingestKey = this.createIngestKey(storeId);
    const publicBaseUrl = this.getPublicBaseUrl();
    const query = new URLSearchParams({
      store_id: storeId,
      ingest_key: ingestKey,
    });

    return {
      store_id: storeId,
      ingest_key: ingestKey,
      tracking_snippet: `<script async src="${publicBaseUrl}/api/v1/connectors/snippet.js?${query.toString()}"></script>`,
      endpoints: {
        track: `${publicBaseUrl}/api/v1/connectors/track`,
        woocommerce_orders: `${publicBaseUrl}/api/v1/connectors/woocommerce/orders`,
        shopify_orders: `${publicBaseUrl}/api/v1/connectors/shopify/orders`,
      },
      headers: {
        'x-cartograph-store-id': storeId,
        'x-cartograph-ingest-key': ingestKey,
      },
    };
  }

  buildSnippet(storeId: string, ingestKey: string) {
    this.validateConnectorAccess(storeId, ingestKey);

    const storeIdJson = JSON.stringify(storeId);
    const ingestKeyJson = JSON.stringify(ingestKey);
    const fallbackEndpointJson = JSON.stringify(
      `${this.getPublicBaseUrl()}/api/v1/connectors/track`,
    );

    return `
(function () {
  if (window.Cartograph && window.Cartograph.__installed) return;

  var storeId = ${storeIdJson};
  var ingestKey = ${ingestKeyJson};
  var currentScript = document.currentScript;
  var fallbackEndpoint = ${fallbackEndpointJson};
  var endpoint = currentScript && currentScript.src
    ? new URL("/api/v1/connectors/track", currentScript.src).toString()
    : fallbackEndpoint;

  function eventId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return prefix + "_" + window.crypto.randomUUID();
    }
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  }

  function compactData(data) {
    data = data || {};
    var compacted = {};
    if (data.product_id || data.productId) compacted.product_id = String(data.product_id || data.productId);
    if (data.amount !== undefined && data.amount !== null && data.amount !== "") compacted.amount = Number(data.amount);
    if (data.currency) compacted.currency = String(data.currency);
    return compacted;
  }

  function track(eventType, data) {
    var payload = {
      store_id: storeId,
      ingest_key: ingestKey,
      event_id: eventId("web_" + eventType),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      data: compactData(data)
    };

    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  window.Cartograph = {
    __installed: true,
    track: track,
    trackPageView: function (data) { return track("page_view", data); },
    trackAddToCart: function (data) { return track("add_to_cart", data); },
    trackCheckoutStarted: function (data) { return track("checkout_started", data); },
    trackPurchase: function (data) { return track("purchase", data); }
  };

  if (!window.__cartographPageViewSent) {
    window.__cartographPageViewSent = true;
    track("page_view", {});
  }
})();
`.trimStart();
  }

  async track(dto: PublicTrackEventDto): Promise<ConnectorIngestResult> {
    this.validateConnectorAccess(dto.store_id, dto.ingest_key);

    return this.ingestPreparedEvents(dto.store_id, [
      {
        source: 'tracking_snippet',
        eventId: dto.event_id ?? `web_${dto.event_type}_${randomUUID()}`,
        eventType: dto.event_type,
        timestamp: this.normalizeDate(dto.timestamp),
        productId: dto.data?.product_id,
        amount: dto.data?.amount,
        currency: dto.data?.currency,
      },
    ]);
  }

  async ingestWooCommerceOrder(
    storeId: string,
    ingestKey: string,
    payload: JsonRecord,
  ): Promise<ConnectorIngestResult> {
    this.validateConnectorAccess(storeId, ingestKey);

    const prepared = this.mapWooCommerceOrder(payload);
    return this.ingestPreparedEvents(storeId, prepared, 'woocommerce');
  }

  async ingestShopifyOrder(
    storeId: string,
    ingestKey: string,
    payload: JsonRecord,
  ): Promise<ConnectorIngestResult> {
    this.validateConnectorAccess(storeId, ingestKey);

    const prepared = this.mapShopifyOrder(payload);
    return this.ingestPreparedEvents(storeId, prepared, 'shopify');
  }

  private async ingestPreparedEvents(
    storeId: string,
    preparedEvents: PreparedConnectorEvent[],
    fallbackSource: ConnectorIngestResult['source'] = 'tracking_snippet',
  ): Promise<ConnectorIngestResult> {
    if (preparedEvents.length === 0) {
      return {
        success: true,
        source: fallbackSource,
        ingested: 0,
        skipped: 0,
        eventIds: [],
      };
    }

    let ingested = 0;
    let skipped = 0;
    const eventIds: string[] = [];

    for (const event of preparedEvents) {
      const dto: CreateEventDto = {
        event_id: event.eventId,
        store_id: storeId,
        event_type: event.eventType,
        timestamp: event.timestamp,
        data: {
          product_id: event.productId,
          amount: event.amount,
          currency: event.currency,
        },
      };

      const result = await this.eventsService.ingestEvent(storeId, dto);
      eventIds.push(result.eventId);
      if (result.created) {
        ingested += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      success: true,
      source: preparedEvents[0].source,
      ingested,
      skipped,
      eventIds,
    };
  }

  private mapWooCommerceOrder(payload: JsonRecord): PreparedConnectorEvent[] {
    const orderId = this.requiredId(payload.id, 'WooCommerce order id');
    const status = this.asString(payload.status)?.toLowerCase() ?? '';
    const timestamp = this.firstValidDate([
      payload.date_paid_gmt,
      payload.date_completed_gmt,
      payload.date_created_gmt,
      payload.date_paid,
      payload.date_completed,
      payload.date_created,
    ]);
    const currency = this.asString(payload.currency) ?? 'USD';

    if (PURCHASED_WOO_STATUSES.has(status)) {
      const lineItems = this.asRecords(payload.line_items);
      if (lineItems.length === 0) {
        return [
          {
            source: 'woocommerce',
            eventId: `woo_order_${orderId}`,
            eventType: EventTypeDto.purchase,
            timestamp,
            amount: this.asMoney(payload.total),
            currency,
          },
        ];
      }

      return lineItems.map((lineItem, index) => {
        const lineId =
          this.asString(lineItem.id) ??
          this.asString(lineItem.product_id) ??
          String(index + 1);

        return {
          source: 'woocommerce',
          eventId: `woo_order_${orderId}_line_${lineId}`,
          eventType: EventTypeDto.purchase,
          timestamp,
          productId:
            this.asString(lineItem.product_id) ??
            this.asString(lineItem.sku) ??
            this.asString(lineItem.name),
          amount:
            this.asMoney(lineItem.total) ??
            this.asMoney(lineItem.subtotal) ??
            this.asMoney(payload.total),
          currency,
        };
      });
    }

    if (CHECKOUT_WOO_STATUSES.has(status)) {
      return [
        {
          source: 'woocommerce',
          eventId: `woo_order_${orderId}_checkout`,
          eventType: EventTypeDto.checkout_started,
          timestamp,
          amount: this.asMoney(payload.total),
          currency,
        },
      ];
    }

    return [];
  }

  private mapShopifyOrder(payload: JsonRecord): PreparedConnectorEvent[] {
    const orderId = this.requiredId(payload.id, 'Shopify order id');
    const financialStatus =
      this.asString(payload.financial_status)?.toLowerCase() ?? '';
    const timestamp = this.firstValidDate([
      payload.processed_at,
      payload.created_at,
      payload.updated_at,
    ]);
    const currency =
      this.asString(payload.currency) ??
      this.asString(payload.presentment_currency) ??
      'USD';

    if (PURCHASED_SHOPIFY_FINANCIAL_STATUSES.has(financialStatus)) {
      const lineItems = this.asRecords(payload.line_items);
      if (lineItems.length === 0) {
        return [
          {
            source: 'shopify',
            eventId: `shopify_order_${orderId}`,
            eventType: EventTypeDto.purchase,
            timestamp,
            amount:
              this.asMoney(payload.current_total_price) ??
              this.asMoney(payload.total_price),
            currency,
          },
        ];
      }

      return lineItems.map((lineItem, index) => {
        const lineId =
          this.asString(lineItem.id) ??
          this.asString(lineItem.product_id) ??
          String(index + 1);

        return {
          source: 'shopify',
          eventId: `shopify_order_${orderId}_line_${lineId}`,
          eventType: EventTypeDto.purchase,
          timestamp,
          productId:
            this.asString(lineItem.product_id) ??
            this.asString(lineItem.sku) ??
            this.asString(lineItem.title),
          amount:
            this.lineItemTotal(lineItem) ??
            this.asMoney(payload.current_total_price) ??
            this.asMoney(payload.total_price),
          currency,
        };
      });
    }

    if (CHECKOUT_SHOPIFY_FINANCIAL_STATUSES.has(financialStatus)) {
      return [
        {
          source: 'shopify',
          eventId: `shopify_order_${orderId}_checkout`,
          eventType: EventTypeDto.checkout_started,
          timestamp,
          amount:
            this.asMoney(payload.current_total_price) ??
            this.asMoney(payload.total_price),
          currency,
        },
      ];
    }

    return [];
  }

  private lineItemTotal(lineItem: JsonRecord): number | undefined {
    const price = this.asMoney(lineItem.price);
    if (price === undefined) {
      return undefined;
    }

    const quantity = this.asMoney(lineItem.quantity) ?? 1;
    return this.toMoney(price * quantity);
  }

  private createIngestKey(storeId: string) {
    const digest = createHmac('sha256', this.getIngestSecret())
      .update(`cartograph:${storeId}`)
      .digest('base64url');

    return `cg_${digest.slice(0, 32)}`;
  }

  private validateConnectorAccess(storeId: string, ingestKey: string) {
    this.assertStoreId(storeId);

    if (!ingestKey) {
      throw new UnauthorizedException('Missing connector ingest key.');
    }

    const expected = this.createIngestKey(storeId);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(ingestKey);

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new UnauthorizedException('Invalid connector ingest key.');
    }
  }

  private assertStoreId(storeId: string) {
    if (!STORE_ID_PATTERN.test(storeId)) {
      throw new BadRequestException(
        'Invalid store_id. Use 2-64 letters, numbers, underscores, or hyphens.',
      );
    }
  }

  private getIngestSecret() {
    return (
      process.env.CONNECTOR_INGEST_SECRET ??
      process.env.JWT_SECRET ??
      'dev-ingest-secret-change-in-production'
    );
  }

  private getPublicBaseUrl() {
    return (
      process.env.PUBLIC_API_URL ??
      process.env.API_BASE_URL ??
      'http://localhost:3001'
    ).replace(/\/+$/, '');
  }

  private firstValidDate(values: unknown[]) {
    for (const value of values) {
      const date = this.toDate(value);
      if (date) {
        return date;
      }
    }

    return new Date();
  }

  private normalizeDate(value?: Date) {
    const date = this.toDate(value);
    return date ?? new Date();
  }

  private toDate(value: unknown): Date | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return undefined;
  }

  private requiredId(value: unknown, label: string) {
    const id = this.asString(value);
    if (!id) {
      throw new BadRequestException(`${label} is required.`);
    }
    return id;
  }

  private asRecords(value: unknown): JsonRecord[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is JsonRecord => this.isRecord(item));
  }

  private isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private asString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return undefined;
  }

  private asMoney(value: unknown): number | undefined {
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return this.toMoney(parsed);
      }
    }

    return undefined;
  }

  private toMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
