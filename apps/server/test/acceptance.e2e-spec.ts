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
  let adminUserId: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let issueId: string;
  let acceptanceId: string;
  let criteriaId: string;
  let secondCriteriaId: string;
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
    adminUserId = loginRes.body.data.user.id;

    const fixture = await createTaskFixture(wsHttp, ws, accessToken);
    projectId = fixture.projectId;
    issueId = fixture.issueId;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('GET /_api/acceptance/checklists/system', () => {
    it('should list system checklists', () => {
      return wsHttp
        .get('/_api/acceptance/checklists/system')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          const list = Array.isArray(res.body.data)
            ? res.body.data
            : (res.body.data?.items ?? []);
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
        .send({ issueId, type: 'mixed', priority: 'high', title: 'E2E 验收' })
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

    it('should exclude acceptances of other projects (CAP-A-15)', async () => {
      // 第二项目的任务 + 契约：过滤本项目时不应出现
      const other = await createTaskFixture(wsHttp, ws, accessToken);
      const otherRes = await wsHttp
        .post('/_api/acceptance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          issueId: other.issueId,
          type: 'mixed',
          priority: 'medium',
          title: 'E2E 他项目验收',
        });
      expect(otherRes.status).toBe(201);
      const otherAcceptanceId: string = otherRes.body.data.id;

      const res = await wsHttp
        .get(`/_api/acceptance?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const items: Array<{ id: string }> = res.body.data.data ?? [];
      expect(items.length).toBeGreaterThan(0);
      expect(items.some((a) => a.id === acceptanceId)).toBe(true);
      expect(items.some((a) => a.id === otherAcceptanceId)).toBe(false);
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
        .send([{ criteriaType: 'technical', content: 'e2e 技术标准 2' }])
        .expect(201)
        .expect((res: Response) => {
          secondCriteriaId = res.body.data[0].id;
          expect(secondCriteriaId).toBeTruthy();
        });
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

    it('should persist report with riskLevel verdict (GAP-T-03)', () => {
      return wsHttp
        .post(`/_api/acceptance/${acceptanceId}/audit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(201)
        .expect((res: Response) => {
          const { report, result } = res.body.data;
          expect(['red', 'yellow', 'green']).toContain(result.riskLevel);
          expect(typeof result.summary).toBe('string');
          expect(result.summary.length).toBeGreaterThan(0);
          expect(result.blockedItems).toEqual(expect.any(Array));
          expect(result.suggestedItems).toEqual(expect.any(Array));
          expect(result.passedItems).toEqual(expect.any(Array));
          expect(report.acceptanceId).toBe(acceptanceId);
          expect(report.riskLevel).toBe(result.riskLevel);
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

  describe('GET /_api/acceptance/checklists/:id (GAP-T-03)', () => {
    it('should 404 on missing checklist', () => {
      return wsHttp
        .get('/_api/acceptance/checklists/cl-e2e-missing')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should 404 on applying missing checklist to acceptance', () => {
      return wsHttp
        .post('/_api/acceptance/checklists/cl-e2e-missing/apply')
        .query({ acceptanceId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /_api/acceptance/issue/:issueId', () => {
    it('should return acceptances of task', () => {
      return wsHttp
        .get(`/_api/acceptance/issue/${issueId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(acceptanceId);
        });
    });
  });

  describe('GET /_api/acceptance/issue/:issueId/audit-gate', () => {
    it('should return audit gate status for task', () => {
      return wsHttp
        .get(`/_api/acceptance/issue/${issueId}/audit-gate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(typeof res.body.data.allowed).toBe('boolean');
        });
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
    it('should 400 when a criterion has no valid evidence (CAP-B-01 gate)', () => {
      return (
        wsHttp
          .post(`/_api/acceptance/${acceptanceId}/accept-completion`)
          .set('Authorization', `Bearer ${accessToken}`)
          // artifact 契约证据本身合法，但「e2e 技术标准 2」从无证据 →
          // criteriaEvidence 门禁拦截（批一 CAP-B-01 修订即失效闭环）
          .send({
            evidence: {
              summary: 'e2e 最终验收',
              artifacts: [{ name: 'e2e-artifact.md', path: 'docs/e2e.md' }],
            },
          })
          .expect(400)
          .expect((res: Response) => {
            expect(res.body.error?.code).toBe('ACCEPT_BLOCKED');
            const failures: Array<{ check: string }> =
              res.body.error?.details ?? [];
            expect(failures.some((f) => f.check === 'criteriaEvidence')).toBe(
              true,
            );
          })
      );
    });

    it('should accept completion after every criterion has current-revision evidence', async () => {
      const ev = await wsHttp
        .post(`/_api/acceptance/criteria/${secondCriteriaId}/evidence`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          evidenceType: 'test_report',
          content: 'e2e 技术标准证据（当前版本）',
        });
      expect(ev.status).toBe(201);

      return (
        wsHttp
          .post(`/_api/acceptance/${acceptanceId}/accept-completion`)
          .set('Authorization', `Bearer ${accessToken}`)
          // artifact 契约：evidence 需含 artifactId 或 artifacts 数组
          .send({
            evidence: {
              summary: 'e2e 最终验收',
              artifacts: [{ name: 'e2e-artifact.md', path: 'docs/e2e.md' }],
            },
          })
          .expect((res: Response) => {
            expect([200, 201]).toContain(res.status);
            expect(res.body.data.status).toBe('passed');
          })
      );
    });
  });

  describe('POST /_api/acceptance/:id/waive (second acceptance)', () => {
    it('should waive a fresh acceptance', async () => {
      const created = await wsHttp
        .post('/_api/acceptance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ issueId, type: 'functional', title: 'E2E 豁免验收' });
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
        .send({ issueId, type: 'technical', title: 'E2E 待删除验收' });
      expect(created.status).toBe(201);
      return wsHttp
        .delete(`/_api/acceptance/${created.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/acceptance/checklists (团队自定义清单 CRUD)', () => {
    let teamChecklistId: string;
    let foreignChecklistId: string;

    beforeAll(async () => {
      // 他人所有的清单：身份改由鉴权上下文取得后，只能直连库播种
      const seeded = await ws.db.completenessChecklist.create({
        data: {
          name: 'E2E 他人清单',
          projectType: 'backend',
          techStack: 'ts-node',
          checklist: [],
          ownerId: 'someone-else',
        },
      });
      foreignChecklistId = seeded.id;
    });

    it('should create a team checklist (isSystem=false, 归当前用户)', () => {
      return wsHttp
        .post('/_api/acceptance/checklists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E 团队清单',
          projectType: 'backend',
          techStack: 'ts-node',
          checklist: [
            {
              category: '日志',
              content: '是否定义了日志方案',
              severity: 'high',
            },
            {
              category: '测试',
              content: '是否有测试计划',
              severity: 'medium',
              autoFixable: false,
            },
          ],
        })
        .expect(201)
        .expect((res: Response) => {
          const created = res.body.data;
          expect(created.name).toBe('E2E 团队清单');
          expect(created.isSystem).toBe(false);
          expect(created.ownerId).toBe(adminUserId);
          expect(created.checklist).toHaveLength(2);
          teamChecklistId = created.id;
        });
    });

    it('should 401 without authentication', () => {
      return wsHttp
        .post('/_api/acceptance/checklists')
        .send({
          name: 'x',
          projectType: 'api',
          techStack: 'ts-node',
          checklist: [],
        })
        .expect(401);
    });

    it('should update own team checklist and bump version', async () => {
      const res = await wsHttp
        .patch(`/_api/acceptance/checklists/${teamChecklistId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E 团队清单 v2',
          checklist: [
            { category: '安全', content: '是否鉴权', severity: 'critical' },
          ],
        })
        .expect(200);
      expect(res.body.data.name).toBe('E2E 团队清单 v2');
      expect(res.body.data.version).toBe(2);
    });

    it('should reject updating a system checklist', () => {
      if (!systemChecklistId) return Promise.resolve();
      return wsHttp
        .patch(`/_api/acceptance/checklists/${systemChecklistId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'hack' })
        .expect(400);
    });

    it('should reject update by non-owner', () => {
      return wsHttp
        .patch(`/_api/acceptance/checklists/${foreignChecklistId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'not mine' })
        .expect(400);
    });

    it('should reject deleting a foreign-owned checklist', () => {
      return wsHttp
        .delete(`/_api/acceptance/checklists/${foreignChecklistId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should delete own team checklist', () => {
      return wsHttp
        .delete(`/_api/acceptance/checklists/${teamChecklistId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should 404 on deleting an already deleted checklist', () => {
      return wsHttp
        .delete(`/_api/acceptance/checklists/${teamChecklistId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
