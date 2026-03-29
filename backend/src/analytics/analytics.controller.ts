import {
  Controller,
  Get,
  MessageEvent,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService, LiveVisitorsSummary } from './analytics.service';

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

  private getLiveVisitorsSnapshot(
    storeId: string,
    windowMinutesRaw?: number,
  ): Promise<LiveVisitorsSummary> {
    const service = this.analyticsService as unknown as {
      getLiveVisitors: (
        storeId: string,
        windowMinutesRaw?: number,
      ) => Promise<LiveVisitorsSummary>;
    };

    return service.getLiveVisitors(storeId, windowMinutesRaw);
  }

  @Get('overview')
  getOverview(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getOverview(
      req.user.storeId,
      startDate,
      endDate,
    );
  }

  @Get('top-products')
  getTopProducts(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getTopProducts(
      req.user.storeId,
      startDate,
      endDate,
    );
  }

  @Get('recent-activity')
  getRecentActivity(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRecentActivity(
      req.user.storeId,
      startDate,
      endDate,
    );
  }

  @Get('live-visitors')
  getLiveVisitors(
    @Req() req: AuthenticatedRequest,
    @Query('windowMinutes') windowMinutesRaw?: string,
  ): Promise<LiveVisitorsSummary> {
    const parsedWindow = windowMinutesRaw
      ? Number.parseInt(windowMinutesRaw, 10)
      : undefined;

    return this.getLiveVisitorsSnapshot(req.user.storeId, parsedWindow);
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

  @Sse('live-visitors/stream')
  liveVisitorsStream(
    @Req() req: AuthenticatedRequest,
  ): Observable<MessageEvent> {
    return new Observable((observer) => {
      const handler = (event: { storeId: string }) => {
        if (event.storeId !== req.user.storeId) {
          return;
        }

        void this.getLiveVisitorsSnapshot(req.user.storeId)
          .then((snapshot) => {
            observer.next({ data: snapshot });
          })
          .catch(() => {
            // Keep stream alive even if one snapshot fetch fails.
          });
      };

      this.eventEmitter.on('event.ingested', handler);

      return () => {
        this.eventEmitter.off('event.ingested', handler);
      };
    });
  }
}
