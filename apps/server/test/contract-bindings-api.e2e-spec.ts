/**
 * 契约绑定 REST 面端到端（三期：种生实机入口切片）。
 *
 * 走真实 AppModule + 隔离工作区 SQLite + 真实临时工作区文件系统，
 * 覆盖四个端点与 resolver 回退链：
 *   1. GET  bindings —— 空项目（未绑工作区）→ 空绑定 + workspaceRoot null
 *   2. POST seed —— 仅绑 ProjectWorkspace.localPath（git 模块 setWorkspace 写入面）
 *      也能种生（resolver 第三级回退）；三件套落盘 + 幂等 + fileTypes 单文件补种
 *   3. POST check —— 对齐 → aligned；手改 AGENTS.md 托管区 → conflicted + 升级提案
 *   4. PATCH bindings/:fileType —— 三态切换；detached 清冲突态
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  withWs,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';
import { createProjectFixture } from './helpers/fixtures';

describe('契约绑定 REST 面 (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let workspaceRoot: string;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('ContractBindings API');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      '契约绑定面板验收',
    );
  }, 60000);

  afterAll(async () => {
    await ws.cleanup().catch(() => undefined); // Windows 下 SQLite 句柄残留可致 EPERM
    await app.close();
  });

  it('GET bindings：未绑工作区的项目返回空绑定 + workspaceRoot null', async () => {
    const res = await wsHttp
      .get(`/_api/projects/${projectId}/contract/bindings`)
      .set(auth())
      .expect(200);
    expect(res.body.data.workspaceRoot).toBeNull();
    expect(res.body.data.bindings).toEqual([]);
  });

  it('POST seed：仅绑 ProjectWorkspace 也能种生（resolver 回退），三件套落盘', async () => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-bindings-'));
    await withWs(ws.id, async () => {
      await ws.db.projectWorkspace.create({
        data: { projectId, localPath: workspaceRoot },
      });
    });

    const res = await wsHttp
      .post(`/_api/projects/${projectId}/contract/seed`)
      .set(auth())
      .send({})
      .expect(200);

    expect(res.body.data.workspaceRoot).toBe(workspaceRoot);
    const byPath = new Map(
      (res.body.data.files as Array<{ path: string; action: string }>).map(
        (f) => [f.path, f.action],
      ),
    );
    expect(byPath.get('AGENTS.md')).toBe('created');
    expect(byPath.get('CLAUDE.md')).toBe('created');
    expect(byPath.get('CHANGELOG.md')).toBe('created');

    const agents = fs.readFileSync(
      path.join(workspaceRoot, 'AGENTS.md'),
      'utf8',
    );
    expect(agents).toContain('<!-- BEGIN apm:managed:project-intro -->');
  });

  it('POST seed：幂等重跑 + fileTypes 单文件补种', async () => {
    const rerun = await wsHttp
      .post(`/_api/projects/${projectId}/contract/seed`)
      .set(auth())
      .send({})
      .expect(200);
    const actions = (
      rerun.body.data.files as Array<{ path: string; action: string }>
    ).map((f) => f.action);
    expect(actions).not.toContain('created');

    const partial = await wsHttp
      .post(`/_api/projects/${projectId}/contract/seed`)
      .set(auth())
      .send({ fileTypes: ['changelog'] })
      .expect(200);
    expect(partial.body.data.files).toHaveLength(1);
    expect(partial.body.data.files[0].path).toBe('CHANGELOG.md');
    expect(partial.body.data.files[0].action).toBe('skipped_existing');
  });

  it('POST check：种生后对齐 aligned；CHANGELOG detached 跳过', async () => {
    const res = await wsHttp
      .post(`/_api/projects/${projectId}/contract/check`)
      .set(auth())
      .send({})
      .expect(200);

    const byType = new Map(
      (res.body.data as Array<{ fileType: string; state: string }>).map((r) => [
        r.fileType,
        r.state,
      ]),
    );
    expect(byType.get('agents')).toBe('aligned');
    expect(byType.get('changelog')).toBe('skipped_detached');
  });

  it('POST check：手改托管区 → conflicted 并升级 DecisionProposal', async () => {
    const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
    const content = fs.readFileSync(agentsPath, 'utf8');
    fs.writeFileSync(
      agentsPath,
      content.replace(
        '<!-- BEGIN apm:managed:project-intro -->',
        '<!-- BEGIN apm:managed:project-intro -->\n人工手改的一行',
      ),
      'utf8',
    );

    const res = await wsHttp
      .post(`/_api/projects/${projectId}/contract/check`)
      .set(auth())
      .send({ fileType: 'agents' })
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].state).toBe('conflicted');
    expect(res.body.data[0].proposalId).toBeTruthy();

    await withWs(ws.id, async () => {
      const proposal = await ws.db.decisionProposal.findFirst({
        where: { projectId, kind: 'contract_conflict' },
      });
      expect(proposal).toBeTruthy();
    });

    const list = await wsHttp
      .get(`/_api/projects/${projectId}/contract/bindings`)
      .set(auth())
      .expect(200);
    const agents = list.body.data.bindings.find(
      (b: { fileType: string }) => b.fileType === 'agents',
    );
    expect(agents.conflictState).toBe('conflicted');
  });

  it('PATCH bindings/:fileType：切 detached 清冲突态；未知类型 404', async () => {
    const res = await wsHttp
      .patch(`/_api/projects/${projectId}/contract/bindings/agents`)
      .set(auth())
      .send({ syncMode: 'detached' })
      .expect(200);
    expect(res.body.data.syncMode).toBe('detached');
    expect(res.body.data.conflictState).toBeNull();

    await wsHttp
      .patch(`/_api/projects/${projectId}/contract/bindings/nope`)
      .set(auth())
      .send({ syncMode: 'managed' })
      .expect(404);
  });

  describe('formatOnly 格式化纳管（半途项目已有文件）', () => {
    let projectId2: string;
    let root2: string;

    it('已有 AGENTS.md 仅并入 frontmatter，不注入托管区间，绑定 synced', async () => {
      projectId2 = await createProjectFixture(
        wsHttp,
        accessToken,
        '格式化纳管验收',
      );
      // project.created 的自动种生为 fire-and-forget：等它定局——此时项目
      // 尚无工作区登记，自动种生应诚实跳过、不建绑定。若该监听器晚于下方
      // 工作区登记才执行，会以默认模式注入托管区间，污染本用例前提（真实
      // 竞态窗口，见夜航报告待裁决项）
      await new Promise((resolve) => setTimeout(resolve, 150));
      const autoBindings = await withWs(ws.id, () =>
        ws.db.contractFileBinding.findMany({
          where: { projectId: projectId2 },
        }),
      );
      expect(autoBindings).toHaveLength(0);

      root2 = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-adopt-'));
      const manual = [
        '---',
        'title: 项目手册',
        'tags: [demo]',
        '---',
        '',
        '# 自定义标题',
        '',
        '开发者自由撰写的内容。',
      ].join('\n');
      fs.writeFileSync(path.join(root2, 'AGENTS.md'), manual, 'utf8');
      await withWs(ws.id, async () => {
        await ws.db.projectWorkspace.create({
          data: { projectId: projectId2, localPath: root2 },
        });
      });

      const res = await wsHttp
        .post(`/_api/projects/${projectId2}/contract/seed`)
        .set(auth())
        .send({ formatOnly: true, fileTypes: ['agents'] })
        .expect(200);
      expect(res.body.data.files).toHaveLength(1);
      expect(res.body.data.files[0].action).toBe('adopted');

      const next = fs.readFileSync(path.join(root2, 'AGENTS.md'), 'utf8');
      expect(next).toContain('title: 项目手册');
      expect(next).toContain('apm_project_id:');
      expect(next).toContain('# 自定义标题');
      expect(next).not.toContain('<!-- BEGIN apm:managed:');

      const list = await wsHttp
        .get(`/_api/projects/${projectId2}/contract/bindings`)
        .set(auth())
        .expect(200);
      const agents = list.body.data.bindings.find(
        (b: { fileType: string }) => b.fileType === 'agents',
      );
      expect(agents.syncMode).toBe('synced');
      expect(agents.baseline).toBeTruthy();
    });

    it('纳管后检查对齐 aligned；手改正文 → conflicted 且不升级提案', async () => {
      const aligned = await wsHttp
        .post(`/_api/projects/${projectId2}/contract/check`)
        .set(auth())
        .send({ fileType: 'agents' })
        .expect(200);
      expect(aligned.body.data[0].state).toBe('aligned');

      fs.appendFileSync(
        path.join(root2, 'AGENTS.md'),
        '\n手改的新增行\n',
        'utf8',
      );

      const drifted = await wsHttp
        .post(`/_api/projects/${projectId2}/contract/check`)
        .set(auth())
        .send({ fileType: 'agents' })
        .expect(200);
      expect(drifted.body.data[0].state).toBe('conflicted');
      expect(drifted.body.data[0].proposalId).toBeUndefined();

      await withWs(ws.id, async () => {
        const proposal = await ws.db.decisionProposal.findFirst({
          where: { projectId: projectId2, kind: 'contract_conflict' },
        });
        expect(proposal).toBeNull();
      });
    });
  });
});
