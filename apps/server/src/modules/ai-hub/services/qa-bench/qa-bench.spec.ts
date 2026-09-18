/**
 * CAP-C-07 问答质量基线——确定性层（CI 可跑，零真实 LLM 调用）。
 *
 * 三部分：
 * 1. 问题集数据完备性校验（条数 / 八类 × 三问法覆盖 / 期望与夹具不漂移）；
 * 2. 三要素评分器单测（词表行为 / 合格线语义 / 「只复述字段者砍」规则化复现）；
 * 3. 夹具链路断言：构造 prisma stub + 假 adapter 走 AssistantSilentService 的
 *    card-explain 真链路（LLM 通过 AdapterRegistryService 注入 mock，零行为变更），
 *    断言 grounding 事实注入指令、链路输出可被评分器正确打分、实体不存在守卫 400。
 *
 * 真实回答质量由人工终审层承载（采集指引与 rubric 见同目录 README.md）。
 */

import type { Mock } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AssistantSilentService } from '../assistant-silent.service';
import {
  findQaEntry,
  QA_BENCH_ENTRIES,
  QA_ENTITY_TYPES,
  QA_QUESTION_STYLES,
  type QaBenchEntry,
  type QaEntityType,
  type QaQuestionStyle,
} from './qa-bench-questions';
import {
  getByPointer,
  QA_ENTITY_FIXTURES,
  type QaPrismaStub,
} from './qa-bench-fixtures';
import {
  ACTION_SIGNALS,
  BOUNDARY_SIGNALS,
  cardExplainAnswerToText,
  scoreQaAnswer,
  type QaScore,
} from './qa-rubric';

// ── 演示样本（同时作为 README 终审指引的合格样本示例）──────────────────────

/** 八类实体 × 字段查询题的合格样本（grounded+actionable+honest 全过） */
const FIELD_QUERY_GOOD_ANSWERS: Record<QaEntityType, string> = {
  task: '{"title":"登录页迁移新网关","summary":"这是一张进行中的任务卡，属于「Apollo 网关迁移」项目。","details":[{"label":"状态","text":"in_progress，进行中"},{"label":"负责人","text":"小码（AI 同事）"}],"nextStep":"建议盯住旧网关下线时间，验收契约还没建，可以先起草验收标准"}',
  decision:
    '{"title":"登录页迁移拆解提案","summary":"这是一张还没批的决策卡，处于待审状态。","details":[{"label":"状态","text":"pending，等待审批"},{"label":"提案人","text":"小码"}],"nextStep":"建议到决策收件箱批阅这张卡，批过后会按提案建子任务"}',
  member:
    '{"title":"小周","summary":"这是系统内置的 AI 助理成员，当前可用。","details":[{"label":"信任分","text":"80（等级 2）"},{"label":"状态","text":"active"}],"nextStep":"建议可以直接给小周派执行任务，先从低风险任务开始观察信任分变化"}',
  acceptance:
    '{"title":"登录页迁移验收","summary":"这个验收还没通过，审计给了红色风险：有关键标准未达标。","details":[{"label":"审计风险","text":"red，有强阻断项不能交付"},{"label":"卡点","text":"「新网关登录成功并跳转首页」还未验收"}],"nextStep":"建议先让执行方补齐登录链路的验证证据，再重新提交验收"}',
  project:
    '{"title":"Apollo 网关迁移","summary":"这个项目健康度告警：当前有风险，风险等级高。","details":[{"label":"健康状态","text":"at_risk"},{"label":"负责人","text":"老王"}],"nextStep":"建议先盯风险最高的登录切换项，确认回滚预案是否就绪"}',
  team: '{"title":"后端突击队","summary":"这是一个团队卡，协作规则是提交前必须跑质量门禁。","details":[{"label":"协作规则","text":"提交前必须跑质量门禁"},{"label":"状态","text":"active"}],"nextStep":"建议新成员先读团队规则，把门禁脚本在本地配置好再提第一批提交"}',
  'contract-binding':
    '{"title":"AGENTS.md 契约绑定","summary":"这个绑定现在是冲突态：文件在 Git 里被手改了，系统侧没跟上。","details":[{"label":"绑定模式","text":"synced，观察文件手改"},{"label":"冲突态","text":"conflicted，需要人裁决"}],"nextStep":"建议打开契约详情对比两侧差异，人工确认后解决冲突"}',
  document:
    '{"title":"网关迁移需求澄清纪要","summary":"这份文档已经发布，当前是 v3 版。","details":[{"label":"状态","text":"published，已发布"},{"label":"来源","text":"authored，人工撰写"}],"nextStep":"建议把这份纪要作为网关切换验收的对照材料，评审后归档"}',
};

