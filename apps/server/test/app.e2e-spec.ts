import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { AppModule } from './../src/app.module';
import { registerUnknownRouteFilter } from '../src/common/filters/unknown-route.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('_api');
    await app.init();
    // 与 main.ts 同口径：路由注册完成后追加未知路由信封兜底
    registerUnknownRouteFilter(app);
  });

  it('/_api/health (GET) returns hello message', () => {
    return request(app.getHttpServer())
      .get('/_api/health')
      .expect(200)
      .expect((res: Response) => {
        expect(res.body.data).toBe('Hello World!');
      });
  });

  it('未知路由（前缀内）返回统一 404 信封', () => {
    return request(app.getHttpServer())
      .get('/_api/definitely-not-a-route')
      .expect(404)
      .expect((res: Response) => {
        expect(res.headers['content-type']).toContain('application/json');
        expect(res.body.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.data).toBeNull();
        expect(res.body.error.code).toBe('NOT_FOUND');
        expect(res.body.error.message).toBe(
          'Cannot GET /_api/definitely-not-a-route',
        );
        expect(typeof res.body.requestId).toBe('string');
        expect(res.body.requestId).toBeTruthy();
      });
  });

  it('未知路由（前缀外）不落 Express HTML，返回统一 404 信封', () => {
    return request(app.getHttpServer())
      .post('/outside-prefix/path')
      .expect(404)
      .expect((res: Response) => {
        expect(res.headers['content-type']).toContain('application/json');
        expect(res.text.startsWith('<!')).toBe(false);
        expect(res.body.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('NOT_FOUND');
        expect(res.body.error.message).toBe('Cannot POST /outside-prefix/path');
      });
  });

  it('信封 requestId 透传 x-request-id 头', () => {
    return request(app.getHttpServer())
      .get('/_api/no/such/route')
      .set('x-request-id', 'trace-e2e-1')
      .expect(404)
      .expect((res: Response) => {
        expect(res.body.requestId).toBe('trace-e2e-1');
      });
  });
});
