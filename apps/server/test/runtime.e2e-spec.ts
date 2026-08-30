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

describe('Runtime (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let runtimeId: string;
  let runtimeSessionId: string;
  let runtimeSessionToken: string;
  let approvalRequestId: string;
  const executionRunId = 'exec_e2e_001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Runtime e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/runtime/register', () => {
    it('should register a runtime and return session credentials', () => {
      return wsHttp
        .post('/_api/runtime/register')
        .send({
          runtimeId: 'runtime-e2e-001',
          deviceId: 'device-e2e-001',
          hostPlatform: 'windows',
          runtimeVersion: '0.1.0',
          protocolVersion: '1.0.0',
          workspaceRoots: ['E:\\tmp\\e2e'],
          availableProviders: ['file', 'git', 'terminal'],
          cliProviders: ['codex'],
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data.runtimeSessionId).toBeTruthy();
          expect(res.body.data.runtimeSessionToken).toBeTruthy();
          runtimeSessionId = res.body.data.runtimeSessionId;
          runtimeSessionToken = res.body.data.runtimeSessionToken;
        });
    });
  });

  describe('PUT /_api/runtime/:runtimeId/capabilities', () => {
    it('should update capabilities with session auth', () => {
      runtimeId = 'runtime-e2e-001';
      return wsHttp
        .put(`/_api/runtime/${runtimeId}/capabilities`)
        .set('x-runtime-session-id', runtimeSessionId)
        .set('x-runtime-session-token', runtimeSessionToken)
        .send({
          workspaceRoots: ['E:\tmp\e2e'],
          providers: { file: true, git: true, terminal: true },
          cliProviders: ['codex', 'claude-code'],
        })
        .expect(200);
    });
  });

  describe('POST /_api/runtime/:runtimeId/heartbeat', () => {
    it('should record heartbeat', () => {
      return wsHttp
        .post(`/_api/runtime/${runtimeId}/heartbeat`)
        .set('x-runtime-session-id', runtimeSessionId)
        .set('x-runtime-session-token', runtimeSessionToken)
        .send({ runtimeSessionId, status: 'online' })
        .expect(201);
    });
  });

  describe('POST /_api/runtime/control/dispatches (JWT control side)', () => {
    it('should create a pending dispatch', () => {
      return wsHttp
        .post('/_api/runtime/control/dispatches')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          runtimeId,
          executionRunId,
          requestedActions: ['file.read'],
          toolScopes: ['file'],
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data.status).toBe('pending');
          expect(res.body.data.executionRunId).toBe(executionRunId);
        });
    });
  });

  describe('GET /_api/runtime/:runtimeId/dispatches', () => {
    it('should pull pending dispatches', () => {
      return wsHttp
        .get(`/_api/runtime/${runtimeId}/dispatches?status=pending`)
        .set('x-runtime-session-id', runtimeSessionId)
        .set('x-runtime-session-token', runtimeSessionToken)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(executionRunId);
        });
    });
  });

  describe('GET /_api/runtime/executions/:executionRunId/context', () => {
    it('should return execution context', () => {
      return wsHttp
        .get(`/_api/runtime/executions/${executionRunId}/context`)
        .set('x-runtime-session-id', runtimeSessionId)
        .set('x-runtime-session-token', runtimeSessionToken)
        .expect(200);
    });
  });

  describe('POST /_api/runtime/executions/:executionRunId/events', () => {
    it('should submit an execution event', () => {
      return wsHttp
        .post(`/_api/runtime/executions/${executionRunId}/events`)
        .set('x-runtime-session-id', runtimeSessionId)
        .set('x-runtime-session-token', runtimeSessionToken)
        .send({
          eventType: 'execution.step.updated',
          runtimeId,
          stepId: 'step_e2e_1',
          status: 'in_progress',
          summary: 'e2e 步骤进行中',
        })
        .expect(201);
    });
  });

  describe('POST /_api/runtime/executions/:executionRunId/approval-request', () => {
    it('should create an approval request', () => {
      return wsHttp
        .post(`/_api/runtime/executions/${executionRunId}/approval-request`)
        .set('x-runtime-session-id', runtimeSessionId)
        .set('x-runtime-session-token', runtimeSessionToken)
        .send({
          requestedAction: 'file.write',
          riskLevel: 'medium',
          reason: 'e2e 审批请求',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data.approvalRequestId).toBeTruthy();
          approvalRequestId = res.body.data.approvalRequestId;
        });
    });
  });

  describe('POST /_api/runtime/control/approvals/:id/resolve', () => {
    it('should resolve the approval request (approved)', () => {
      return wsHttp
        .post(`/_api/runtime/control/approvals/${approvalRequestId}/resolve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ resolution: 'approved', resolutionNote: 'e2e 通过' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('POST /_api/runtime/executions/:executionRunId/result', () => {
    it('should submit execution result', () => {
      return wsHttp
        .post(`/_api/runtime/executions/${executionRunId}/result`)
        .set('x-runtime-session-id', runtimeSessionId)
        .set('x-runtime-session-token', runtimeSessionToken)
        .send({
          status: 'completed',
          summary: 'e2e 执行完成',
          artifacts: [{ type: 'file', ref: 'e2e://artifact-1' }],
          evidence: [{ type: 'log', ref: 'e2e://evidence-1' }],
        })
        .expect(201);
    });
  });

  describe('POST /_api/runtime/control/executions/:executionRunId/cancel', () => {
    it('should cancel the execution run', () => {
      return wsHttp
        .post(`/_api/runtime/control/executions/${executionRunId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'e2e 取消', cancelledBy: 'admin' })
        .expect(201);
    });
  });

  describe('session guard negative path', () => {
    it('should reject runtime endpoints without session credentials', () => {
      return wsHttp
        .get(`/_api/runtime/${runtimeId}/dispatches`)
        .expect(401);
    });
  });
});