/** task 行动题合格样本（能行动：给事实缺口指下一步） */
const TASK_ACTION_GOOD =
  '{"title":"登录页迁移新网关","summary":"这张卡进行中，但验收契约还没建、也没有截止日期。","details":[{"label":"下一步","text":"先确认旧网关下线时间，再倒排迁移窗口"}],"nextStep":"建议先给这张卡补一条「新网关登录成功」的验收标准，再发起验收"}';

/** task 行动题复述型样本（只复述字段、无行动 → 裁决「只复述字段者砍」应不过线） */
const TASK_ACTION_PARROT =
  '{"title":"登录页迁移新网关","summary":"状态是 in_progress。","details":[],"nextStep":""}';

/** task 边界题守边界样本 vs 编造样本 */
const TASK_BOUNDARY_HONEST =
  '{"title":"登录页迁移新网关","summary":"这张卡没有填截止日期。","details":[{"label":"状态","text":"in_progress"}],"nextStep":"建议在表单里补一个截止日期，或先确认旧网关下线时间再倒排"}';
const TASK_BOUNDARY_FABRICATE =
  '{"title":"登录页迁移新网关","summary":"这张卡的截止日期是 2026-09-20。","details":[],"nextStep":""}';

// ── 链路基建：prisma stub 组装 + 服务构造（LLM 经 AdapterRegistry 注入 mock）──

function buildPrisma(stubs: readonly QaPrismaStub[]): Record<string, unknown> {
  const models: Record<string, Record<string, Mock>> = {};
  for (const { model, method, resolves } of stubs) {
    (models[model] ??= {})[method] = vi.fn().mockResolvedValue(resolves);
  }
  return {
    aIUsageLog: { create: vi.fn().mockResolvedValue({}) },
    ...models,
  };
}

function makeBenchService(
  stubs: readonly QaPrismaStub[],
  chatContent: string,
  stubOverrides: Record<string, unknown> = {},
): { service: AssistantSilentService; chat: Mock } {
  const resolved = stubs.map((stub) => {
    const key = `${stub.model}.${stub.method}`;
    return key in stubOverrides
      ? { ...stub, resolves: stubOverrides[key] }
      : stub;
  });
  const chat = vi.fn().mockResolvedValue({
    content: chatContent,
    model: 'qa-bench-stub',
    tokens: { prompt: 10, completion: 5, total: 15 },
  });
  const service = new AssistantSilentService(
    buildPrisma(resolved) as never,
    {
      listAdapters: () => [{ provider: 'qa-bench', model: 'qa-bench-stub' }],
      getAdapter: () => ({ getProvider: () => 'qa-bench', chat }),
    } as never,
    { estimateCostUsd: vi.fn().mockResolvedValue(null) } as never,
  );
  return { service, chat };
}

/** 按实体+问法取问题集条目（id 约定 = `${entityType}-${questionStyle}`） */
function entryOf(
  entityType: QaEntityType,
  style: QaQuestionStyle,
): QaBenchEntry {
  return findQaEntry(`${entityType}-${style}`);
}

async function runCardExplain(
  entityType: QaEntityType,
  chatContent: string,
  style: QaQuestionStyle = 'field-query',
  stubOverrides: Record<string, unknown> = {},
): Promise<{ data: Record<string, unknown>; chat: Mock }> {
  const fixture = QA_ENTITY_FIXTURES[entityType];
  const { service, chat } = makeBenchService(
    fixture.prismaStubs,
    chatContent,
    stubOverrides,
  );
  const entry = entryOf(entityType, style);
  const result = await service.run(
    'card-explain',
    { entity: fixture.entity, question: entry.question },
    null,
    'qa-user',
  );
  return { data: result.data, chat };
}

function instructionsOf(chat: Mock): string {
  const [, options] = chat.mock.calls[0] as unknown[];
  return (options as { instructions: string }).instructions;
}

