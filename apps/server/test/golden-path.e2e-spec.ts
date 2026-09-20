/**
 * 黄金路径场景 1（测试映射矩阵 §四场景库第 1 条，兼覆盖 GAP-T-02 首条）：
 *   建项目 → 契约种生（POST seed）→ 建 issue → 创建执行 → 审批通过
 *   → 创建验收 → 发布 Release → CHANGELOG 再生与订阅事件链。
 *
 * 走真实 AppModule + 隔离工作区 SQLite + 真实临时工作区文件系统；
 * 执行/runtime 环节全走 HTTP 面（create → start → approvals resolve），
 * 不启动真守护进程。发版无 REST 面（ReleaseController 尚未建），
 * 经 ReleaseService 直调，与 contract-knowledge e2e 口径一致。
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { ReleaseService } from '../src/modules/release/release.service';
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
async function waitFor(fn: () => Promise<boolean>, tries = 20): Promise<void> {
  for (let i = 0; i < tries; i += 1) {
    if (await fn()) return;
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('黄金路径 1：需求 → 执行 → 验收 → 发版 (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let releaseService: ReleaseService;

  let projectId: string;
  let issueId: string;
  let runId: string;
  let approvalId: string;
  let acceptanceId: string;
  let releaseId: string;
  let workspaceRoot: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('GoldenPath e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    releaseService = app.get(ReleaseService);
  }, 60000);

  afterAll(async () => {
    await ws.cleanup().catch(() => undefined); // Windows 下 SQLite 句柄残留可致 EPERM
    await app.close();
  });

  it('① 建项目并登记工作区', async () => {
    const res = await wsHttp
      .post('/_api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: '黄金路径验收项目',
        description: 'golden path e2e',
        type: 'team',
        visibility: 'private',
      })
      .expect(201)
      .expect((r: Response) => {
        expect(r.body.data).toBeTruthy();
      });
    projectId = res.body.data.id;

    // 种生需要项目有仓库工作区路径：登记 repository（契约域专用 workspacePath）
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-golden-'));
    await withWs(ws.id, async () => {
      await ws.db.repository.create({
        data: {
          projectId,
          name: 'main',
          workspacePath: workspaceRoot,
        },
      });
    });

    expect(projectId).toBeTruthy();
  });

  it('② 契约种生（POST seed）产出三件套', async () => {
    const res = await wsHttp
      .post(`/_api/projects/${projectId}/contract/seed`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(200)
      .expect((r: Response) => {
        expect(r.body.data.workspaceRoot).toBe(workspaceRoot);
        expect(
          r.body.data.files.map((f: { action: string }) => f.action),
        ).toEqual(['created', 'created', 'created']);
      });

    const seededPaths = res.body.data.files.map(
      (f: { path: string }) => f.path,
    );
    expect(seededPaths).toEqual(['AGENTS.md', 'CLAUDE.md', 'CHANGELOG.md']);

    const bindings = await withWs(ws.id, () =>
      ws.db.contractFileBinding.findMany(),
    );
    expect(bindings).toHaveLength(3);
    expect(bindings.find((b) => b.fileType === 'agents')?.syncMode).toBe(
      'managed',
    );
  });

  it('③ 建 issue（模块与状态种子落库后）', async () => {
    await withWs(ws.id, async () => {
      await ws.db.projectModule.create({
        data: { projectId, code: 'GP', name: '黄金路径' },
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

    const res = await wsHttp
      .post('/_api/issues')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        projectId,
        moduleCode: 'GP',
        title: '黄金路径工程任务',
      })
      .expect(201)
      .expect((r: Response) => {
        expect(r.body.data).toBeTruthy();
      });
    issueId = res.body.data.id;
    expect(issueId).toBeTruthy();
  });

  it('④ 创建执行并启动（HTTP 面桩，无守护进程）', async () => {
    const res = await wsHttp
      .post('/_api/execution/runs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        projectId,
        issueId,
        subjectType: 'task',
        subjectId: issueId,
        identitySource: 'cli',
        goal: '黄金路径执行目标',
        role: 'fullstack_dev',
        input: { prompt: 'golden path' },
      })
      .expect(201)
      .expect((r: Response) => {
        expect(r.body.data).toBeTruthy();
      });
    runId = res.body.data.id;

    await wsHttp
      .post(`/_api/execution/runs/${runId}/start`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
  });

  it('⑤ 审批创建并通过（approved）', async () => {
    const created = await wsHttp
      .post('/_api/execution/approvals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        executionRunId: runId,
        projectId,
        issueId,
        requestedAction: 'file.write',
        actionType: 'write',
        riskLevel: 'medium',
        reason: '黄金路径审批',
      })
      .expect(201);
    approvalId = created.body.data.id;

    await wsHttp
      .post(`/_api/execution/approvals/${approvalId}/resolve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ resolution: 'approved', resolutionNote: '黄金路径通过' })
      .expect(201)
      .expect((r: Response) => {
        expect(JSON.stringify(r.body.data)).toContain('approved');
      });
  });

  it('⑥ 创建验收契约', async () => {
    const res = await wsHttp
      .post('/_api/acceptance')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        issueId,
        type: 'mixed',
        priority: 'high',
        title: '黄金路径验收',
      })
      .expect(201)
      .expect((r: Response) => {
        expect(r.body.data).toBeTruthy();
      });
    acceptanceId = res.body.data.id;
    expect(acceptanceId).toBeTruthy();
  });

  it('⑦ 发布 Release（release.created 经 message-bus）', async () => {
    const release = await withWs(ws.id, () =>
      releaseService.createRelease({
        projectId,
        version: '0.1.0',
        notes: '黄金路径首版。',
        createdBy: 'e2e-admin',
      }),
    );
    releaseId = release.id;
    await withWs(ws.id, () =>
      releaseService.publishRelease(releaseId, 'v0.1.0'),
    );
    expect(releaseId).toBeTruthy();
  });

  it('⑧ CHANGELOG 再生落盘（订阅事件链产物）且绑定转 managed', async () => {
    // release.created → ReleaseChangelogSubscriber → exportChangelog（异步）
    await waitFor(() =>
      Promise.resolve(
        fs
          .readFileSync(path.join(workspaceRoot, 'CHANGELOG.md'), 'utf8')
          .includes('## [0.1.0]'),
      ),
    );

    const content = fs.readFileSync(
      path.join(workspaceRoot, 'CHANGELOG.md'),
      'utf8',
    );
    expect(content).toContain('## [0.1.0]');
    expect(content).toContain('黄金路径首版。');

    // 订阅链副产物：changelog 绑定从 detached 转 managed 并落基线
    const binding = await withWs(ws.id, () =>
      ws.db.contractFileBinding.findUnique({
        where: { projectId_fileType: { projectId, fileType: 'changelog' } },
      }),
    );
    expect(binding?.syncMode).toBe('managed');
    expect(binding?.baseline).toBeTruthy();
  });
});
