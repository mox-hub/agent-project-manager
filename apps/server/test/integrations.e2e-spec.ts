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
import { createProjectFixture } from './helpers/fixtures';

describe('Integrations (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let configId: string;
  let externalLinkId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Integrations e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'E2E Integration Project',
    );
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/integrations', () => {
    it('should create integration config', () => {
      return wsHttp
        .post('/_api/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          provider: 'slack',
          scope: 'global',
          name: 'E2E Slack 集成',
          config: { webhookUrl: 'https://hooks.slack.com/e2e' },
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          configId = res.body.data.id;
          expect(configId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/integrations', () => {
    it('should list integration configs', () => {
      return wsHttp
        .get('/_api/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(configId);
        });
    });
  });

  describe('GET /_api/integrations/:id', () => {
    it('should get config detail', () => {
      return wsHttp
        .get(`/_api/integrations/${configId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(configId);
        });
    });
  });

  describe('PUT /_api/integrations/:id', () => {
    it('should update config', () => {
      return wsHttp
        .put(`/_api/integrations/${configId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Slack 集成 v2' })
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('v2');
        });
    });
  });

  describe('GET /_api/integrations/:id/sync-logs', () => {
    it('should list sync logs', () => {
      return wsHttp
        .get(`/_api/integrations/${configId}/sync-logs`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/integrations/external-issues', () => {
    it('should create an external issue link', () => {
      return wsHttp
        .post('/_api/integrations/external-issues')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          provider: 'github',
          externalId: '123',
          url: 'https://github.com/e2e/repo/issues/123',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          externalLinkId = res.body.data.id;
          expect(externalLinkId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/integrations/external-issues', () => {
    it('should list external issue links', () => {
      return wsHttp
        .get(`/_api/integrations/external-issues?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(externalLinkId);
        });
    });
  });

  describe('DELETE /_api/integrations/:id (second config)', () => {
    it('should remove a fresh config', async () => {
      const created = await wsHttp
        .post('/_api/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          provider: 'jira',
          scope: 'global',
          name: 'E2E Jira',
          config: {},
        });
      expect(created.status).toBe(201);
      return wsHttp
        .delete(`/_api/integrations/${created.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