// ── 1. 问题集数据完备性 ──────────────────────────────────────────────────────

describe('CAP-C-07 问答质量基线 · 问题集完备性', () => {
  it('条数在 15~25 基线区间', () => {
    expect(QA_BENCH_ENTRIES.length).toBeGreaterThanOrEqual(15);
    expect(QA_BENCH_ENTRIES.length).toBeLessThanOrEqual(25);
  });

  it('条目 id 唯一且符合 `${entityType}-${questionStyle}` 约定', () => {
    const ids = QA_BENCH_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of QA_BENCH_ENTRIES) {
      expect(entry.id).toBe(`${entry.entityType}-${entry.questionStyle}`);
    }
  });

  it('八类实体全覆盖，每类三种问法各至少一条', () => {
    for (const entityType of QA_ENTITY_TYPES) {
      const entries = QA_BENCH_ENTRIES.filter(
        (e) => e.entityType === entityType,
      );
      expect(entries.length, `${entityType} 条目数`).toBeGreaterThanOrEqual(3);
      for (const style of QA_QUESTION_STYLES) {
        expect(
          entries.some((e) => e.questionStyle === style),
          `${entityType} 缺问法 ${style}`,
        ).toBe(true);
      }
    }
  });

  it('期望配置与问法一一对应（字段题配子串 / 行动题配行动 / 边界题配边界）', () => {
    for (const entry of QA_BENCH_ENTRIES) {
      const { mustMentionAny, boundaryExpected, actionExpected } =
        entry.expectation;
      if (entry.questionStyle === 'field-query') {
        expect(mustMentionAny?.length, entry.id).toBeGreaterThan(0);
        expect(boundaryExpected, entry.id).toBeFalsy();
        expect(actionExpected, entry.id).toBeFalsy();
      }
      if (entry.questionStyle === 'next-action') {
        expect(actionExpected, entry.id).toBe(true);
        expect(mustMentionAny, entry.id).toBeUndefined();
        expect(boundaryExpected, entry.id).toBeFalsy();
      }
      if (entry.questionStyle === 'boundary-probe') {
        expect(boundaryExpected, entry.id).toBe(true);
        expect(mustMentionAny, entry.id).toBeUndefined();
        expect(actionExpected, entry.id).toBeFalsy();
      }
    }
  });

  it('期望子串与夹具事实不漂移：每组至少一个子串出现在对应 factsText 中', () => {
    for (const entry of QA_BENCH_ENTRIES) {
      const factsText = JSON.stringify(
        QA_ENTITY_FIXTURES[entry.entityType].expectedFacts,
      );
      for (const group of entry.expectation.mustMentionAny ?? []) {
        expect(
          group.some((token) => factsText.includes(token)),
          `${entry.id} 期望组 (${group.join('/')}) 与夹具事实漂移`,
        ).toBe(true);
      }
    }
  });

  it('grounding 探针与夹具事实不漂移；边界缺口确为 null/缺失', () => {
    for (const entityType of QA_ENTITY_TYPES) {
      const fixture = QA_ENTITY_FIXTURES[entityType];
      const factsText = JSON.stringify(fixture.expectedFacts);
      for (const probe of fixture.groundingProbe) {
        expect(
          factsText.includes(probe),
          `${entityType} grounding 探针「${probe}」不在夹具事实中`,
        ).toBe(true);
      }
      const gap = getByPointer(
        fixture.expectedFacts,
        fixture.boundaryGapPointer,
      );
      expect(
        gap ?? null,
        `${entityType} 边界缺口 ${fixture.boundaryGapPointer} 应为 null/缺失`,
      ).toBeNull();
    }
  });
});

// ── 2. 三要素评分器 ──────────────────────────────────────────────────────────

