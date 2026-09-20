/**
 * CAP-K-03 驱动型发版全链 e2e（GAP-T-22）：
 *   建项目 → 建 issue + 验收 → 创建发版草案（REST）→ 门禁（未过留 draft /
 *   过转 gated）→ 审批决策卡（kind=release）→ resolve accept → approved
 *   → release.approved 事件驱动自动发布（无工作区/无集成 → 三步骤诚实
 *   skipped）→ released。
 * 发版走 REST 面（/releases），与 golden-path 的 service 直调口径互补。
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  withWs,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

const flush = () =>
  new Promise((resolve) => setImmediate(() => setImmediate(resolve)));

async function waitFor(fn: () => Promise<boolean>, tries = 200): Promise<void> {
  for (let i = 0; i < tries; i += 1) {
    if (await fn()) return;
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe('驱动型发版全链 (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let issueId: string;
  let acceptanceId: string;
  let releaseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('ReleasePipeline e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
  }, 60000);

  afterAll(async () => {
    await ws.cleanup().catch(() => undefined);
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  it('① 建项目 + issue 种子 + 验收契约（验收置 passed）', async () => {
    const res = await wsHttp
      .post('/_api/projects')
      .set(auth())
      .send({
        name: '驱动型发版项目',
        description: 'release pipeline e2e',
        type: 'team',
        visibility: 'private',
      })
      .expect(201);
    projectId = res.body.data.id;

    await withWs(ws.id, async () => {
      await ws.db.projectModule.create({
        data: { projectId, code: 'RP', name: '发版管道' },
      });
      await ws.db.statusDefinition.createMany({
        data: [
          { projectId, type: 'task', key: 'todo', name: '待办', order: 1 },
        ],
      });
    });

    const issueRes = await wsHttp
      .post('/_api/issues')
      .set(auth())
      .send({
        projectId,
        moduleCode: 'RP',
        title: '发版管道工程任务',
      })
      .expect(201);
    issueId = issueRes.body.data.id;

    const accRes = await wsHttp
      .post('/_api/acceptance')
      .set(auth())
      .send({
        issueId,
        type: 'mixed',
        priority: 'high',
        title: '发版管道验收',
      })
      .expect(201);
    acceptanceId = accRes.body.data.id;

    await withWs(ws.id, async () => {
      await ws.db.acceptance.update({
        where: { id: acceptanceId },
        data: { status: 'passed' },
      });
    });
  });

  it('② 创建发版草案（REST，含发布范围）', async () => {
    const res = await wsHttp
      .post('/_api/releases')
      .set(auth())
      .send({
        projectId,
        version: '1.0.0',
        name: '首个驱动型发版',
        notes: '发版说明草稿。',
        scopeIssueIds: [issueId],
      })
      .expect((r: Response) => {
        if (r.status !== 201) {
          console.error('CREATE_RELEASE_BODY', JSON.stringify(r.body));
        }
      })
      .expect(201)
      .expect((r: Response) => {
        expect(r.body.data.status).toBe('draft');
        expect(r.body.data.scope.issueIds).toEqual([issueId]);
      });
    releaseId = res.body.data.id;
  });

  it('③ 异常流：重复版本 400；小于基线 400（只前滚）', async () => {
    await wsHttp
      .post('/_api/releases')
      .set(auth())
      .send({ projectId, version: '1.0.0' })
      .expect(400);
    await wsHttp
      .post('/_api/releases')
      .set(auth())
      .send({ projectId, version: '0.9.0' })
      .expect(400);
  });

  it('④ 门禁：范围/验收/CI/契约/审计/CHANGELOG 全过 → gated', async () => {
    const res = await wsHttp
      .post(`/_api/releases/${releaseId}/gate`)
      .set(auth())
      .send({})
      .expect(201)
      .expect((r: Response) => {
        expect(r.body.data.passed).toBe(true);
        const keys = r.body.data.checks.map((c: { key: string }) => c.key);
        for (const key of [
          'scope',
          'acceptance',
          'ci',
          'contract',
          'audit',
          'changelog',
        ]) {
          expect(keys).toContain(key);
        }
      });

    const detail = await wsHttp
      .get(`/_api/releases/${releaseId}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('gated');
    expect(detail.body.data.gateResult.passed).toBe(true);
  });

  it('⑤ 门禁未过留 draft：空范围草案被 scope 检查拒绝', async () => {
    const draft = await wsHttp
      .post('/_api/releases')
      .set(auth())
      .send({ projectId, version: '1.1.0' })
      .expect(201);

    await wsHttp
      .post(`/_api/releases/${draft.body.data.id}/gate`)
      .set(auth())
      .send({})
      .expect(201)
      .expect((r: Response) => {
        expect(r.body.data.passed).toBe(false);
        expect(r.body.data.checks[0].key).toBe('scope');
      });

    const detail = await wsHttp
      .get(`/_api/releases/${draft.body.data.id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('draft');
    expect(detail.body.data.gateResult.passed).toBe(false);
  });

  it('⑥ 发起审批决策卡（kind=release）并 accept → approved', async () => {
    const proposalRes = await wsHttp
      .post(`/_api/releases/${releaseId}/approval-request`)
      .set(auth())
      .send({})
      .expect((r: Response) => {
        if (r.status !== 201) {
          console.error('APPROVAL_REQ_BODY', JSON.stringify(r.body));
        }
      })
      .expect(201)
      .expect((r: Response) => {
        expect(r.body.data.kind).toBe('release');
        expect(r.body.data.status).toBe('pending');
      });
    const proposalId = proposalRes.body.data.id;

    // 幂等：同发版重复发起 → 400
    await wsHttp
      .post(`/_api/releases/${releaseId}/approval-request`)
      .set(auth())
      .send({})
      .expect(400);

    await wsHttp
      .post(`/_api/decisions/proposals/${proposalId}/resolve`)
      .set(auth())
      .send({ action: 'accept' })
      .expect(201);

    // applier 置 approved 后事件驱动发布异步执行——轻负载下可能已直达 released
    await waitFor(async () => {
      const detail = await wsHttp
        .get(`/_api/releases/${releaseId}`)
        .set(auth());
      return ['approved', 'publishing', 'released'].includes(
        detail.body.data?.status,
      );
    });

    const detail = await wsHttp
      .get(`/_api/releases/${releaseId}`)
      .set(auth())
      .expect(200);
    expect(['approved', 'publishing', 'released']).toContain(
      detail.body.data.status,
    );
    expect(detail.body.data.approvedBy).toBeTruthy();
  });

  it('⑦ release.approved 事件驱动自动发布：无工作区/无集成 → 三步骤诚实 skipped → released', async () => {
    await waitFor(async () => {
      const detail = await wsHttp
        .get(`/_api/releases/${releaseId}`)
        .set(auth());
      return detail.body.data.status === 'released';
    });

    const detail = await wsHttp
      .get(`/_api/releases/${releaseId}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('released');
    expect(detail.body.data.releasedAt).toBeTruthy();
    const log = detail.body.data.executionLog as Array<{
      step: string;
      status: string;
    }>;
    expect(log.map((l) => l.step)).toEqual([
      'changelog',
      'tag',
      'github-release',
    ]);
    expect(log.every((l) => l.status === 'skipped')).toBe(true);
  });
});
