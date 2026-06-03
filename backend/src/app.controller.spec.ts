import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API metadata', () => {
      expect(appController.getRoot()).toEqual(
        expect.objectContaining({
          name: 'Amboras Analytics API',
          status: 'ok',
        }),
      );
    });
  });

  describe('health', () => {
    it('should return a health snapshot', () => {
      expect(appController.getHealth()).toEqual(
        expect.objectContaining({
          service: 'amboras-analytics-api',
          status: 'ok',
        }),
      );
    });
  });
});
