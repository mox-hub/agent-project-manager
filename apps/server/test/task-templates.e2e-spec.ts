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

describe('Task Templates (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let templateId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('TaskTemplates e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'E2E Template Project',
    );
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/task-templates', () => {
    it('should create a template with items', () => {
      return wsHttp
        .post('/_api/task-templates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E Onboarding Template',
          description: 'Created by e2e',
          items: [
            { title: 'Step 1: 准备环境', estimate: 2 },
            { title: 'Step 2: 验收' },
          ],
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          templateId = res.body.data.id;
        });
    });
  });

  describe('GET /_api/task-templates', () => {
    it('should list templates', () => {
      return wsHttp
        .get('/_api/task-templates')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/task-templates/:id', () => {
    it('should get template detail', () => {
      return wsHttp
        .get(`/_api/task-templates/${templateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(templateId);
        });
    });

    it('should 404 on unknown id', () => {
      return wsHttp
        .get('/_api/task-templates/nonexistent-template')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /_api/task-templates/:id', () => {
    it('should update template', () => {
      return wsHttp
        .patch(`/_api/task-templates/${templateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Onboarding Template v2', category: 'onboarding' })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.name).toBe('E2E Onboarding Template v2');
        });
    });
  });

  describe('POST /_api/task-templates/:id/use', () => {
    it('should instantiate tasks from template', () => {
      return wsHttp
        .post(`/_api/task-templates/${templateId}/use`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectId })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data.tasksCreated).toBe(2);
          expect(Array.isArray(res.body.data.tasks)).toBe(true);
        });
    });
  });

  describe('DELETE /_api/task-templates/:id', () => {
    it('should delete template', () => {
      return wsHttp
        .delete(`/_api/task-templates/${templateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
