/**
 * Runtime 本机 daemon 运维端点（e2e）
 *
 * status 可安全触达（只读探活）；start/stop 有真实进程副作用（拉起/强杀本机
 * daemon），逻辑由 daemon-ops.service.spec 单测覆盖（mock 进程），不进共享环境 e2e。
 * APP_MODE=standalone（本地 .env）→ 200；CI 无 .env → 403，两种合法出口都接。
 */
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

describe('Runtime local daemon ops (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('RuntimeLocalDaemon e2e');
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

  it('GET /_api/runtime/local-daemon/status：standalone 返回探活形状 / 非 standalone 403', () => {
    return wsHttp
      .get('/_api/runtime/local-daemon/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((res: Response) => {
        expect([200, 403]).toContain(res.status);
        if (res.status === 200) {
          expect(res.body.data).toEqual(
            expect.objectContaining({
              running: expect.any(Boolean),
              logPath: expect.any(String),
            }),
          );
        } else {
          expect(res.body.error).toBeDefined();
        }
      });
  });
});
