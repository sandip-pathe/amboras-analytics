import { ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EventTypeDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

describe('EventsService', () => {
  const tx = {
    event: {
      create: jest.fn(),
    },
    $executeRaw: jest.fn(),
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaService;

  const eventEmitter = {
    emit: jest.fn(),
  } as unknown as EventEmitter2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects events for a different store than the authenticated tenant', async () => {
    const service = new EventsService(prisma, eventEmitter);

    await expect(
      service.ingestEvent('store_alpha', {
        event_id: 'evt_cross_store',
        store_id: 'store_beta',
        event_type: EventTypeDto.purchase,
        timestamp: new Date('2026-03-28T13:00:00Z'),
        data: {
          product_id: 'prod_001',
          amount: 99,
          currency: 'USD',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('uses the authenticated store as the write and broadcast tenant', async () => {
    const service = new EventsService(prisma, eventEmitter);

    await service.ingestEvent('store_alpha', {
      event_id: 'evt_same_store',
      store_id: 'store_alpha',
      event_type: EventTypeDto.purchase,
      timestamp: new Date('2026-03-28T13:00:00Z'),
      data: {
        product_id: 'prod_001',
        amount: 99,
        currency: 'USD',
      },
    });

    expect(tx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: 'evt_same_store',
          storeId: 'store_alpha',
        }),
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'event.ingested',
      expect.objectContaining({
        eventId: 'evt_same_store',
        storeId: 'store_alpha',
      }),
    );
  });
});
