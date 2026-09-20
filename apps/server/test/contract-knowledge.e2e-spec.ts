/**
 * 契约与文档知识层 —— 实机验收 spec（v2 纪要 §16 分期 1a/1b/2 主链）。
 *
 * 走真实 AppModule + 隔离工作区 SQLite + 真实临时工作区文件系统，
 * 验收链路：
 *   1. 建项目 → 种生三件套（AGENTS 托管镜像 / CLAUDE 薄别名 / CHANGELOG detached）
 *   2. 手改 AGENTS.md 托管区 → 对齐检查检出冲突 → 升级 DecisionProposal（不静默覆盖）
 *   3. 冲突裁决 accept_db → 平台真相写回 → 恢复对齐
 *   4. 发版 → release.created 订阅器再生 CHANGELOG；手改派生文件检出派生型冲突 → 重导恢复
 *   5. apm:// 链路：建文档 → rebuild 分配短号 → resolveRef / findOne 短号兼容 →
 *      T1 惰性 digest（structural → cached）→ T0 发布触发重算
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { ContractSeedService } from '../src/modules/contract/contract-seed.service';
import { ContractBindingService } from '../src/modules/contract/contract-binding.service';
import { ReleaseService } from '../src/modules/release/release.service';
import { DocRegistryService } from '../src/modules/document/services/doc-registry.service';
import { DocumentService } from '../src/modules/document/document.service';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  withWs,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';
import { createProjectFixture } from './helpers/fixtures';

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

describe('契约与文档知识层 · 实机验收 (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let workspaceRoot: string;

  let seedService: ContractSeedService;
  let bindingService: ContractBindingService;
  let releaseService: ReleaseService;
  let docRegistry: DocRegistryService;
  let documentService: DocumentService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('ContractKnowledge 验收');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    seedService = app.get(ContractSeedService);
    bindingService = app.get(ContractBindingService);
    releaseService = app.get(ReleaseService);
    docRegistry = app.get(DocRegistryService);
    documentService = app.get(DocumentService);
  }, 60000);

  afterAll(async () => {
    await ws.cleanup().catch(() => undefined); // Windows 下 SQLite 句柄残留可致 EPERM
    await app.close();
  });

  it('验收 1：建项目 + 登记工作区后种出契约三件套', async () => {
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      '知识层验收项目',
    );

    // 种生需要项目有仓库工作区路径；先建项目（种生诚实降级）再登记仓库重跑
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-accept-'));
    await withWs(ws.id, async () => {
      await ws.db.repository.create({
        data: {
          projectId,
          name: 'main',
          workspacePath: workspaceRoot,
        },
      });
    });

    const result = await withWs(ws.id, () =>
      seedService.seedProjectContractFiles(projectId),
    );
    expect(result.workspaceRoot).toBe(workspaceRoot);
    expect(result.files.map((f) => f.action)).toEqual([
      'created',
      'created',
      'created',
    ]);

    const agents = fs.readFileSync(
      path.join(workspaceRoot, 'AGENTS.md'),
      'utf8',
    );
    expect(agents).toContain('apm_project_id');
    expect(agents).toContain('apm_sync_mode: managed');
    expect(agents).toContain('<!-- BEGIN apm:managed:project-intro -->');
    expect(agents).toContain('知识层验收项目');
    expect(
      fs.readFileSync(path.join(workspaceRoot, 'CLAUDE.md'), 'utf8'),
    ).toContain('@AGENTS.md');
    expect(
      fs.readFileSync(path.join(workspaceRoot, 'CHANGELOG.md'), 'utf8'),
    ).toContain('# Changelog');

    const bindings = await withWs(ws.id, () =>
      ws.db.contractFileBinding.findMany(),
    );
    expect(bindings).toHaveLength(3);
    const agentsBinding = bindings.find((b) => b.fileType === 'agents');
    expect(agentsBinding?.syncMode).toBe('managed');
    expect(bindings.find((b) => b.fileType === 'changelog')?.syncMode).toBe(
      'detached',
    );
  });

  it('验收 2：手改 AGENTS.md 托管区 → 检出冲突并升级 DecisionProposal（不静默覆盖）', async () => {
    const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
    const tampered = fs
      .readFileSync(agentsPath, 'utf8')
      .replace('知识层验收项目', '被手改的项目名');
    fs.writeFileSync(agentsPath, tampered);

    const report = await withWs(ws.id, () =>
      bindingService.checkAlignment(projectId, 'agents'),
    );
    expect(report.state).toBe('conflicted');
    expect(report.proposalId).toBeTruthy();
    // 文件未被系统覆写
    expect(fs.readFileSync(agentsPath, 'utf8')).toBe(tampered);

    const proposals = await withWs(ws.id, () =>
      ws.db.decisionProposal.findMany({ where: { kind: 'contract_conflict' } }),
    );
    expect(proposals).toHaveLength(1);
    const payload = proposals[0].payload as { blocks: { fileSide: string }[] };
    expect(JSON.stringify(payload)).toContain('被手改的项目名');

    // 未决冲突期间不重复建提案
    const again = await withWs(ws.id, () =>
      bindingService.checkAlignment(projectId, 'agents'),
    );
    expect(again.proposalId).toBeUndefined();
  });

  it('验收 3：裁决 accept_db → 平台真相写回文件并恢复对齐', async () => {
    const binding = await withWs(ws.id, () =>
      ws.db.contractFileBinding.findUnique({
        where: { projectId_fileType: { projectId, fileType: 'agents' } },
      }),
    );
    await withWs(ws.id, () =>
      bindingService.resolveConflict(binding!.id, 'accept_db'),
    );

    const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
    expect(fs.readFileSync(agentsPath, 'utf8')).toContain('知识层验收项目');
    const report = await withWs(ws.id, () =>
      bindingService.checkAlignment(projectId, 'agents'),
    );
    expect(report.state).toBe('aligned');
  });

  it('验收 4：发版 → CHANGELOG 单向再生；手改派生文件检出派生型冲突 → 重导恢复', async () => {
    const release = await withWs(ws.id, () =>
      releaseService.createRelease({
        projectId,
        version: '0.1.0',
        notes: '首版知识层闭环。',
        createdBy: 'e2e-admin',
      }),
    );
    await withWs(ws.id, () =>
      releaseService.publishRelease(release.id, 'v0.1.0'),
    );
    // 订阅器再生为异步事件链，轮询等待 CHANGELOG 落盘
    await waitFor(() =>
      Promise.resolve(
        fs
          .readFileSync(path.join(workspaceRoot, 'CHANGELOG.md'), 'utf8')
          .includes('## [0.1.0]'),
      ),
    );

    const changelogPath = path.join(workspaceRoot, 'CHANGELOG.md');
    const content = fs.readFileSync(changelogPath, 'utf8');
    expect(content).toContain('## [0.1.0]');
    expect(content).toContain('首版知识层闭环。');

    const changelogBinding = await withWs(ws.id, () =>
      ws.db.contractFileBinding.findUnique({
        where: { projectId_fileType: { projectId, fileType: 'changelog' } },
      }),
    );
    expect(changelogBinding?.syncMode).toBe('managed');
    expect(changelogBinding?.baseline).toBeTruthy();

    // 手改派生文件 → 派生型冲突
    fs.writeFileSync(changelogPath, '# 我的手改日志\n');
    const drifted = await withWs(ws.id, () =>
      bindingService.checkAlignment(projectId, 'changelog'),
    );
    expect(drifted.state).toBe('conflicted');
    expect(drifted.proposalId).toBeTruthy();

    // 重新导出（派生型 accept_db 等价动作）→ 恢复对齐
    await withWs(ws.id, () => releaseService.exportChangelog(projectId));
    const realigned = await withWs(ws.id, () =>
      bindingService.checkAlignment(projectId, 'changelog'),
    );
    expect(realigned.state).toBe('aligned');
  });

  it('验收 5：apm:// 链路——短号分配/解析/ findOne 兼容', async () => {
    const createRes = await wsHttp
      .post('/_api/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '验收门禁设计',
        content: '# 背景\n\n验收闭环说明。\n\n## 方案\n\n正文。',
        projectId,
        category: 'design',
      })
      .expect(201)
      .expect((res: Response) => {
        expect(res.body.data).toHaveProperty('id');
      });
    const docId = createRes.body.data.id as string;

    const rebuild = await withWs(ws.id, () =>
      docRegistry.rebuildIndex(projectId),
    );
    expect(rebuild.documents).toBeGreaterThanOrEqual(1);

    const resolved = await withWs(ws.id, () =>
      docRegistry.resolveRef(projectId, 'D1'),
    );
    expect(resolved?.id).toBe(docId);

    // findOne 短号兼容（apm:// 链接直达的路由基础）
    const viaShortId = await withWs(ws.id, () => documentService.findOne('D1'));
    expect(viaShortId.id).toBe(docId);
  });

  it('验收 6：T1 惰性 digest（structural → cached）与 T0 发布重算', async () => {
    await withWs(ws.id, () => docRegistry.rebuildIndex(projectId));
    const docId = (await withWs(ws.id, () =>
      docRegistry.resolveRef(projectId, 'D1'),
    ))!.id;

    // 首取：结构子集（零 AI 成本）+ 后台物化
    const first = await withWs(ws.id, () => docRegistry.getSubset(docId));
    expect(first!.freshness).toBe('structural');
    await flush();

    const cached = await withWs(ws.id, () => docRegistry.getSubset(docId));
    expect(cached!.freshness).toBe('cached');
    expect(cached!.digest!.summary).toContain('验收闭环说明');

    // T0：发布 → 重算排队（checksum 失配 → stale → 热替换）
    await wsHttp
      .put(`/_api/documents/${docId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'published' })
      .expect(200);
    await withWs(ws.id, () => docRegistry.rebuildIndex(projectId));
    await flush();

    const staleOrFresh = await withWs(ws.id, () =>
      docRegistry.getSubset(docId),
    );
    expect(['cached', 'stale', 'structural']).toContain(
      staleOrFresh!.freshness,
    );
    await flush();

    // T0 订阅器为异步事件链，轮询等待 digest 重算就位
    await waitFor(async () => {
      const row = await withWs(ws.id, () =>
        ws.db.documentDigest.findUnique({ where: { documentId: docId } }),
      );
      return row?.status === 'ready';
    });

    const digestRow = await withWs(ws.id, () =>
      ws.db.documentDigest.findUnique({ where: { documentId: docId } }),
    );
    expect(digestRow?.status).toBe('ready');
  });
});
