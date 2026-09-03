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

describe('AI Hub (e2e, local-only paths)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let providerId: string;
  let agentId: string;

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

  describe('GET /_api/ai/workflows', () => {
    it('should list workflows', () => {
      return wsHttp
        .get('/_api/ai/workflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/ai/workflow-runs', () => {
    it('should list workflow runs', () => {
      return wsHttp
        .get('/_api/ai/workflow-runs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

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

  describe('POST /_api/ai/agents', () => {
    it('should create an agent identity', () => {
      return wsHttp
        .post('/_api/ai/agents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E 研发代理',
          type: 'ai_employee',
          description: 'e2e agent',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          agentId = res.body.data.id ?? res.body.data.agent?.id;
          expect(agentId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/ai/agents', () => {
    it('should list available agents', () => {
      return wsHttp
        .get('/_api/ai/agents')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(agentId);
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
