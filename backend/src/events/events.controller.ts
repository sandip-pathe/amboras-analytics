import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

type AuthenticatedRequest = Request & {
  user: {
    storeId: string;
  };
};

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async ingestEvent(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateEventDto,
  ) {
    await this.eventsService.ingestEvent(req.user.storeId, dto);
    return { success: true };
  }
}
