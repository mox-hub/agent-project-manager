import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

describe('AI Hub (e2e, local-only paths)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let providerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('AiHub e2e');
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

  describe('GET /_api/ai/models', () => {
    it('should list model configs', () => {
      return wsHttp
        .get('/_api/ai/models')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/ai/conversations', () => {
    it('should list conversations', () => {
      return wsHttp
        .get('/_api/ai/conversations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  // workflow 定义/运行面已随 CAP-A-11 迁出 ai-hub，落到独立 workflow 模块
  // （/_api/workflows*），用例见同目录 workflow.e2e-spec.ts

  describe('POST /_api/ai/providers', () => {
    it('should create provider config', () => {
      return wsHttp
        .post('/_api/ai/providers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          provider: 'openai',
          displayName: 'E2E OpenAI',
          apiKey: 'e2e-not-a-real-key',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          providerId = res.body.data.id;
          expect(providerId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/ai/providers', () => {
    it('should list providers', () => {
      return wsHttp
        .get('/_api/ai/providers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(providerId);
        });
    });
  });

  describe('GET /_api/ai/providers/:id', () => {
    it('should get provider detail', () => {
      return wsHttp
        .get(`/_api/ai/providers/${providerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(providerId);
        });
    });
  });

  describe('PATCH /_api/ai/providers/:id', () => {
    it('should update provider', () => {
      return wsHttp
        .patch(`/_api/ai/providers/${providerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'E2E OpenAI v2' })
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('v2');
        });
    });
  });

  // ─── 内置模型（CAP-A-20：工作区默认 AI 模型）───

  describe('GET /_api/ai/default-model', () => {
    it('should return null default model when unset', () => {
      return wsHttp
        .get('/_api/ai/default-model')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.provider).toBeNull();
          expect(res.body.data.model).toBeNull();
        });
    });
  });

  describe('PUT /_api/ai/default-model', () => {
    it('should reject unknown provider with 404', () => {
      return wsHttp
        .put('/_api/ai/default-model')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ provider: 'deepseek', model: 'deepseek-chat' })
        .expect(404);
    });

    it('should set and read back default model', async () => {
      await wsHttp
        .put('/_api/ai/default-model')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ provider: 'openai', model: 'gpt-4o-mini' })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.provider).toBe('openai');
          expect(res.body.data.model).toBe('gpt-4o-mini');
        });

      return wsHttp
        .get('/_api/ai/default-model')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.provider).toBe('openai');
          expect(res.body.data.model).toBe('gpt-4o-mini');
        });
    });
  });

  // ─── 余额查询（CAP-A-20 切片二：充值型/套餐型归一化）───

  describe('GET /_api/ai/providers/:id/balance', () => {
    it('should return 404 for unknown provider', () => {
      return wsHttp
        .get('/_api/ai/providers/non-existent/balance')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should surface unreachable balance endpoint as 400 (offline-safe)', async () => {
      // .invalid 保留 TLD 不经 DNS 解析：离线环境同样确定性失败
      await wsHttp
        .patch(`/_api/ai/providers/${providerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          metadata: { balanceEndpoint: 'http://balance.invalid/user/balance' },
        })
        .expect(200);

      return wsHttp
        .get(`/_api/ai/providers/${providerId}/balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body)).toContain('unreachable');
        });
    });
  });

  // ─── 价目参考源（CAP-A-21：models.dev 状态/刷新）───

  describe('GET /_api/ai/pricing-source', () => {
    it('should return pricing source status shape (network-agnostic)', () => {
      return wsHttp
        .get('/_api/ai/pricing-source')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          const s = res.body.data;
          expect(typeof s.available).toBe('boolean');
          expect(typeof s.stale).toBe('boolean');
          expect(typeof s.providerCount).toBe('number');
          expect(typeof s.modelCount).toBe('number');
          expect(s.providerCount).toBeGreaterThanOrEqual(0);
          expect(s.modelCount).toBeGreaterThanOrEqual(0);
          expect(s.source).toBe('https://models.dev/api.json');
        });
    });
  });

  describe('POST /_api/ai/pricing-source/refresh', () => {
    it('should refresh catalog from stubbed models.dev and never throw on failure', async () => {
      const fixture = {
        deepseek: {
          models: {
            'deepseek-v4-flash': {
              name: 'DeepSeek V4 Flash',
              cost: { input: 0.15, output: 0.6 },
            },
          },
        },
        zhipuai: {
          models: {
            'glm-4.7': { name: 'GLM-4.7', cost: { input: 0.6, output: 2.2 } },
          },
        },
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => fixture,
        } as unknown as Response),
      );
      try {
        await wsHttp
          .post('/_api/ai/pricing-source/refresh')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res: Response) => {
            const s = res.body.data;
            expect(s.available).toBe(true);
            expect(s.stale).toBe(false);
            expect(s.providerCount).toBe(2);
            expect(s.modelCount).toBe(2);
            expect(s.error).toBeNull();
          });
      } finally {
        vi.unstubAllGlobals();
      }

      // 桩移除后强刷一次（真实网络或离线均确定性返回状态形状，不抛 500）
      return wsHttp
        .post('/_api/ai/pricing-source/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(typeof res.body.data.available).toBe('boolean');
          expect(res.body.data.source).toBe('https://models.dev/api.json');
        });
    });
  });

  describe('DELETE /_api/ai/providers/:id (second provider)', () => {
    it('should delete a fresh provider', async () => {
      const created = await wsHttp
        .post('/_api/ai/providers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          provider: 'deepseek',
          displayName: 'E2E DeepSeek',
          apiKey: 'e2e-not-a-real-key',
        });
      expect(created.status).toBe(201);
      return wsHttp
        .delete(`/_api/ai/providers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.success).toBe(true);
        });
    });
  });
});
