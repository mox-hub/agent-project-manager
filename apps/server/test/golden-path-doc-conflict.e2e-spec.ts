/**
 * 黄金路径场景 3（测试映射矩阵 §四场景库第 3 条，GAP-T-02 联动）：
 *   文档发布 → spec 冻结 → 执行触碰托管区 → 冲突升级决策卡。
 *
 * 走真实 AppModule + 隔离工作区 SQLite + 真实临时工作区文件系统：
 *   1. 建项目 + 契约种生（AGENTS.md 托管镜像）
 *   2. 建文档并发布 → publishedVersionId 落冻结快照
 *   3. 建 issue → 建 execution → 注册 runtime（真会话凭据）
 *   4. 手改 AGENTS.md 托管区（模拟 agent 执行触碰文件）
 *   5. 按 daemon 真实节拍 POST /runtime/executions/:id/result(completed)
 *      → runtime.execution.result → 订阅器对齐检查 → conflicted
 *      → 升级 contract_conflict 决策提案（不静默覆盖，文件原样）
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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

/** 轮询等待异步事件链落位（message-bus 订阅器为 fire-and-forget async） */
async function waitFor(fn: () => Promise<boolean>, tries = 30): Promise<void> {
  for (let i = 0; i < tries; i += 1) {
    if (await fn()) return;
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe('黄金路径 3：文档冻结 → 执行触碰 → 冲突升级 (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let issueId: string;
  let runId: string;
  let workspaceRoot: string;
  let runtimeSessionId: string;
  let runtimeSessionToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('GoldenPath3 e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
  }, 60000);

  afterAll(async () => {
    await ws.cleanup().catch(() => undefined); // Windows 下 SQLite 句柄残留可致 EPERM
    await app.close();
  }, 30000);

  it('① 建项目、登记工作区、契约种生出托管镜像', async () => {
    const res = await wsHttp
      .post('/_api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: '冲突升级验收项目',
        type: 'team',
        visibility: 'private',
      })
      .expect(201);
    projectId = res.body.data.id;

    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-gp3-'));
    await withWs(ws.id, async () => {
      await ws.db.repository.create({
        data: { projectId, name: 'main', workspacePath: workspaceRoot },
      });
    });

    const seed = await wsHttp
      .post(`/_api/projects/${projectId}/contract/seed`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(200);
    expect(
      seed.body.data.files.map((f: { action: string }) => f.action),
    ).toEqual(['created', 'created', 'created']);
  });

  it('② 建文档并发布 → publishedVersionId 落冻结快照', async () => {
    const created = await wsHttp
      .post('/_api/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '项目手册 spec',
        content: '# 背景\n\n手册规范正文。\n\n## 方案\n\n冻结验证。',
        projectId,
        category: 'design',
      })
      .expect(201);
    const docId = created.body.data.id as string;

    await wsHttp
      .put(`/_api/documents/${docId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'published' })
      .expect(200);

    const detail = await wsHttp
      .get(`/_api/documents/${docId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const publishedVersionId = detail.body.data.publishedVersionId as string;
    expect(publishedVersionId).toBeTruthy();

    const published = await withWs(ws.id, () =>
      ws.db.documentVersion.findUnique({ where: { id: publishedVersionId } }),
    );
    expect(published?.content).toContain('手册规范正文');
  });

  it('③ 建 issue 与 execution，注册 runtime 会话', async () => {
    await withWs(ws.id, async () => {
      await ws.db.projectModule.create({
        data: { projectId, code: 'GPD', name: '冲突升级' },
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

    const issue = await wsHttp
      .post('/_api/issues')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ projectId, moduleCode: 'GPD', title: '触碰托管区的执行任务' })
      .expect((r: Response) => {
        if (r.status !== 201) {
          console.error('ISSUE-ERR', JSON.stringify(r.body));
        }
        expect(r.status).toBe(201);
      });
    issueId = issue.body.data.id;

    const run = await wsHttp
      .post('/_api/execution/runs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        projectId,
        issueId,
        subjectType: 'task',
        subjectId: issueId,
        identitySource: 'cli',
        goal: '执行将改动 AGENTS.md 托管区',
      })
      .expect(201);
    runId = run.body.data.id;

    const register = await wsHttp
      .post('/_api/runtime/register')
      .send({
        runtimeId: 'runtime-gp3-001',
        deviceId: 'device-gp3-001',
        hostPlatform: 'windows',
        runtimeVersion: '0.1.0',
        protocolVersion: '1.0.0',
        workspaceRoots: [workspaceRoot],
        availableProviders: ['file', 'git'],
        cliProviders: ['codex'],
      })
      .expect(201);
    runtimeSessionId = register.body.data.runtimeSessionId;
    runtimeSessionToken = register.body.data.runtimeSessionToken;
    expect(runtimeSessionToken).toBeTruthy();
  });

  it('④ 执行触碰托管区：手改 AGENTS.md 托管区间内容', async () => {
    const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
    const tampered = fs
      .readFileSync(agentsPath, 'utf8')
      .replace('冲突升级验收项目', '被 agent 改写的项目名');
    fs.writeFileSync(agentsPath, tampered);
    expect(fs.readFileSync(agentsPath, 'utf8')).toContain(
      '被 agent 改写的项目名',
    );
  });

  it('⑤ 执行收口上报 completed → 订阅器检出冲突并升级决策卡', async () => {
    await wsHttp
      .post(`/_api/runtime/executions/${runId}/result`)
      .set('x-runtime-session-id', runtimeSessionId)
      .set('x-runtime-session-token', runtimeSessionToken)
      .send({
        status: 'completed',
        summary: 'agent 已更新项目手册文件',
        artifacts: [{ type: 'file', ref: 'AGENTS.md' }],
      })
      .expect(201)
      .expect((r: Response) => {
        expect(r.body.data.accepted).toBe(true);
      });

    // runtime.execution.result → ContractExecutionSubscriber → 对齐检查（异步）
    await waitFor(async () => {
      const proposals = await withWs(ws.id, () =>
        ws.db.decisionProposal.findMany({
          where: { kind: 'contract_conflict' },
        }),
      );
      return proposals.length > 0;
    });

    const proposals = await withWs(ws.id, () =>
      ws.db.decisionProposal.findMany({ where: { kind: 'contract_conflict' } }),
    );
    expect(proposals).toHaveLength(1);
    expect(JSON.stringify(proposals[0].payload)).toContain(
      '被 agent 改写的项目名',
    );

    // 不静默覆盖：文件保持 agent 手改后的样子，等人在收件箱裁决
    const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
    expect(fs.readFileSync(agentsPath, 'utf8')).toContain(
      '被 agent 改写的项目名',
    );
  });
});
