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

describe('Admin & Mail (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let createdUserId: string;
  let inviteId: string;
  let inviteToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Admin e2e');
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

  describe('POST /_api/admin/users', () => {
    it('should create a user with one-time password', () => {
      return wsHttp
        .post('/_api/admin/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'E2E Admin User', email: 'e2e-admin@example.com' })
        .expect(201)
        .expect((res: Response) => {
          // 返回形状：{ user, memberId, generatedPassword }
          expect(res.body.data.user).toBeTruthy();
          createdUserId = res.body.data.user.id;
          expect(createdUserId).toBeTruthy();
          expect(res.body.data.generatedPassword).toBeTruthy();
        });
    });
  });

  describe('GET /_api/admin/users', () => {
    it('should list accounts', () => {
      return wsHttp
        .get('/_api/admin/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(createdUserId);
        });
    });
  });

  describe('PATCH /_api/admin/users/:id', () => {
    it('should rename the account', () => {
      return wsHttp
        .patch(`/_api/admin/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'E2E Admin User v2' })
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('E2E Admin User v2');
        });
    });
  });

  describe('POST /_api/admin/invites', () => {
    it('should create a registration invite with token', () => {
      return wsHttp
        .post('/_api/admin/invites')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ expiresInDays: 7 })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          inviteId = res.body.data.id;
          inviteToken = res.body.data.token;
          expect(inviteToken).toBeTruthy();
        });
    });
  });

  describe('GET /_api/admin/invites', () => {
    it('should list invites', () => {
      return wsHttp
        .get('/_api/admin/invites')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(inviteId);
        });
    });
  });

  describe('GET /_api/register-invites/:token', () => {
    it('should preview invite publicly (pending)', () => {
      return wsHttp.get(`/_api/register-invites/${inviteToken}`).expect(200);
    });

    it('should preview as revoked after revoke', async () => {
      await wsHttp
        .post(`/_api/admin/invites/${inviteId}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      return wsHttp
        .get(`/_api/register-invites/${inviteToken}`)
        .expect((res: Response) => {
          expect(res.status).toBe(200);
          expect(JSON.stringify(res.body.data)).toContain('revoked');
        });
    });
  });

  describe('GET /_api/admin/mail', () => {
    it('should list mail outbox', () => {
      return wsHttp
        .get('/_api/admin/mail')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/admin/mail/status', () => {
    it('should report smtp status', () => {
      return wsHttp
        .get('/_api/admin/mail/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });
});
