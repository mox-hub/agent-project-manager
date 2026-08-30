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

describe('Acceptance (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let taskId: string;
  let acceptanceId: string;
  let criteriaId: string;
  let systemChecklistId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Acceptance e2e');
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

  describe('GET /_api/acceptance/checklists/system', () => {
    it('should list system checklists', () => {
      return wsHttp
        .get('/_api/acceptance/checklists/system')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          const list = Array.isArray(res.body.data)
            ? res.body.data
            : res.body.data?.items ?? [];
          if (list.length > 0) {
            systemChecklistId = list[0].id;
          }
        });
    });
  });

  describe('GET /_api/acceptance/checklists/all', () => {
    it('should list all checklists', () => {
      return wsHttp
        .get('/_api/acceptance/checklists/all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/acceptance', () => {
    it('should create an acceptance for the task', () => {
      return wsHttp
        .post('/_api/acceptance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId, type: 'mixed', priority: 'high', title: 'E2E 验收' })
        .expect((res: Response) => {
          if (res.status !== 201) {
            console.error('ACC-ERR', JSON.stringify(res.body));
          }
          expect(res.status).toBe(201);
        })
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          acceptanceId = res.body.data.id;
          expect(acceptanceId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/acceptance', () => {
    it('should list acceptances filtered by project', () => {
      return wsHttp
        .get(`/_api/acceptance?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(acceptanceId);
        });
    });
  });

  describe('GET /_api/acceptance/:id', () => {
    it('should get acceptance detail', () => {
      return wsHttp
        .get(`/_api/acceptance/${acceptanceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(acceptanceId);
        });
    });
  });

  describe('PATCH /_api/acceptance/:id', () => {
    it('should update acceptance', () => {
      return wsHttp
        .patch(`/_api/acceptance/${acceptanceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'E2E 验收 v2' })
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('v2');
        });
    });
  });

  describe('POST /_api/acceptance/:id/criteria', () => {
    it('should add a criteria', () => {
      return wsHttp
        .post(`/_api/acceptance/${acceptanceId}/criteria`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ criteriaType: 'functional', content: 'e2e 功能标准 1' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          criteriaId = res.body.data.id;
          expect(criteriaId).toBeTruthy();
        });
    });

    it('should add a second criteria via batch', () => {
      return wsHttp
        .post(`/_api/acceptance/${acceptanceId}/criteria/batch`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send([
          { criteriaType: 'technical', content: 'e2e 技术标准 2' },
        ])
        .expect(201);
    });
  });

  describe('GET /_api/acceptance/:id/criteria', () => {
    it('should list acceptance criteria', () => {
      return wsHttp
        .get(`/_api/acceptance/${acceptanceId}/criteria`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(criteriaId);
        });
    });
  });

  describe('POST /_api/acceptance/criteria/:criteriaId/evidence', () => {
    it('should attach evidence to criteria', () => {
      return wsHttp
        .post(`/_api/acceptance/criteria/${criteriaId}/evidence`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ userId: 'admin-e2e' })
        .send({
          evidenceType: 'test_report',
          content: 'e2e 证据内容',
        })
        .expect(201);
    });
  });

  describe('PATCH /_api/acceptance/criteria/:criteriaId', () => {
    it('should update criteria status', () => {
      return wsHttp
        .patch(`/_api/acceptance/criteria/${criteriaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ userId: 'admin-e2e' })
        .send({ status: 'passed' })
        .expect(200);
    });
  });

  describe('POST /_api/acceptance/:id/audit', () => {
    it('should run completeness audit', () => {
      return wsHttp
        .post(`/_api/acceptance/${acceptanceId}/audit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/acceptance/:id/audit-report', () => {
    it('should return audit report', () => {
      return wsHttp
        .get(`/_api/acceptance/${acceptanceId}/audit-report`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/acceptance/:id/apply-suggestions', () => {
    it('should apply audit suggestions (empty list ok)', () => {
      return wsHttp
        .post(`/_api/acceptance/${acceptanceId}/apply-suggestions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemIds: [] })
        .expect((res: Response) => {
          // 无有效建议项时服务端返回 400（No valid items selected），属合法行为
          expect([200, 201, 400]).toContain(res.status);
        });
    });
  });

  describe('GET /_api/acceptance/task/:taskId', () => {
    it('should return acceptances of task', () => {
      return wsHttp
        .get(`/_api/acceptance/task/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(acceptanceId);
        });
    });
  });

  describe('GET /_api/acceptance/task/:taskId/audit-gate', () => {
    it('should return audit gate status for task', () => {
      return wsHttp
        .get(`/_api/acceptance/task/${taskId}/audit-gate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/acceptance/:id/validate-completion', () => {
    it('should validate completion and return checks', () => {
      return wsHttp
        .post(`/_api/acceptance/${acceptanceId}/validate-completion`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ evidence: { summary: 'e2e 完成证据' } })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('checks');
        });
    });
  });

  describe('POST /_api/acceptance/:id/reject-completion', () => {
    it('should reject completion with reason (then revert to draft via update)', async () => {
      const rejected = await wsHttp
        .post(`/_api/acceptance/${acceptanceId}/reject-completion`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'e2e 驳回一次' });
      expect([200, 201]).toContain(rejected.status);

      // 驳回后推进到待接收态（UpdateAcceptanceDto 允许 draft/pending/in_review）
      const restored = await wsHttp
        .patch(`/_api/acceptance/${acceptanceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'in_review' });
      expect([200, 201]).toContain(restored.status);
    });

    it('should 400 when reason missing', () => {
      return wsHttp
        .post(`/_api/acceptance/${acceptanceId}/reject-completion`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /_api/acceptance/:id/accept-completion', () => {
    it('should accept completion', () => {
      return wsHttp
        .post(`/_api/acceptance/${acceptanceId}/accept-completion`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ userId: 'admin-e2e' })
        // artifact 契约：evidence 需含 artifactId 或 artifacts 数组
        .send({
          evidence: {
            summary: 'e2e 最终验收',
            artifacts: [{ name: 'e2e-artifact.md', path: 'docs/e2e.md' }],
          },
        })
        .expect((res: Response) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('POST /_api/acceptance/:id/waive (second acceptance)', () => {
    it('should waive a fresh acceptance', async () => {
      const created = await wsHttp
        .post('/_api/acceptance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId, type: 'functional', title: 'E2E 豁免验收' });
      expect(created.status).toBe(201);
      const waiveId = created.body.data.id;

      return wsHttp
        .post(`/_api/acceptance/${waiveId}/waive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'e2e 豁免' })
        .expect(201)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('waived');
        });
    });
  });

  describe('DELETE /_api/acceptance/criteria/:criteriaId', () => {
    it('should delete the criteria', () => {
      return wsHttp
        .delete(`/_api/acceptance/criteria/${criteriaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('DELETE /_api/acceptance/:id (third acceptance)', () => {
    it('should delete a fresh acceptance', async () => {
      const created = await wsHttp
        .post('/_api/acceptance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId, type: 'technical', title: 'E2E 待删除验收' });
      expect(created.status).toBe(201);
      return wsHttp
        .delete(`/_api/acceptance/${created.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
