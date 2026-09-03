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

describe('Execution (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let taskId: string;
  let runId: string;
  let approvalId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Execution e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    const fixture = await createTaskFixture(wsHttp, ws, accessToken);
    projectId = fixture.projectId;
    taskId = fixture.taskId;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  describe('POST /_api/execution/runs', () => {
    it('should create an execution run', () => {
      return wsHttp
        .post('/_api/execution/runs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          taskId,
          subjectType: 'task',
          subjectId: taskId,
          identitySource: 'cli',
          goal: 'e2e 执行目标',
          role: 'fullstack_dev',
          input: { prompt: 'e2e' },
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          runId = res.body.data.id;
          expect(runId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/execution/runs', () => {
    it('should list runs of project', () => {
      return wsHttp
        .get(`/_api/execution/runs?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(runId);
        });
    });
  });

  describe('GET /_api/execution/runs/:id', () => {
    it('should get run detail', () => {
      return wsHttp
        .get(`/_api/execution/runs/${runId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(runId);
        });
    });
  });

  describe('PATCH /_api/execution/runs/:id', () => {
    it('should update run', () => {
      return wsHttp
        .patch(`/_api/execution/runs/${runId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'planned', metadata: { note: 'e2e-patch' } })
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('e2e-patch');
        });
    });
  });

  describe('POST /_api/execution/runs/:id/start', () => {
    it('should start the run', () => {
      return wsHttp
        .post(`/_api/execution/runs/${runId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });
  });

  describe('GET /_api/execution/runs/:id/steps', () => {
    it('should list run steps', () => {
      return wsHttp
        .get(`/_api/execution/runs/${runId}/steps`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/execution/projects/:projectId/active', () => {
    it('should list active executions of project', () => {
      return wsHttp
        .get(`/_api/execution/projects/${projectId}/active`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/execution/approvals', () => {
    it('should create an approval request for the run', () => {
      return wsHttp
        .post('/_api/execution/approvals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          executionRunId: runId,
          projectId,
          taskId,
          requestedAction: 'file.write',
          actionType: 'write',
          riskLevel: 'medium',
          reason: 'e2e 审批',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          approvalId = res.body.data.id;
          expect(approvalId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/execution/approvals', () => {
    it('should list approvals of project', () => {
      return wsHttp
        .get(`/_api/execution/approvals?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(approvalId);
        });
    });
  });

  describe('GET /_api/execution/approvals/pending', () => {
    it('should list pending approvals', () => {
      return wsHttp
        .get(`/_api/execution/approvals/pending?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(approvalId);
        });
    });
  });

  describe('GET /_api/execution/approvals/stats', () => {
    it('should return approval stats', () => {
      return wsHttp
        .get(`/_api/execution/approvals/stats?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/execution/approvals/:id', () => {
    it('should get approval detail', () => {
      return wsHttp
        .get(`/_api/execution/approvals/${approvalId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(approvalId);
        });
    });
  });

  describe('POST /_api/execution/approvals/:id/auto-approve', () => {
    it('should auto-approve a second approval', async () => {
      const created = await wsHttp
        .post('/_api/execution/approvals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          executionRunId: runId,
          projectId,
          requestedAction: 'file.read',
          actionType: 'read',
          riskLevel: 'low',
          reason: 'e2e 低风险审批',
        });
      expect(created.status).toBe(201);
      const secondId = created.body.data.id;
      return wsHttp
        .post(`/_api/execution/approvals/${secondId}/auto-approve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: '低风险自动通过' })
        .expect(201)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('approved');
        });
    });
  });

  describe('POST /_api/execution/approvals/:id/cancel', () => {
    it('should cancel a third approval', async () => {
      const created = await wsHttp
        .post('/_api/execution/approvals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          executionRunId: runId,
          projectId,
          requestedAction: 'terminal.exec',
          actionType: 'exec',
          riskLevel: 'high',
          reason: 'e2e 高风险审批',
        });
      expect(created.status).toBe(201);
      const thirdId = created.body.data.id;
      return wsHttp
        .post(`/_api/execution/approvals/${thirdId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });
  });

  describe('POST /_api/execution/approvals/:id/resolve', () => {
    it('should resolve the first approval', () => {
      return wsHttp
        .post(`/_api/execution/approvals/${approvalId}/resolve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ resolution: 'approved', resolutionNote: 'e2e 通过' })
        .expect(201)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('approved');
        });
    });
  });

  describe('POST /_api/execution/runs/:id/complete', () => {
    it('should complete the run with artifacts', () => {
      return wsHttp
        .post(`/_api/execution/runs/${runId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          output: { summary: 'e2e 完成' },
          artifacts: [
            { artifactType: 'file', name: 'e2e-result.md', content: '# ok' },
          ],
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/execution/runs/:id/artifacts', () => {
    it('should list run artifacts', () => {
      return wsHttp
        .get(`/_api/execution/runs/${runId}/artifacts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('e2e-result.md');
        });
    });
  });

  describe('POST /_api/execution/runs/:id/fail (second run lifecycle)', () => {
    it('should fail a fresh run', async () => {
      const created = await wsHttp
        .post('/_api/execution/runs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          taskId,
          subjectType: 'task',
          subjectId: taskId,
          identitySource: 'cli',
          goal: 'e2e 失败路径',
        });
      expect(created.status).toBe(201);
      const failRunId = created.body.data.id;
      await wsHttp
        .post(`/_api/execution/runs/${failRunId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      return wsHttp
        .post(`/_api/execution/runs/${failRunId}/fail`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ errorDetail: { message: 'e2e 模拟失败' } })
        .expect(201);
    });
  });

  describe('POST /_api/execution/runs/:id/cancel (third run lifecycle)', () => {
    it('should cancel a fresh planned run', async () => {
      const created = await wsHttp
        .post('/_api/execution/runs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          taskId,
          subjectType: 'task',
          subjectId: taskId,
          identitySource: 'cli',
          goal: 'e2e 取消路径',
        });
      expect(created.status).toBe(201);
      return wsHttp
        .post(`/_api/execution/runs/${created.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'e2e 取消' })
        .expect(201);
    });
  });
});
