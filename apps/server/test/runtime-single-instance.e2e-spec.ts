/**
 * Runtime 单实例保证 (e2e)：同设备注册/心跳互斥——同一 deviceId 只有一个
 * online 注册；心跳超时的注册在列表中按离线展示。
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  withWs,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

function makeRegisterPayload(runtimeId: string, deviceId: string) {
  return {
    runtimeId,
    deviceId,
    hostPlatform: process.platform,
    runtimeVersion: '0.1.0',
    protocolVersion: '1.0.0',
    workspaceRoots: [],
    availableProviders: ['file'],
    cliProviders: ['claude-code'],
  };
}

describe('Runtime single-instance (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);
    ws = createIsolatedWorkspace('RuntimeSingle e2e');
    wsHttp = wsRequest(app, ws.id);
    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    token = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  async function register(runtimeId: string, deviceId: string) {
    const res: Response = await wsHttp
      .post('/_api/runtime/register')
      .send(makeRegisterPayload(runtimeId, deviceId))
      .expect(201);
    return {
      sessionId: res.body.data.runtimeSessionId as string,
      sessionToken: res.body.data.runtimeSessionToken as string,
    };
  }

  async function heartbeat(
    runtimeId: string,
    session: { sessionId: string; sessionToken: string },
  ) {
    await wsHttp
      .post(`/_api/runtime/${runtimeId}/heartbeat`)
      .set('x-runtime-session-id', session.sessionId)
      .set('x-runtime-session-token', session.sessionToken)
      .send({ runtimeSessionId: session.sessionId, status: 'online' })
      .expect(201);
  }

  async function listStatuses(): Promise<Record<string, string>> {
    const res: Response = await wsHttp
      .get('/_api/runtime/registrations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const list = res.body.data as Array<{ runtimeId: string; status: string }>;
    return Object.fromEntries(list.map((r) => [r.runtimeId, r.status]));
  }

  it('同设备双注册：新注册压制旧注册为 offline', async () => {
    const a = await register('e2e-rt-dup-a', 'e2e-device-dup');
    await heartbeat('e2e-rt-dup-a', a);
    expect((await listStatuses())['e2e-rt-dup-a']).toBe('online');

    await register('e2e-rt-dup-b', 'e2e-device-dup');
    const statuses = await listStatuses();
    expect(statuses['e2e-rt-dup-b']).toBe('online');
    expect(statuses['e2e-rt-dup-a']).toBe('offline');
  });

  it('旧实例心跳反超：只有最近心跳者保持 online', async () => {
    const a = await register('e2e-rt-dup-a', 'e2e-device-dup');
    await heartbeat('e2e-rt-dup-a', a);
    const statuses = await listStatuses();
    expect(statuses['e2e-rt-dup-a']).toBe('online');
    expect(statuses['e2e-rt-dup-b']).toBe('offline');
  });

  it('不同设备互不影响', async () => {
    await register('e2e-rt-other', 'e2e-device-other');
    const statuses = await listStatuses();
    expect(statuses['e2e-rt-other']).toBe('online');
    expect(statuses['e2e-rt-dup-b']).toBe('offline'); // 未被误伤恢复
  });

  it('心跳超时的注册按离线展示', async () => {
    // 直接把库里的心跳时间拨回 10 分钟前
    await withWs(ws.id, async () => {
      const { PrismaService } =
        await import('../src/core/database/prisma.service');
      const prisma = app.get(PrismaService);
      const stale = new Date(Date.now() - 10 * 60_000).toISOString();
      const records = await prisma.appConfig.findMany({
        where: { scope: 'runtime.registration' },
      });
      for (const item of records) {
        const v = item.value as { runtimeId: string; lastHeartbeatAt: string };
        if (v.runtimeId === 'e2e-rt-dup-a') {
          await prisma.appConfig.update({
            where: { id: item.id },
            data: { value: { ...v, lastHeartbeatAt: stale } },
          });
        }
      }
    });
    const statuses = await listStatuses();
    expect(statuses['e2e-rt-dup-a']).toBe('offline');
  });
});
