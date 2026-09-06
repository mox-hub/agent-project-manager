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
import { createProjectFixture } from './helpers/fixtures';

/**
 * 记忆 Store B 全链路（不触 LLM）：
 * note 去重合并 → recall 命中保鲜与 scope 隔离 → brief → 人可改/软删。
 */
describe('Memory (e2e)', () => {
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

    ws = createIsolatedWorkspace('Memory e2e');
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

  it('写入→去重→召回→brief→修改→软删 全生命周期', async () => {
    const projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'Memory E2E Project',
    );

    // 写入两条（项目域）+ 一条 global
    await wsHttp
      .post('/_api/memory')
      .set(auth())
      .send({
        projectId,
        type: 'preference',
        content: '用户喜欢先看风险再看排期',
      })
      .expect(201);
    const dup = await wsHttp
      .post('/_api/memory')
      .set(auth())
      .send({
        projectId,
        type: 'preference',
        content: '用户喜欢先看风险再看排期',
        confidence: 0.95,
      })
      .expect(201);
    // 去重：同一原子提升置信度而非重复插入
    expect(dup.body.data.confidence).toBe(0.95);
    await wsHttp
      .post('/_api/memory')
      .set(auth())
      .send({ type: 'conclusion', content: '全局约定：接口用 REST 风格' })
      .expect(201);

    // 项目域召回可带 global，含关键词过滤
    const recall = await wsHttp
      .get('/_api/memory/recall')
      .query({ projectId, query: '风险' })
      .set(auth())
      .expect(200);
    expect(recall.body.data).toHaveLength(1);
    expect(recall.body.data[0].content).toContain('风险');
    const atomId = recall.body.data[0].id;
    // 命中保鲜是旁路（hits 异步递增），轮询等它落库
    const deadline = Date.now() + 5000;
    let hits = 0;
    while (Date.now() < deadline) {
      const row = await ws.db.memoryAtom.findUnique({ where: { id: atomId } });
      hits = row?.hits ?? 0;
      if (hits >= 1 && row?.lastUsedAt) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect(hits).toBeGreaterThanOrEqual(1);

    // scope 隔离：全局召回看不到项目记忆
    const globalRecall = await wsHttp
      .get('/_api/memory/recall')
      .set(auth())
      .expect(200);
    expect(
      globalRecall.body.data.map((m: { content: string }) => m.content),
    ).toEqual(['全局约定：接口用 REST 风格']);

    // brief
    const brief = await wsHttp
      .get('/_api/memory/brief')
      .query({ projectId })
      .set(auth())
      .expect(200);
    expect(brief.body.data.scope).toBe(`project:${projectId}`);
    expect(brief.body.data.counts.working).toBe(1);

    // 钉住 → brief.pinned
    await wsHttp
      .patch(`/_api/memory/${atomId}`)
      .set(auth())
      .send({ pinned: true })
      .expect(200);
    const briefPinned = await wsHttp
      .get('/_api/memory/brief')
      .query({ projectId })
      .set(auth())
      .expect(200);
    expect(
      briefPinned.body.data.pinned.map((p: { id: string }) => p.id),
    ).toEqual([atomId]);

    // 软删：列表不再出现
    await wsHttp.delete(`/_api/memory/${atomId}`).set(auth()).expect(200);
    const list = await wsHttp
      .get('/_api/memory')
      .query({ projectId })
      .set(auth())
      .expect(200);
    expect(list.body.data.total).toBe(0);
  });
});
