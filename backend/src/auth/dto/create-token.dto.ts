import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTokenDto {
  @IsString()
  @IsNotEmpty()
  storeId: string;
}
