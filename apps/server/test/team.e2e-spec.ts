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

describe('Team (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let teamId: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Team e2e');
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

  describe('POST /_api/teams', () => {
    it('should create a new team', () => {
      return wsHttp
        .post('/_api/teams')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E 团队',
          slug: 'e2e-team',
          description: 'Team created by e2e',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.name).toBe('E2E 团队');
          teamId = res.body.data.id;
        });
    });

    it('should reject duplicate slug', () => {
      return wsHttp
        .post('/_api/teams')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Another Team',
          slug: 'e2e-team',
        })
        .expect((res: Response) => {
          expect([400, 409]).toContain(res.status);
        });
    });
  });

  describe('GET /_api/teams', () => {
    it('should list teams', () => {
      return wsHttp
        .get('/_api/teams')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          // 该端点返回 { teams: [...], total } 形状
          expect(res.body.data).toHaveProperty('teams');
          expect(res.body.data).toHaveProperty('total');
          expect(Array.isArray(res.body.data.teams)).toBe(true);
        });
    });
  });

  describe('GET /_api/teams/:id', () => {
    it('should get team by id', () => {
      return wsHttp
        .get(`/_api/teams/${teamId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(teamId);
        });
    });
  });

  describe('PATCH /_api/teams/:id', () => {
    it('should update team', () => {
      return wsHttp
        .patch(`/_api/teams/${teamId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Updated by e2e' })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.description).toBe('Updated by e2e');
        });
    });
  });

  describe('GET /_api/teams/:id/members', () => {
    it('should list team members', () => {
      return wsHttp
        .get(`/_api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/teams/:id/archive', () => {
    it('should archive team', () => {
      return wsHttp
        .post(`/_api/teams/${teamId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res: Response) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });
});
