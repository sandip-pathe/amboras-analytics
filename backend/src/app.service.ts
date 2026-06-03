import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return {
      name: 'Cartograph API',
      version: '1.0.0',
      status: 'ok',
      docs: 'https://github.com/sandip-pathe/amboras-analytics',
    };
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'cartograph-api',
      checkedAt: new Date().toISOString(),
    };
  }
}
