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
import {
  createMemberFixture,
  createProjectFixture,
} from './helpers/fixtures';

/**
 * 接口协作卡（交接试点）金路径（不触 LLM）：
 * 请求 → 承诺 → 交付 → 打回 → 再交付 → 验证关闭；
 * 澄清 2 轮超限自动升级（escalated + clarify 提案落 decisions）。
 */
describe('Collaboration (e2e)', () => {
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

    ws = createIsolatedWorkspace('Collaboration e2e');
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

  it('金路径：请求→承诺→交付→打回→再交付→验证关闭', async () => {
    const projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'Collab E2E Project',
    );
    const feWorker = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '前端 AI',
      'ai_agent',
    );
    const beWorker = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '后端 AI',
      'ai_agent',
    );

    // ① 请求方发起"接口协作卡"（结构化负载，不是小作文）
    const created = await wsHttp
      .post('/_api/collaboration')
      .set(auth())
      .send({
        projectId,
        title: '需要 POST /api/exports 导出端点',
        requesterMemberId: feWorker.id,
        providerMemberId: beWorker.id,
        payload: {
          endpointShape: 'POST /exports { format: csv|xlsx } → 202',
          sourceFlow: '列表页导出按钮 → 导出中心',
          targetSpec: 'openapi.json paths.exports',
          relatedCode: 'apps/frontend/src/modules/export',
          acceptance: '契约测试绿 + 消费 client 联调通过',
        },
      })
      .expect(201);
    const cardId = created.body.data.id;
    expect(created.body.data.status).toBe('requested');
    expect(created.body.data.providerName).toBe('后端 AI');
    expect(created.body.data.events).toHaveLength(1);

    // ② 提供方侦察后承诺
    const committed = await wsHttp
      .patch(`/_api/collaboration/${cardId}/respond`)
      .set(auth())
      .send({ decision: 'committed', note: '容量可接，3 天内交付' })
      .expect(200);
    expect(committed.body.data.status).toBe('committed');

    // ③ 交付
    const delivered = await wsHttp
      .patch(`/_api/collaboration/${cardId}/deliver`)
      .set(auth())
      .send({ note: 'spec 已改 + 实现完成 + 契约测试绿' })
      .expect(200);
    expect(delivered.body.data.status).toBe('delivered');

    // ④ 请求方验证：打回（消费 mock 联调失败）
    const changesRequested = await wsHttp
      .patch(`/_api/collaboration/${cardId}/verify`)
      .set(auth())
      .send({ verdict: 'changes_requested', note: '分页参数与契约不符' })
      .expect(200);
    expect(changesRequested.body.data.status).toBe('in_progress');

    // ⑤ 再交付 → 契约绿 → 关闭
    await wsHttp
      .patch(`/_api/collaboration/${cardId}/deliver`)
      .set(auth())
      .send({ note: '已修正分页参数' })
      .expect(200);
    const verified = await wsHttp
      .patch(`/_api/collaboration/${cardId}/verify`)
      .set(auth())
      .send({ verdict: 'verified', note: '契约测试绿，联调通过' })
      .expect(200);
    expect(verified.body.data.status).toBe('verified');
    expect(verified.body.data.events).toHaveLength(6);

    // 流转日志完整（每步都是事件）
    const detail = await wsHttp
      .get(`/_api/collaboration/${cardId}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.events.map((e: { status: string }) => e.status)).toEqual([
      'requested',
      'committed',
      'delivered',
      'in_progress',
      'delivered',
      'verified',
    ]);
  });

  it('澄清 2 轮超限自动升级（escalated + clarify 提案落 decisions）', async () => {
    const projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'Collab Escalate Project',
    );
    const feWorker = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '前端 AI2',
      'ai_agent',
    );
    const beWorker = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '后端 AI2',
      'ai_agent',
    );
    const created = await wsHttp
      .post('/_api/collaboration')
      .set(auth())
      .send({
        projectId,
        title: '需要分页约定的批量查询端点',
        requesterMemberId: feWorker.id,
        providerMemberId: beWorker.id,
        payload: { endpointShape: 'GET /exports?page=' },
      })
      .expect(201);
    const cardId = created.body.data.id;

    // 两轮澄清：rounds 1 → 2
    await wsHttp
      .patch(`/_api/collaboration/${cardId}/respond`)
      .set(auth())
      .send({ decision: 'clarify', note: '导出量级多大？' })
      .expect(200);
    const second = await wsHttp
      .patch(`/_api/collaboration/${cardId}/respond`)
      .set(auth())
      .send({ decision: 'clarify', note: '同步还是异步？' })
      .expect(200);
    expect(second.body.data.status).toBe('requested');
    expect(second.body.data.rounds).toBe(2);

    // 第三轮澄清请求 → 超限升级
    const escalated = await wsHttp
      .patch(`/_api/collaboration/${cardId}/respond`)
      .set(auth())
      .send({ decision: 'clarify', note: '格式还有疑问' })
      .expect(200);
    expect(escalated.body.data.status).toBe('escalated');

    // decisions 收件箱收到 clarify 提案（人拍板）
    const proposals = await ws.db.decisionProposal.findMany({
      where: { projectId, kind: 'clarify' },
    });
    expect(proposals).toHaveLength(1);
    expect(proposals[0].title).toContain('协作卡澄清超限');

    // escalated 后人工裁决恢复流转：交付 → 验证
    await wsHttp
      .patch(`/_api/collaboration/${cardId}/deliver`)
      .set(auth())
      .send({ note: '人工拍板：同步导出' })
      .expect(200);
    await wsHttp
      .patch(`/_api/collaboration/${cardId}/verify`)
      .set(auth())
      .send({ verdict: 'verified' })
      .expect(200);
  });

  it('非法流转 400：requested 直接交付被拒', async () => {
    const projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'Collab Invalid Project',
    );
    const feWorker = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '前端 AI3',
      'ai_agent',
    );
    const beWorker = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      '后端 AI3',
      'ai_agent',
    );
    const created = await wsHttp
      .post('/_api/collaboration')
      .set(auth())
      .send({
        projectId,
        title: '非法流转测试卡',
        requesterMemberId: feWorker.id,
        providerMemberId: beWorker.id,
        payload: {},
      })
      .expect(201);
    await wsHttp
      .patch(`/_api/collaboration/${created.body.data.id}/deliver`)
      .set(auth())
      .send({})
      .expect(400);
    // 双方同一成员 400
    await wsHttp
      .post('/_api/collaboration')
      .set(auth())
      .send({
        projectId,
        title: '同一成员测试卡',
        requesterMemberId: feWorker.id,
        providerMemberId: feWorker.id,
        payload: {},
      })
      .expect(400);
  });
});
