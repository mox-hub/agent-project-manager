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
import { createTaskFixture } from './helpers/fixtures';

describe('Activity (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let projectId: string;
  let taskId: string;
  let commentId: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Activity e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    ({ projectId, taskId } = await createTaskFixture(wsHttp, ws, accessToken));
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/activities/comments', () => {
    it('should create a comment on a task', () => {
      return wsHttp
        .post('/_api/activities/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          entityType: 'task',
          entityId: taskId,
          content: 'E2E 评论内容',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.content).toBe('E2E 评论内容');
          commentId = res.body.data.id;
        });
    });

    it('should reject invalid entity type', () => {
      return wsHttp
        .post('/_api/activities/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          entityType: 'team',
          entityId: taskId,
          content: 'bad',
        })
        .expect(400);
    });
  });

  describe('GET /_api/activities', () => {
    it('should list activities of the task', () => {
      return wsHttp
        .get('/_api/activities')
        .query({ entityType: 'task', entityId: taskId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('PATCH /_api/activities/comments/:id', () => {
    it('should update comment content', () => {
      return wsHttp
        .patch(`/_api/activities/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: '更新后的评论' })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.content).toBe('更新后的评论');
        });
    });
  });

  describe('POST /_api/activities/:id/reactions', () => {
    it('should toggle an emoji reaction', () => {
      return wsHttp
        .post(`/_api/activities/${commentId}/reactions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ emoji: '👍' })
        .expect((res: Response) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('DELETE /_api/activities/comments/:id', () => {
    it('should delete the comment', () => {
      return wsHttp
        .delete(`/_api/activities/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res: Response) => {
          expect([200, 204]).toContain(res.status);
        });
    });
  });

  describe('project activities', () => {
    it('should list activities of the project', () => {
      return wsHttp
        .get('/_api/activities')
        .query({ entityType: 'project', entityId: projectId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
