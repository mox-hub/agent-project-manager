import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Response } from 'supertest';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';

describe('Project (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let projectId: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await initTestApp(moduleFixture);

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    ws = createIsolatedWorkspace('Project e2e');
    wsHttp = wsRequest(app, ws.id);

    // Login to get token
    const response = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = response.body.data.accessToken;
    userId = response.body.data.user.id;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/projects', () => {
    it('should create a new project', () => {
      return wsHttp
        .post('/_api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Project',
          description: 'Test Description',
          type: 'team',
          visibility: 'private',
          priority: 'high',
          workflowStatus: 'in_progress',
          progress: 25,
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.name).toBe('Test Project');
          expect(res.body.data.priority).toBe('high');
          expect(res.body.data.workflowStatus).toBe('in_progress');
          projectId = res.body.data.id;
        });
    });

    it('should create project with template', async () => {
      // First get a template
      const templatesRes = await wsHttp
        .get('/_api/metadata/templates/projects')
        .set('Authorization', `Bearer ${accessToken}`);

      if (templatesRes.body.data.length > 0) {
        const templateId = templatesRes.body.data[0].id;

        return wsHttp
          .post('/_api/projects')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Template Project',
            description: 'From Template',
            type: 'team',
            visibility: 'private',
            templateId,
          })
          .expect(201)
          .expect((res: Response) => {
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.name).toBe('Template Project');
          });
      }
    });

    it('should reject request without authentication', () => {
      return wsHttp
        .post('/_api/projects')
        .send({
          name: 'Test Project',
          type: 'team',
          visibility: 'private',
        })
        .expect(401);
    });
  });

  describe('GET /_api/projects', () => {
    it('should get projects list', () => {
      return wsHttp
        .get('/_api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data.items)).toBe(true);
          expect(res.body.data).toHaveProperty('total');
        });
    });

    it('should support pagination', () => {
      return wsHttp
        .get('/_api/projects')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.page).toBe(1);
          expect(res.body.data.pageSize).toBe(10);
        });
    });

    it('should filter by search query', () => {
      return wsHttp
        .get('/_api/projects')
        .query({ q: 'Test' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should filter by priority/workflowStatus', () => {
      return wsHttp
        .get('/_api/projects')
        .query({
          filters: JSON.stringify({
            priority: ['high'],
            workflowStatus: ['in_progress'],
          }),
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data.items)).toBe(true);
        });
    });
  });

  describe('GET /_api/projects/:id', () => {
    it('should get project by id', () => {
      if (!projectId) {
        throw new Error('projectId is not initialized');
      }

      return wsHttp
        .get(`/_api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(projectId);
          expect(res.body.data).toHaveProperty('members');
        });
    });

    it('should return 404 for non-existent project', () => {
      return wsHttp
        .get('/_api/projects/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /_api/projects/:id', () => {
    it('should update project', () => {
      if (!projectId) {
        throw new Error('projectId is not initialized');
      }

      return wsHttp
        .patch(`/_api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Updated Description',
          progress: 60,
          riskLevel: 'high',
        })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.description).toBe('Updated Description');
          expect(res.body.data.progress).toBe(60);
          expect(res.body.data.riskLevel).toBe('high');
        });
    });
  });
});