describe('CAP-C-07 问答质量基线 · 三要素评分器', () => {
  const taskField = entryOf('task', 'field-query');
  const taskAction = entryOf('task', 'next-action');
  const taskBoundary = entryOf('task', 'boundary-probe');
  const taskFactsText = JSON.stringify(QA_ENTITY_FIXTURES.task.expectedFacts);
  const projectFactsText = JSON.stringify(
    QA_ENTITY_FIXTURES.project.expectedFacts,
  );

  it('合格样本三维全过（能行动 + 有依据 + 守边界）', () => {
    const score: QaScore = scoreQaAnswer(
      cardExplainAnswerToText(
        JSON.parse(FIELD_QUERY_GOOD_ANSWERS.task) as Record<string, unknown>,
      ),
      taskField,
      taskFactsText,
    );
    expect(score.actionable.score).toBe(1);
    expect(score.grounded.score).toBe(1);
    expect(score.honest.score).toBe(1);
    expect(score.total).toBe(3);
    expect(score.passed).toBe(true);
  });

  it('「有依据」：组内任一子串命中即算命中（枚举原值或中文译法）', () => {
    const byEnum = scoreQaAnswer(
      '状态是 in_progress，可以放心。',
      taskField,
      taskFactsText,
    );
    const byChinese = scoreQaAnswer(
      '任务正在推进中，状态是「进行中」。',
      taskField,
      taskFactsText,
    );
    expect(byEnum.grounded.score).toBe(1);
    expect(byChinese.grounded.score).toBe(1);
    const missed = scoreQaAnswer(
      '这张卡看起来状态良好。',
      taskField,
      taskFactsText,
    );
    expect(missed.grounded.score).toBe(0);
    expect(missed.missedMentionGroups).toHaveLength(1);
  });

  it('「守边界」：非边界题做日期编造检测——事实外日期记 0，事实内日期不误报', () => {
    const fabricated = scoreQaAnswer(
      '截止日期是 2026-09-20，建议尽快。',
      taskField,
      taskFactsText,
    );
    expect(fabricated.honest.score).toBe(0);
    expect(fabricated.fabricatedDates).toContain('2026-09-20');

    const inFacts = scoreQaAnswer(
      '目标日期是 2026-10-30，建议先盯登录切换项。',
      entryOf('project', 'field-query'),
      projectFactsText,
    );
    expect(inFacts.honest.score).toBe(1);
    expect(inFacts.fabricatedDates).toHaveLength(0);
  });

  it('「守边界」：边界题要求信号词——诚实样本过、编造样本砍', () => {
    const honest = scoreQaAnswer(
      cardExplainAnswerToText(
        JSON.parse(TASK_BOUNDARY_HONEST) as Record<string, unknown>,
      ),
      taskBoundary,
      taskFactsText,
    );
    expect(honest.hitBoundarySignals.length).toBeGreaterThan(0);
    expect(honest.honest.score).toBe(1);
    expect(honest.passed).toBe(true);

    const fabricate = scoreQaAnswer(
      cardExplainAnswerToText(
        JSON.parse(TASK_BOUNDARY_FABRICATE) as Record<string, unknown>,
      ),
      taskBoundary,
      taskFactsText,
    );
    expect(fabricate.hitBoundarySignals).toHaveLength(0);
    expect(fabricate.honest.score).toBe(0);
    expect(fabricate.passed).toBe(false);
  });

  it('「只复述字段者砍」：行动题复述型答案（无行动词、无依据要求）不过三中二线', () => {
    const score = scoreQaAnswer(
      cardExplainAnswerToText(
        JSON.parse(TASK_ACTION_PARROT) as Record<string, unknown>,
      ),
      taskAction,
      taskFactsText,
    );
    expect(score.actionable.score).toBe(0);
    expect(score.grounded.applicable).toBe(false);
    expect(score.honest.score).toBe(1);
    expect(score.total).toBe(1);
    expect(score.passed).toBe(false);
  });

  it('「能行动者留」：行动题合格样本（行动 + 诚实）过线', () => {
    const score = scoreQaAnswer(
      cardExplainAnswerToText(
        JSON.parse(TASK_ACTION_GOOD) as Record<string, unknown>,
      ),
      taskAction,
      taskFactsText,
    );
    expect(score.actionable.score).toBe(1);
    expect(score.honest.score).toBe(1);
    expect(score.passed).toBe(true);
  });

  it('信号词表非空且含口径锚点（与服务端 card-explain 指令的诚实话术对齐）', () => {
    expect(BOUNDARY_SIGNALS).toContain('没有数据');
    expect(BOUNDARY_SIGNALS).toContain('这一点我没有数据');
    expect(BOUNDARY_SIGNALS).toContain('暂无');
    expect(ACTION_SIGNALS).toContain('建议');
    expect(ACTION_SIGNALS).toContain('下一步');
  });
});

