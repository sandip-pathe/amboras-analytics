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
import { EventTypeDto } from '../../events/dto/create-event.dto';

class PublicEventDataDto {
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

export class PublicTrackEventDto {
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  ingest_key: string;

  @IsEnum(EventTypeDto)
  event_type: EventTypeDto;

  @IsOptional()
  @IsString()
  event_id?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  timestamp?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => PublicEventDataDto)
  data?: PublicEventDataDto;
}
