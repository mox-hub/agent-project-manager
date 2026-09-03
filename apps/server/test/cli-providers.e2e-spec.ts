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

describe('CLI Providers & Skills (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let skillKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('CliSkills e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    // 种一条 skill 保证 PUT :key 有目标
    const seeded = await ws.db.skillConfig.create({
      data: { key: 'e2e-skill', name: 'E2E Skill', category: 'dev' },
    });
    skillKey = seeded.key;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('GET /_api/cli-providers', () => {
    it('should list CLI providers with status', () => {
      return wsHttp
        .get('/_api/cli-providers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('providers');
        });
    });
  });

  describe('POST /_api/cli-providers/detect', () => {
    it('should re-detect local CLI providers', () => {
      return wsHttp
        .post('/_api/cli-providers/detect')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('providers');
        });
    });
  });

  describe('GET /_api/cli-providers/:id/health', () => {
    it('should health-check a known provider id', () => {
      return wsHttp
        .get('/_api/cli-providers/claude-code/health')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });

    it('should 400 on unknown provider id', () => {
      return wsHttp
        .get('/_api/cli-providers/nonexistent/health')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('PUT /_api/cli-providers/:id', () => {
    it('should configure provider display name', () => {
      return wsHttp
        .put('/_api/cli-providers/claude-code')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ providerId: 'claude-code', displayName: 'E2E Claude' })
        .expect((res: Response) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('DELETE /_api/cli-providers/:id', () => {
    it('should reset provider config', () => {
      return wsHttp
        .delete('/_api/cli-providers/claude-code')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/skills', () => {
    it('should list registered skills', () => {
      return wsHttp
        .get('/_api/skills')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('skills');
          expect(JSON.stringify(res.body.data)).toContain(skillKey);
        });
    });
  });

  describe('PUT /_api/skills/:key', () => {
    it('should toggle/rename a skill', () => {
      return wsHttp
        .put(`/_api/skills/${skillKey}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Skill v2' })
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('E2E Skill v2');
        });
    });

    it('should 404 on unknown skill key', () => {
      return wsHttp
        .put('/_api/skills/nonexistent-skill')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'x' })
        .expect(404);
    });
  });
});
