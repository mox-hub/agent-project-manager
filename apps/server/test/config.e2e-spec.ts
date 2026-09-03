import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

describe('Config (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Config e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('PUT /_api/config', () => {
    it('should set global config values', () => {
      return wsHttp
        .put('/_api/config')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: 'global',
          config: { 'e2e.testKey': 'e2e-value', 'e2e.answer': 42 },
        })
        .expect(200);
    });
  });

  describe('GET /_api/config', () => {
    it('should read back global config values', () => {
      return wsHttp
        .get('/_api/config?scope=global')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          expect(JSON.stringify(res.body.data)).toContain('e2e.testKey');
          expect(JSON.stringify(res.body.data)).toContain('e2e-value');
        });
    });
  });

  describe('DELETE /_api/config', () => {
    it('should delete config keys', () => {
      return wsHttp
        .delete('/_api/config')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ scope: 'global', keys: ['e2e.testKey', 'e2e.answer'] })
        .expect(200)
        .expect((res: Response) => {
          return wsHttp
            .get('/_api/config?scope=global')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .expect((after: Response) => {
              expect(JSON.stringify(after.body.data)).not.toContain(
                'e2e.testKey',
              );
            });
        });
    });
  });
});
