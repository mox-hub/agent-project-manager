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
import { createMemberFixture, createProjectFixture } from './helpers/fixtures';

describe('Members (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let memberId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Members e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'E2E Member Project',
    );
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/members', () => {
    it('should create a human member', async () => {
      const admin = await ws.db.user.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      expect(admin).toBeTruthy();
      return wsHttp
        .post('/_api/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'human',
          displayName: 'E2E Member A',
          handle: 'e2e-member-a',
          userId: admin!.id,
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.displayName).toBe('E2E Member A');
          memberId = res.body.data.id;
        });
    });

    it('should create a second member for lifecycle tests', async () => {
      const member = await createMemberFixture(
        wsHttp,
        ws,
        accessToken,
        'E2E Member B',
        'ai_agent',
      );
      expect(member.id).toBeTruthy();
    });
  });

  describe('GET /_api/members', () => {
    it('should list members with { data, total } shape', () => {
      return wsHttp
        .get('/_api/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('total');
          expect(res.body.data.total).toBeGreaterThanOrEqual(2);
        });
    });

    it('should filter by type=human', () => {
      return wsHttp
        .get('/_api/members?type=human')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          for (const m of res.body.data.data) {
            expect(m.type).toBe('human');
          }
        });
    });
  });

  describe('GET /_api/members/search', () => {
    it('should search members by keyword', () => {
      return wsHttp
        .get('/_api/members/search?q=Member%20A')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('POST /_api/members/:id/projects', () => {
    it('should bind member to project', () => {
      return wsHttp
        .post(`/_api/members/${memberId}/projects`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectId, role: 'member' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/members/project/:projectId', () => {
    it('should list project members', () => {
      return wsHttp
        .get(`/_api/members/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data.total).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('GET /_api/members/:id', () => {
    it('should get member detail', () => {
      return wsHttp
        .get(`/_api/members/${memberId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(memberId);
        });
    });

    it('should 404 on unknown id', () => {
      return wsHttp
        .get('/_api/members/nonexistent-member')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /_api/members/:id/card', () => {
    it('should return member card', () => {
      return wsHttp
        .get(`/_api/members/${memberId}/card?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('PATCH /_api/members/:id', () => {
    it('should update member', () => {
      return wsHttp
        .patch(`/_api/members/${memberId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Engineer', tags: ['e2e'] })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.title).toBe('Engineer');
        });
    });
  });

  describe('GET /_api/members/:id/tool-grants', () => {
    it('should list grants and catalog', () => {
      return wsHttp
        .get(`/_api/members/${memberId}/tool-grants`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('grants');
          expect(res.body.data).toHaveProperty('catalog');
        });
    });
  });

  describe('PUT /_api/members/:id/tool-grants', () => {
    it('should set tool grants (full overwrite)', () => {
      return wsHttp
        .put(`/_api/members/${memberId}/tool-grants`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ scope: 'cli_tool', refKey: 'claude-code', granted: true }],
        })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/members/:id/projects', () => {
    it('should list bound projects', () => {
      return wsHttp
        .get(`/_api/members/${memberId}/projects`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
          expect(res.body.data[0].project).toBeTruthy();
        });
    });
  });

  describe('POST /_api/members/:id/deactivate', () => {
    it('should deactivate member (soft)', async () => {
      const member = await createMemberFixture(
        wsHttp,
        ws,
        accessToken,
        'E2E Member C',
        'ai_agent',
      );
      return wsHttp
        .post(`/_api/members/${member.id}/deactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res: Response) => {
          expect([200, 201]).toContain(res.status);
          expect(res.body.data.status).toBe('inactive');
        });
    });
  });

  describe('DELETE /_api/members/:id/projects/:projectId', () => {
    it('should unbind member from project', () => {
      return wsHttp
        .delete(`/_api/members/${memberId}/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('DELETE /_api/members/:id', () => {
    it('should hard delete an unbound member', async () => {
      const member = await createMemberFixture(
        wsHttp,
        ws,
        accessToken,
        'E2E Member D',
        'ai_agent',
      );
      return wsHttp
        .delete(`/_api/members/${member.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toMatchObject({ ok: true });
        });
    });
  });
});