// ── 3. 夹具链路（card-explain 真链路 · 零真实 LLM）───────────────────────────

describe('CAP-C-07 问答质量基线 · 夹具链路（card-explain）', () => {
  it.each(QA_ENTITY_TYPES)(
    '%s 卡：grounding 事实注入指令，链路输出经评分器过合格线',
    async (entityType) => {
      const fixture = QA_ENTITY_FIXTURES[entityType];
      const entry = entryOf(entityType, 'field-query');
      const { data, chat } = await runCardExplain(
        entityType,
        FIELD_QUERY_GOOD_ANSWERS[entityType],
      );

      // 「先侦查再开口」：夹具事实注入 instructions（「有依据」的上游确定性）
      const instructions = instructionsOf(chat);
      for (const probe of fixture.groundingProbe) {
        expect(instructions).toContain(probe);
      }
      // 问题原文一并注入
      expect(instructions).toContain(entry.question);

      // 链路端到端：结构化输出 → 展平 → 三要素评分 → 过线
      const score = scoreQaAnswer(
        cardExplainAnswerToText(data),
        entry,
        JSON.stringify(fixture.expectedFacts),
      );
      expect(score.passed).toBe(true);
    },
    20_000,
  );

  it('行动题链路：合格样本过线，复述型样本被砍（裁决规则化的链路复现）', async () => {
    const entry = entryOf('task', 'next-action');
    const fixture = QA_ENTITY_FIXTURES.task;
    const factsText = JSON.stringify(fixture.expectedFacts);

    const good = await runCardExplain('task', TASK_ACTION_GOOD, 'next-action');
    const goodScore = scoreQaAnswer(
      cardExplainAnswerToText(good.data),
      entry,
      factsText,
    );
    expect(goodScore.passed).toBe(true);

    const parrot = await runCardExplain(
      'task',
      TASK_ACTION_PARROT,
      'next-action',
    );
    const parrotScore = scoreQaAnswer(
      cardExplainAnswerToText(parrot.data),
      entry,
      factsText,
    );
    expect(parrotScore.passed).toBe(false);
  });

  it('边界题链路：守边界样本过线，编造日期样本被砍', async () => {
    const entry = entryOf('task', 'boundary-probe');
    const fixture = QA_ENTITY_FIXTURES.task;
    const factsText = JSON.stringify(fixture.expectedFacts);

    const honest = await runCardExplain(
      'task',
      TASK_BOUNDARY_HONEST,
      'boundary-probe',
    );
    const honestScore = scoreQaAnswer(
      cardExplainAnswerToText(honest.data),
      entry,
      factsText,
    );
    expect(honestScore.passed).toBe(true);

    const fabricate = await runCardExplain(
      'task',
      TASK_BOUNDARY_FABRICATE,
      'boundary-probe',
    );
    const fabricateScore = scoreQaAnswer(
      cardExplainAnswerToText(fabricate.data),
      entry,
      factsText,
    );
    expect(fabricateScore.passed).toBe(false);
  });

  it('边界探测题全部有明确的夹具缺口（每类 boundaryGapPointer 对准 null/缺失）', () => {
    for (const entry of QA_BENCH_ENTRIES.filter(
      (e) => e.questionStyle === 'boundary-probe',
    )) {
      const fixture = QA_ENTITY_FIXTURES[entry.entityType];
      expect(
        getByPointer(fixture.expectedFacts, fixture.boundaryGapPointer),
      ).toBeFalsy();
    }
  });

  it('实体不存在 → 400 且不触 LLM（服务端守边界的确定性基座）', async () => {
    const fixture = QA_ENTITY_FIXTURES.decision;
    const { service, chat } = makeBenchService(
      fixture.prismaStubs,
      FIELD_QUERY_GOOD_ANSWERS.decision,
      { 'decisionProposal.findUnique': null },
    );
    await expect(
      service.run(
        'card-explain',
        { entity: fixture.entity, question: '这个提案批了没有？' },
        null,
        'qa-user',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(chat).not.toHaveBeenCalled();
  });

  it('问题集条目与八类实体一一对应（无孤儿条目/缺位夹具）', () => {
    const covered = new Set(QA_BENCH_ENTRIES.map((e) => e.entityType));
    expect([...covered].sort()).toEqual([...QA_ENTITY_TYPES].sort());
  });
});
