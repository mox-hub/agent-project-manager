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

describe('Iterations (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let iterationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Iterations e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'E2E Iteration Project',
    );
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/iterations', () => {
    it('should create an iteration', () => {
      return wsHttp
        .post('/_api/iterations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          name: 'Sprint 1',
          goal: 'E2E 迭代目标',
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2026-09-14T23:59:59.000Z',
          capacity: 80,
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          iterationId = res.body.data.id;
          expect(iterationId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/iterations/projects/:projectId', () => {
    it('should list project iterations', () => {
      return wsHttp
        .get(`/_api/iterations/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          expect(JSON.stringify(res.body.data)).toContain(iterationId);
        });
    });
  });
});
