import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTokenDto } from './dto/create-token.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  @ApiOperation({ summary: 'Dev-only token mint endpoint (no password/user table)' })
  @ApiBody({ type: CreateTokenDto })
  createToken(@Body() body: CreateTokenDto) {
    return this.authService.createToken(body.storeId);
  }
}
