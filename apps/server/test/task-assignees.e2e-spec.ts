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
import { createMemberFixture, createTaskFixture } from './helpers/fixtures';

describe('Task Assignees (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let taskId: string;
  let projectId: string;
  let memberId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('TaskAssignees e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    const fixture = await createTaskFixture(wsHttp, ws, accessToken);
    projectId = fixture.projectId;
    taskId = fixture.taskId;
    const member = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      'E2E Assignee',
      'ai_agent',
    );
    memberId = member.id;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/task-assignees', () => {
    it('should add an assignee to task', () => {
      return wsHttp
        .post('/_api/task-assignees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId, memberId, role: 'assignee' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/task-assignees/task/:taskId', () => {
    it('should list task assignees', () => {
      return wsHttp
        .get(`/_api/task-assignees/task/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('POST /_api/task-assignees/bulk', () => {
    it('should bulk set assignees', () => {
      return wsHttp
        .post('/_api/task-assignees/bulk')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId,
          assignees: [{ memberId, role: 'co_assignee' }],
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/task-assignees/member/:memberId', () => {
    it('should list tasks of member', () => {
      return wsHttp
        .get(`/_api/task-assignees/member/${memberId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/task-assignees/member/:memberId/load', () => {
    it('should return member load stats', () => {
      return wsHttp
        .get(
          `/_api/task-assignees/member/${memberId}/load?projectId=${projectId}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/task-assignees/task/:taskId/watchers', () => {
    it('should list watchers (empty initially)', () => {
      return wsHttp
        .get(`/_api/task-assignees/task/${taskId}/watchers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/task-assignees/watchers', () => {
    it('should add a watcher', () => {
      return wsHttp
        .post('/_api/task-assignees/watchers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId, memberId })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('DELETE /_api/task-assignees/task/:taskId/watchers/:memberId', () => {
    it('should remove the watcher', () => {
      return wsHttp
        .delete(`/_api/task-assignees/task/${taskId}/watchers/${memberId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('DELETE /_api/task-assignees/task/:taskId/member/:memberId/role/:role', () => {
    it('should remove the assignee', () => {
      return wsHttp
        .delete(
          `/_api/task-assignees/task/${taskId}/member/${memberId}/role/assignee`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
