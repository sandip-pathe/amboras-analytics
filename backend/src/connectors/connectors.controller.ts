import {
  Body,
  Controller,
  Get,
  Headers,
  Header,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConnectorsService } from './connectors.service';
import { PublicTrackEventDto } from './dto/public-track-event.dto';

type AuthenticatedRequest = Request & {
  user: {
    storeId: string;
  };
};

type WebhookPayload = Record<string, unknown>;

@Controller('connectors')
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Get('ingest-key')
  @UseGuards(JwtAuthGuard)
  getIngestKey(@Req() req: AuthenticatedRequest) {
    return this.connectorsService.getConnectorConfig(req.user.storeId);
  }

  @Get('snippet.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  getSnippet(
    @Query('store_id') storeId: string,
    @Query('ingest_key') ingestKey: string,
  ) {
    return this.connectorsService.buildSnippet(storeId, ingestKey);
  }

  @Post('track')
  track(@Body() dto: PublicTrackEventDto) {
    return this.connectorsService.track(dto);
  }

  @Post('woocommerce/orders')
  ingestWooCommerceOrder(
    @Body() payload: WebhookPayload,
    @Headers('x-cartograph-store-id') headerStoreId?: string,
    @Headers('x-cartograph-ingest-key') headerIngestKey?: string,
    @Query('store_id') queryStoreId?: string,
    @Query('ingest_key') queryIngestKey?: string,
  ) {
    return this.connectorsService.ingestWooCommerceOrder(
      queryStoreId ?? headerStoreId ?? '',
      queryIngestKey ?? headerIngestKey ?? '',
      payload,
    );
  }

  @Post('shopify/orders')
  ingestShopifyOrder(
    @Body() payload: WebhookPayload,
    @Headers('x-cartograph-store-id') headerStoreId?: string,
    @Headers('x-cartograph-ingest-key') headerIngestKey?: string,
    @Query('store_id') queryStoreId?: string,
    @Query('ingest_key') queryIngestKey?: string,
  ) {
    return this.connectorsService.ingestShopifyOrder(
      queryStoreId ?? headerStoreId ?? '',
      queryIngestKey ?? headerIngestKey ?? '',
      payload,
    );
  }
}
