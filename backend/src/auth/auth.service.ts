import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async createToken(storeId: string) {
    // Dev-only auth simplification: any storeId can mint a token.
    const payload = { sub: storeId, storeId };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
