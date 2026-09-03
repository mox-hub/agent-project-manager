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
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';

describe('Task (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let projectId: string;
  let taskId: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await initTestApp(moduleFixture);

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    ws = createIsolatedWorkspace('Task e2e');
    wsHttp = wsRequest(app, ws.id);

    // Login to get token
    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    userId = loginRes.body.data.user.id;

    // Create a test project
    const projectRes = await wsHttp
      .post('/_api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Project for Tasks',
        description: 'Test Description',
        type: 'team',
        visibility: 'private',
      });
    projectId = projectRes.body.data.id;

    // 任务创建依赖项目的模块代码与任务状态定义，直接种进工作区库
    await ws.db.projectModule.create({
      data: { projectId, code: 'TP', name: '平台功能' },
    });
    await ws.db.statusDefinition.createMany({
      data: [
        { projectId, type: 'task', key: 'todo', name: '待办', order: 1 },
        {
          projectId,
          type: 'task',
          key: 'in_progress',
          name: '进行中',
          order: 2,
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
    // 工作区库文件整目录删除，替代逐表 deleteMany 清理
    await ws.cleanup();
  });

  describe('POST /_api/tasks', () => {
    it('should create a new task', () => {
      return wsHttp
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          moduleCode: 'TP',
          title: 'Test Task',
          description: 'Test Task Description',
          priority: 'high',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.title).toBe('Test Task');
          expect(res.body.data).toHaveProperty('status');
          taskId = res.body.data.id;
        });
    });

    it('should create task with status', () => {
      return wsHttp
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          moduleCode: 'TP',
          title: 'Task with Status',
          status: 'todo',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data.status).toBe('todo');
        });
    });

    it('should reject request without project access', async () => {
      // Create another user（直连隔离工作区库）
      await ws.db.user.create({
        data: {
          username: 'testuser2',
          passwordHash: await bcrypt.hash('password123', 4),
          displayName: 'Test User 2',
          email: 'test2@example.com',
          authProvider: 'local',
        },
      });

      // Login as other user
      const loginRes = await wsHttp.post('/_api/auth/login').send({
        username: 'testuser2',
        password: 'password123',
      });

      expect(loginRes.status).toBe(201);
      const otherToken = loginRes.body.data.accessToken;

      return wsHttp
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          projectId,
          moduleCode: 'TP',
          title: 'Unauthorized Task',
        })
        .expect(404);
    });
  });

  describe('GET /_api/projects/:projectId/tasks', () => {
    it('should get tasks for project', () => {
      return wsHttp
        .get(`/_api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          // 该端点返回 { data: [...], meta: {...} } 形状
          expect(Array.isArray(res.body.data.data)).toBe(true);
          expect(res.body.data).toHaveProperty('meta');
        });
    });

    it('should filter tasks by status', () => {
      return wsHttp
        .get(`/_api/projects/${projectId}/tasks`)
        .query({ filters: JSON.stringify({ status: ['todo'] }) })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should support pagination', () => {
      return wsHttp
        .get(`/_api/projects/${projectId}/tasks`)
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.meta.page).toBe(1);
          expect(res.body.data.meta.pageSize).toBe(10);
        });
    });
  });

  describe('GET /_api/tasks/:id', () => {
    it('should get task by id', () => {
      if (!taskId) {
        throw new Error('taskId is not initialized');
      }

      return wsHttp
        .get(`/_api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(taskId);
          expect(res.body.data).toHaveProperty('assignee');
          expect(res.body.data).toHaveProperty('reporter');
        });
    });

    it('should return 404 for non-existent task', () => {
      return wsHttp
        .get('/_api/tasks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /_api/tasks/:id', () => {
    it('should update task', () => {
      if (!taskId) {
        throw new Error('taskId is not initialized');
      }

      return wsHttp
        .patch(`/_api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'in_progress',
          priority: 'medium',
        })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.status).toBe('in_progress');
        });
    });
  });

  describe('DELETE /_api/tasks/:id', () => {
    it('should delete task', async () => {
      if (!taskId) {
        throw new Error('taskId is not initialized');
      }

      // Create a task to delete
      const createRes = await wsHttp
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          moduleCode: 'TP',
          title: 'Task to Delete',
        });

      const deleteTaskId = createRes.body.data.id;

      // 行为式断言：删除成功后再查询应 404
      await wsHttp
        .delete(`/_api/tasks/${deleteTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      return wsHttp
        .get(`/_api/tasks/${deleteTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('POST /_api/tasks/:id/dependencies', () => {
    it('should add task dependency', async () => {
      if (!taskId) {
        throw new Error('taskId is not initialized');
      }

      // Create another task
      const createRes = await wsHttp
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          moduleCode: 'TP',
          title: 'Dependency Task',
        });

      const dependsOnTaskId = createRes.body.data.id;

      return wsHttp
        .post(`/_api/tasks/${taskId}/dependencies`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dependsOnTaskId,
          type: 'blocks',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.taskId).toBe(taskId);
          expect(res.body.data.dependsOnTaskId).toBe(dependsOnTaskId);
        });
    });

    it('should reject self-dependency', () => {
      if (!taskId) {
        throw new Error('taskId is not initialized');
      }

      return wsHttp
        .post(`/_api/tasks/${taskId}/dependencies`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dependsOnTaskId: taskId,
        })
        .expect(400);
    });
  });
});
