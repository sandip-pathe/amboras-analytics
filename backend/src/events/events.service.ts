import { ForbiddenException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, EventTypeDto } from './dto/create-event.dto';

export type IngestEventResult = {
  created: boolean;
  eventId: string;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async ingestEvent(
    authenticatedStoreId: string,
    dto: CreateEventDto,
  ): Promise<IngestEventResult> {
    if (dto.store_id !== authenticatedStoreId) {
      throw new ForbiddenException(
        'Event store_id must match the authenticated store.',
      );
    }

    const statId = randomUUID();
    const normalizedDate = new Date(dto.timestamp);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const revenueIncrement =
      dto.event_type === EventTypeDto.purchase ? (dto.data?.amount ?? 0) : 0;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.event.create({
          data: {
            eventId: dto.event_id,
            storeId: authenticatedStoreId,
            eventType: dto.event_type,
            timestamp: dto.timestamp,
            productId: dto.data?.product_id,
            amount: dto.data?.amount,
            currency: dto.data?.currency,
          },
        });

        await tx.$executeRaw`
          INSERT INTO store_daily_stats (id, store_id, date, event_type, count, revenue)
          VALUES (
            ${statId},
            ${authenticatedStoreId},
            ${normalizedDate},
            ${dto.event_type}::"EventType",
            1,
            ${revenueIncrement}
          )
          ON CONFLICT (store_id, date, event_type)
          DO UPDATE SET
            count = store_daily_stats.count + 1,
            revenue = store_daily_stats.revenue + EXCLUDED.revenue
        `;
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { created: false, eventId: dto.event_id };
      }

      throw error;
    }

    this.eventEmitter.emit('event.ingested', {
      eventId: dto.event_id,
      storeId: authenticatedStoreId,
      eventType: dto.event_type,
      timestamp: dto.timestamp,
      amount: dto.data?.amount ?? null,
      productId: dto.data?.product_id ?? null,
    });

    return { created: true, eventId: dto.event_id };
  }
}
