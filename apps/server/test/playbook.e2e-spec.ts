import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

/**
 * 剧本 / 专长度档位 / 分析健康卡 全链路（v2 纪要切片 2-5，不 spawn 真实 CLI、不触 LLM）：
 * 内置模板注册表 → 挂载游标 → 阶段访谈（转写工件 + 闸门提案）→ 决策收件箱拍板 →
 * 游标推进 → 跳过留痕；档位 suppress/reset；dashboard 完备度与剧本健康派生。
 */
describe('Playbook / expertise / dashboard health (e2e, local-only paths)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Playbook e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    const project = await ws.db.project.create({
      data: {
        name: 'Playbook e2e Project',
        type: 'team',
        visibility: 'internal',
        status: 'active',
        createdBy: 'e2e',
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  it('GET /playbooks/templates 返回内置双模板（含访谈与闸门定义）', async () => {
    const res = await wsHttp
      .get('/_api/playbooks/templates')
      .set(auth())
      .expect(200);
    const templates = res.body.data.templates;
    expect(templates.map((t: { key: string }) => t.key)).toEqual([
      'software-full-cycle',
      'maintenance-light',
    ]);
    const research = templates[0].stages.find(
      (s: { key: string }) => s.key === 'research',
    );
    expect(research.interview.length).toBeGreaterThan(0);
    expect(research.gate.consequences.length).toBeGreaterThan(0);
  });

  it('剧本全链路：挂载→访谈→闸门拍板→游标推进→跳过留痕', async () => {
    // 未挂载时 status 为自由模式
    const before = await wsHttp
      .get(`/_api/projects/${projectId}/playbook`)
      .set(auth())
      .expect(200);
    expect(before.body.data.playbookRef).toBeNull();

    // 挂载：游标拨到首阶段
    const mounted = await wsHttp
      .post(`/_api/projects/${projectId}/playbook/mount`)
      .set(auth())
      .send({ playbookRef: 'software-full-cycle' })
      .expect(201);
    expect(mounted.body.data.currentStage).toBe('research');
    expect(mounted.body.data.stages[0]).toMatchObject({
      key: 'research',
      status: 'active',
    });

    // 必答校验：缺答 400
    await wsHttp
      .post(`/_api/projects/${projectId}/playbook/stages/research/interview`)
      .set(auth())
      .send({ answers: [{ questionId: 'who', answer: '行政同事' }] })
      .expect(400);

    // 完整访谈：产出工件 + 闸门提案 + 人话术语对照
    const submit = await wsHttp
      .post(`/_api/projects/${projectId}/playbook/stages/research/interview`)
      .set(auth())
      .send({
        answers: [
          {
            questionId: 'who',
            answer: '我们公司内部的行政同事，每天要处理报销单',
          },
          { questionId: 'pain', answer: '报销单要贴发票找领导签字，经常弄丢' },
          { questionId: 'success', answer: '报销从 3 天缩短到半天' },
          { questionId: 'scope', answer: '不做手机端' },
        ],
      })
      .expect(201);
    const { documentId, proposalId, mappings } = submit.body.data;
    expect(documentId).toBeTruthy();
    expect(proposalId).toBeTruthy();
    expect(
      mappings.some((m: { term?: string }) => m.term === '目标用户画像'),
    ).toBe(true);

    // 工件已入库为文档
    const doc = await wsHttp
      .get(`/_api/documents/${documentId}`)
      .set(auth())
      .expect(200);
    expect(String(doc.body.data.content)).toContain('人话对照');

    // 闸门进入决策收件箱（gate kind）
    const pending = await wsHttp
      .get('/_api/decisions/pending')
      .set(auth())
      .expect(200);
    const gate = pending.body.data.items.find(
      (i: { kind: string; sourceId: string }) =>
        i.kind === 'gate' && i.sourceId === proposalId,
    );
    expect(gate).toBeTruthy();
    expect(gate.payload.consequences.length).toBeGreaterThan(0);

    // 通过闸门：游标推进到 requirements + 完成事件
    await wsHttp
      .post(`/_api/decisions/proposals/${proposalId}/resolve`)
      .set(auth())
      .send({ action: 'accept' })
      .expect(201);

    const afterGate = await wsHttp
      .get(`/_api/projects/${projectId}/playbook`)
      .set(auth())
      .expect(200);
    const byKey = Object.fromEntries(
      afterGate.body.data.stages.map((s: { key: string }) => [s.key, s]),
    );
    expect(byKey.research).toMatchObject({ status: 'done' });
    expect(byKey.research.documentId).toBe(documentId);
    expect(byKey.requirements).toMatchObject({ status: 'active' });
    expect(afterGate.body.data.currentStage).toBe('requirements');

    // 非当前游标阶段拒绝操作
    await wsHttp
      .post(`/_api/projects/${projectId}/playbook/stages/research/skip`)
      .set(auth())
      .send({ reason: 'x' })
      .expect(400);

    // 跳过当前阶段：留痕并推进
    const skipped = await wsHttp
      .post(`/_api/projects/${projectId}/playbook/stages/requirements/skip`)
      .set(auth())
      .send({ reason: '需求足够简单' })
      .expect(201);
    expect(skipped.body.data).toMatchObject({
      skippedStage: 'requirements',
      currentStage: 'design',
    });

    const afterSkip = await wsHttp
      .get(`/_api/projects/${projectId}/playbook`)
      .set(auth())
      .expect(200);
    const byKey2 = Object.fromEntries(
      afterSkip.body.data.stages.map((s: { key: string }) => [s.key, s]),
    );
    expect(byKey2.requirements).toMatchObject({
      status: 'skipped',
      skippedReason: '需求足够简单',
    });
  });

  it('专长度档位：默认 detailed → suppress → suppressed → reset 恢复', async () => {
    const initial = await wsHttp
      .get('/_api/memory/expertise')
      .set(auth())
      .expect(200);
    expect(
      initial.body.data.domains.map((d: { domain: string }) => d.domain),
    ).toEqual(['requirements', 'technical', 'acceptance', 'process']);

    await wsHttp
      .post('/_api/memory/expertise/feedback')
      .set(auth())
      .send({ domain: 'acceptance', signal: 'suppress' })
      .expect(201);

    const after = await wsHttp
      .get('/_api/memory/expertise')
      .set(auth())
      .expect(200);
    const acceptance = after.body.data.domains.find(
      (d: { domain: string }) => d.domain === 'acceptance',
    );
    expect(acceptance.level).toBe('suppressed');

    await wsHttp
      .post('/_api/memory/expertise/feedback')
      .set(auth())
      .send({ domain: 'acceptance', signal: 'reset' })
      .expect(201);
    const restored = await wsHttp
      .get('/_api/memory/expertise')
      .set(auth())
      .expect(200);
    expect(
      restored.body.data.domains.find(
        (d: { domain: string }) => d.domain === 'acceptance',
      ).level,
    ).toBe('detailed');
  });

  it('dashboard 健康卡：完备度与剧本跳过率派生', async () => {
    const profileHealth = await wsHttp
      .get('/_api/dashboard/profile-health')
      .set(auth())
      .expect(200);
    expect(Array.isArray(profileHealth.body.data.items)).toBe(true);
    const self = profileHealth.body.data.items.find(
      (i: { projectId: string }) => i.projectId === projectId,
    );
    // 本套件在挂载项目内写入了档案原子？至少结构完整
    expect(self).toMatchObject({ filled: expect.any(Number), total: 5 });

    const playbookHealth = await wsHttp
      .get('/_api/dashboard/playbook-health')
      .set(auth())
      .expect(200);
    expect(playbookHealth.body.data.mountedProjects).toBeGreaterThanOrEqual(1);
    const stages = playbookHealth.body.data.stages as Array<{
      stage: string;
      skipped: number;
    }>;
    const req = stages.find((s) => s.stage === 'requirements');
    expect(req?.skipped).toBeGreaterThanOrEqual(1);
  });

  it('决策收件箱聚合与提案端点：summary / 详情 / 创建 clarify 提案', async () => {
    // 决策摘要
    const summary = await wsHttp
      .get('/_api/decisions/summary')
      .set(auth())
      .expect(200);
    expect(summary.body.data).toMatchObject({
      byKind: expect.objectContaining({ proposal: expect.any(Number) }),
    });

    // 人工创建 clarify 提案 → 详情可查 → 驳回留痕
    const created = await wsHttp
      .post('/_api/decisions/proposals')
      .set(auth())
      .send({
        kind: 'clarify',
        title: 'e2e：需要澄清的问题',
        payload: {
          question: 'Q?',
          choices: [{ key: 'a', label: 'A', guess: true }],
        },
        projectId,
      })
      .expect(201);
    const clarifyId = created.body.data.id;
    expect(clarifyId).toBeTruthy();

    const detail = await wsHttp
      .get(`/_api/decisions/proposals/${clarifyId}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data).toMatchObject({
      kind: 'clarify',
      status: 'pending',
    });

    await wsHttp
      .post(`/_api/decisions/proposals/${clarifyId}/resolve`)
      .set(auth())
      .send({ action: 'reject', reason: 'e2e 关闭' })
      .expect(201);

    // 全局仪表盘聚合（七段结构）
    const overview = await wsHttp
      .get('/_api/dashboard/overview')
      .set(auth())
      .expect(200);
    expect(overview.body.data).toMatchObject({
      team: expect.anything(),
      ai: expect.anything(),
    });
  });
});
