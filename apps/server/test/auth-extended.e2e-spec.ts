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

describe('Auth Extended (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let sessionId: string;
  let projectId: string;
  let bindingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('AuthExt e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'E2E Auth Project',
    );
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('GET /_api/auth/public-config', () => {
    it('should return public deployment config', () => {
      return wsHttp
        .get('/_api/auth/public-config')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('POST /_api/auth/register', () => {
    it('should register a new account (open or with admin invite)', async () => {
      const cfg = await wsHttp.get('/_api/auth/public-config');
      const mode = cfg.body.data?.registrationMode ?? 'open';

      let inviteToken: string | undefined;
      if (mode !== 'open') {
        const inviteRes = await wsHttp
          .post('/_api/admin/invites')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ email: 'e2e-register@example.com' });
        expect(inviteRes.status).toBe(201);
        inviteToken = inviteRes.body.data.token;
      }

      return wsHttp
        .post('/_api/auth/register')
        .send({
          email: 'e2e-register@example.com',
          password: 'e2e-password-123',
          displayName: 'E2E Registered',
          ...(inviteToken ? { inviteToken } : {}),
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/auth/sessions', () => {
    it('should list current user sessions', () => {
      return wsHttp
        .get('/_api/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
          sessionId = res.body.data[0].id;
        });
    });
  });

  describe('GET /_api/auth/subject-claim', () => {
    it('should return subject claim of current user', () => {
      return wsHttp
        .get('/_api/auth/subject-claim')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('POST /_api/auth/projects/:projectId/agent-bindings', () => {
    it('should upsert an agent identity binding (admin is owner)', () => {
      return wsHttp
        .post(`/_api/auth/projects/${projectId}/agent-bindings`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subjectType: 'external_agent',
          subjectId: 'agent_cli_codex_e2e',
          providerId: 'codex',
          identitySource: 'cli',
          mappedRole: 'fullstack_dev',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          bindingId = res.body.data.id;
          expect(bindingId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/auth/projects/:projectId/agent-bindings', () => {
    it('should list project agent bindings', () => {
      return wsHttp
        .get(`/_api/auth/projects/${projectId}/agent-bindings`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(bindingId);
        });
    });
  });

  describe('DELETE /_api/auth/projects/:projectId/agent-bindings/:bindingId', () => {
    it('should delete the binding', () => {
      return wsHttp
        .delete(`/_api/auth/projects/${projectId}/agent-bindings/${bindingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('DELETE /_api/auth/sessions/:sessionId', () => {
    it('should revoke the current session', () => {
      return wsHttp
        .delete(`/_api/auth/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
