import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('_api');
    await app.init();
  });

  it('/_api (GET)', () => {
    return request(app.getHttpServer())
      .get('/_api')
      .expect(200)
      .expect((res: Response) => {
        expect(res.body.data).toBe('Hello World!');
      });
  });
});

