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

  it('returns API health metadata', () => {
    expect(appController.health()).toEqual({
      name: 'SIGER API',
      status: 'ok',
      version: '1.0.0',
    });
  });

  it('logs in the seeded admin user', () => {
    const response = appController.login({
      email: 'admin@siger.edu',
      password: 'Admin123!',
    });

    expect(response.user).toMatchObject({
      email: 'admin@siger.edu',
      role: 'admin',
    });
    expect(response.token).toEqual(expect.any(String));
  });
});
