import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum EventTypeDto {
  page_view = 'page_view',
  add_to_cart = 'add_to_cart',
  remove_from_cart = 'remove_from_cart',
  checkout_started = 'checkout_started',
  purchase = 'purchase',
}

class EventDataDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  event_id: string;

  @IsString()
  @IsNotEmpty()
  store_id: string;

  @IsEnum(EventTypeDto)
  event_type: EventTypeDto;

  @Type(() => Date)
  @IsDate()
  timestamp: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventDataDto)
  data?: EventDataDto;
}
