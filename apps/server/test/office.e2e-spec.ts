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
import { createMemberFixture, createProjectFixture } from './helpers/fixtures';

/**
 * 办公室聚合（AI 同事化 · 候选 C）全链路（不触 LLM）：
 * 员工卡聚合（忙闲派生 / 待决归因 / 可接活度）+ 项目域过滤 + blocking 翻转。
 */
describe('Office (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Office e2e');
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

  it('员工卡聚合：忙闲派生 + 待决归因 + 可接活度 + 项目域过滤', async () => {
    const projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'Office E2E Project',
    );
    const coder = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '小码',
      'ai_agent',
    );
    const reviewer = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '阿审',
      'ai_agent',
    );
    // 第三个 AI 成员不入项目：项目域不应出现
    const outsider = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '局外人',
      'ai_agent',
    );

    await ws.db.memberProjectBinding.createMany({
      data: [
        { memberId: coder.id, projectId, role: 'member' },
        { memberId: reviewer.id, projectId, role: 'member' },
      ],
    });

    // 小码：一条在途执行（working）+ 一条本周已计费执行 + 一条其名下待决提案（advisory）
    await ws.db.executionRun.create({
      data: {
        projectId,
        subjectType: 'platform_ai_member',
        subjectId: coder.id,
        identitySource: 'cli',
        goal: '实现办公室接口',
        status: 'in_progress',
        startedAt: new Date(),
      },
    });
    await ws.db.executionRun.create({
      data: {
        projectId,
        subjectType: 'platform_ai_member',
        subjectId: coder.id,
        identitySource: 'cli',
        goal: '昨日已完成',
        status: 'completed',
        totalTokens: 1200,
        totalCost: 0.4,
        completedAt: new Date(),
      },
    });
    await ws.db.decisionProposal.create({
      data: {
        kind: 'plan',
        projectId,
        title: '拆分办公室模块为三批',
        payload: { reason: 'e2e' },
        status: 'pending',
        proposerType: 'ai_agent',
        proposerId: coder.id,
      },
    });

    // 阿审：无任何在途/待决 → idle
    const summaryRes = await wsHttp
      .get('/_api/office/summary')
      .set(auth())
      .expect(200);
    const all = summaryRes.body.data;
    // 工作区全域：三个夹具 AI 成员都在（模板库另有内置系统助手小周）
    const allIds = all.colleagues.map((c: { memberId: string }) => c.memberId);
    expect(allIds).toContain(coder.id);
    expect(allIds).toContain(reviewer.id);
    expect(allIds).toContain(outsider.id);
    expect(all.totals.colleagues).toBe(all.colleagues.length);

    const projectRes = await wsHttp
      .get('/_api/office/summary')
      .query({ projectId })
      .set(auth())
      .expect(200);
    const summary = projectRes.body.data;
    expect(summary.projectId).toBe(projectId);
    expect(summary.colleagues).toHaveLength(2);

    const coderCard = summary.colleagues.find(
      (c: { memberId: string }) => c.memberId === coder.id,
    );
    expect(coderCard.status).toBe('working');
    expect(coderCard.currentRun).toMatchObject({
      goal: '实现办公室接口',
      status: 'in_progress',
    });
    // 在途 1/5 → 20%；本周成本只算 completed 那 条
    expect(coderCard.capacity).toMatchObject({
      activeRuns: 1,
      capacityLimit: 5,
      loadPct: 20,
      weeklyCostUsd: 0.4,
      acceptability: 'available',
    });
    expect(coderCard.advisory).toBe(1);
    expect(coderCard.blocking).toBe(0);

    const reviewerCard = summary.colleagues.find(
      (c: { memberId: string }) => c.memberId === reviewer.id,
    );
    expect(reviewerCard.status).toBe('idle');
    // working 卡排在 idle 之前
    expect(summary.colleagues[0].memberId).toBe(coder.id);
    expect(summary.totals.working).toBe(1);
  });

  it('pending 审批把成员翻转为 needYou（blocking 归因到执行主体）', async () => {
    const projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'Office Blocking Project',
    );
    const coder = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '小堵',
      'ai_agent',
    );
    await ws.db.memberProjectBinding.create({
      data: { memberId: coder.id, projectId, role: 'member' },
    });
    const run = await ws.db.executionRun.create({
      data: {
        projectId,
        subjectType: 'platform_ai_member',
        subjectId: coder.id,
        identitySource: 'cli',
        goal: '高危写操作',
        status: 'pending_approval',
        startedAt: new Date(),
      },
    });
    await ws.db.approvalRequest.create({
      data: {
        executionRunId: run.id,
        projectId,
        requestedAction: 'git_push',
        actionType: 'git_write',
        riskLevel: 'high_risk',
        reason: 'e2e',
        status: 'pending',
      },
    });

    const res = await wsHttp
      .get('/_api/office/summary')
      .query({ projectId })
      .set(auth())
      .expect(200);
    const card = res.body.data.colleagues[0];
    expect(card.status).toBe('needYou');
    expect(card.blocking).toBe(1);
    expect(res.body.data.totals.needYou).toBe(1);
    expect(res.body.data.totals.blocking).toBe(1);
  });
});
