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

describe('Invites (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let teamId: string;
  let inviteToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Invites e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    // 团队邀请挂在团队上：先建团队，再走既有团队邀请接口拿 token
    const teamRes = await wsHttp
      .post('/_api/teams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Invite Team', slug: 'e2e-invite-team' });
    teamId = teamRes.body.data.id;

    const inviteRes = await wsHttp
      .post(`/_api/teams/${teamId}/invites`)
      .set('Authorization', `Bearer ${accessToken}`)
      // 不限定邮箱：accept 时跳过邮箱匹配校验
      .send({ role: 'member' });
    expect(inviteRes.status).toBe(201);
    inviteToken = inviteRes.body.data.token;
    expect(inviteToken).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('GET /_api/invites/:token', () => {
    it('should preview team invite publicly', () => {
      return wsHttp
        .get(`/_api/invites/${inviteToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          expect(JSON.stringify(res.body.data)).toContain('E2E Invite Team');
        });
    });
  });

  describe('POST /_api/invites/:token/accept', () => {
    it('should accept invite as logged-in admin and join the team', () => {
      return wsHttp
        .post(`/_api/invites/${inviteToken}/accept`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data.teamId).toBe(teamId);
        });
    });

    it('should reject second accept (already accepted)', () => {
      return wsHttp
        .post(`/_api/invites/${inviteToken}/accept`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });
});
