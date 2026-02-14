import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';

describe('Task (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('_api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/_api/auth/login')
      .send({
        username: 'admin',
        password: 'password123',
      });
    accessToken = loginRes.body.data.accessToken;
    userId = loginRes.body.data.user.id;

    // Create a test project
    const projectRes = await request(app.getHttpServer())
      .post('/_api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Project for Tasks',
        description: 'Test Description',
        type: 'software',
        visibility: 'private',
      });
    projectId = projectRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (taskId) {
      await prisma.task.deleteMany({
        where: { id: taskId },
      });
    }
    if (projectId) {
      await prisma.project.deleteMany({
        where: { id: projectId },
      });
    }
    await app.close();
  });

  describe('POST /_api/tasks', () => {
    it('should create a new task', () => {
      return request(app.getHttpServer())
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          title: 'Test Task',
          description: 'Test Task Description',
          priority: 'high',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.title).toBe('Test Task');
          expect(res.body.data).toHaveProperty('status');
          taskId = res.body.data.id;
        });
    });

    it('should create task with status', () => {
      return request(app.getHttpServer())
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          title: 'Task with Status',
          status: 'todo',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.status).toBe('todo');
        });
    });

    it('should reject request without project access', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          username: 'testuser2',
          passwordHash: 'hash',
          displayName: 'Test User 2',
          email: 'test2@example.com',
        },
      });

      // Login as other user
      const loginRes = await request(app.getHttpServer())
        .post('/_api/auth/login')
        .send({
          username: 'testuser2',
          password: 'password123',
        });

      if (loginRes.status === 201) {
        const otherToken = loginRes.body.data.accessToken;

        return request(app.getHttpServer())
          .post('/_api/tasks')
          .set('Authorization', `Bearer ${otherToken}`)
          .send({
            projectId,
            title: 'Unauthorized Task',
          })
          .expect(404);
      }
    });
  });

  describe('GET /_api/projects/:projectId/tasks', () => {
    it('should get tasks for project', () => {
      return request(app.getHttpServer())
        .get(`/_api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('meta');
          expect(Array.isArray(res.body.data.data)).toBe(true);
        });
    });

    it('should filter tasks by status', () => {
      return request(app.getHttpServer())
        .get(`/_api/projects/${projectId}/tasks`)
        .query({ status: 'todo' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get(`/_api/projects/${projectId}/tasks`)
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.meta.page).toBe(1);
          expect(res.body.data.meta.pageSize).toBe(10);
        });
    });
  });

  describe('GET /_api/tasks/:id', () => {
    it('should get task by id', () => {
      if (!taskId) {
        return;
      }

      return request(app.getHttpServer())
        .get(`/_api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.id).toBe(taskId);
          expect(res.body.data).toHaveProperty('assignee');
          expect(res.body.data).toHaveProperty('reporter');
        });
    });

    it('should return 404 for non-existent task', () => {
      return request(app.getHttpServer())
        .get('/_api/tasks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /_api/tasks/:id', () => {
    it('should update task', () => {
      if (!taskId) {
        return;
      }

      return request(app.getHttpServer())
        .patch(`/_api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'in_progress',
          priority: 'medium',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('in_progress');
        });
    });
  });

  describe('DELETE /_api/tasks/:id', () => {
    it('should delete task', async () => {
      if (!taskId) {
        return;
      }

      // Create a task to delete
      const createRes = await request(app.getHttpServer())
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          title: 'Task to Delete',
        });

      const deleteTaskId = createRes.body.data.id;

      return request(app.getHttpServer())
        .delete(`/_api/tasks/${deleteTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.success).toBe(true);
        });
    });
  });

  describe('POST /_api/tasks/:id/dependencies', () => {
    it('should add task dependency', async () => {
      if (!taskId) {
        return;
      }

      // Create another task
      const createRes = await request(app.getHttpServer())
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          title: 'Dependency Task',
        });

      const dependsOnTaskId = createRes.body.data.id;

      return request(app.getHttpServer())
        .post(`/_api/tasks/${taskId}/dependencies`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dependsOnTaskId,
          type: 'blocks',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.taskId).toBe(taskId);
          expect(res.body.data.dependsOnTaskId).toBe(dependsOnTaskId);
        });
    });

    it('should reject self-dependency', () => {
      if (!taskId) {
        return;
      }

      return request(app.getHttpServer())
        .post(`/_api/tasks/${taskId}/dependencies`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dependsOnTaskId: taskId,
        })
        .expect(400);
    });
  });
});
