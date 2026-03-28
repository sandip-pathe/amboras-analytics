import {
  Controller,
  Get,
  MessageEvent,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

type RequestUser = {
  storeId: string;
};

type AuthenticatedRequest = Request & {
  user: RequestUser;
};

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get('overview')
  getOverview(@Req() req: AuthenticatedRequest) {
    return this.analyticsService.getOverview(req.user.storeId);
  }

  @Get('top-products')
  getTopProducts(@Req() req: AuthenticatedRequest) {
    return this.analyticsService.getTopProducts(req.user.storeId);
  }

  @Get('recent-activity')
  getRecentActivity(@Req() req: AuthenticatedRequest) {
    return this.analyticsService.getRecentActivity(req.user.storeId);
  }

  @Sse('live')
  liveEvents(@Req() req: AuthenticatedRequest): Observable<MessageEvent> {
    return new Observable((observer) => {
      const handler = (event: {
        eventId: string;
        storeId: string;
        eventType: string;
        timestamp: string | Date;
        amount: number | null;
        productId: string | null;
      }) => {
        if (event.storeId === req.user.storeId) {
          observer.next({ data: event });
        }
      };

      this.eventEmitter.on('event.ingested', handler);

      return () => {
        this.eventEmitter.off('event.ingested', handler);
      };
    });
  }
}
