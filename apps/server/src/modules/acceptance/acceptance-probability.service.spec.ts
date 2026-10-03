import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptanceProbabilityService } from './acceptance-probability.service';

/** CAP-A-27 扩展批二：验收标准预估达成概率（advisory 展示位 + 内容指纹缓存） */

function buildCriteria(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cr1',
    acceptanceId: 'acc1',
    criteriaType: 'functional',
    content: '用户可以登录',
    status: 'pending',
    severity: 'medium',
    revision: 1,
    metadata: null,
    evidences: [{ evidenceType: 'ci_result' }] as Array<
      Record<string, unknown>
    >,
    ...overrides,
  };
}

function buildDeps({
  criteria = [buildCriteria()],
  judgeResult,
}: {
  criteria?: Array<Record<string, unknown>>;
  judgeResult?: Record<string, unknown> | null;
}) {
  const updates: Array<Record<string, any>> = [];
  const prisma = {
    acceptanceCriteria: {
      findMany: vi.fn(async () => criteria),
      update: vi.fn(async ({ data }: any) => {
        updates.push(data);
        return data;
      }),
    },
  };
  const quickJudge = {
    judge: vi.fn(async () => judgeResult ?? null),
  };
  const logger = { setContext: vi.fn(), warn: vi.fn(), log: vi.fn() };
  const service = new AcceptanceProbabilityService(
    prisma as any,
    quickJudge as any,
    logger as any,
  );
  return { service, prisma, quickJudge, updates };
}

const JUDGE_RESULT = {
  scenario: 'acceptance_probability',
  model: 'jev-1.13-free',
  answers: {
    cr1: { type: 'score', score: 7.2, confidence: 0.88 },
  },
  usage: { inputTokens: 100, outputTokens: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AcceptanceProbabilityService', () => {
  it('第二轮同内容判定 → 指纹命中缓存不调 judge（面板可反复打开）', async () => {
    const { service, quickJudge, updates } = buildDeps({
      judgeResult: JUDGE_RESULT,
    });

    // 第一轮：真判 + 回写指纹
    await service.judgeAcceptance({ acceptanceId: 'acc1' });
    expect(quickJudge.judge).toHaveBeenCalledTimes(1);
    const fingerprint = updates[0].metadata.acceptanceProbability
      .fingerprint as string;

    // 第二轮：同一 criteria 带上回写的缓存 → 零调用
    const cached = buildCriteria({
      metadata: {
        acceptanceProbability: {
          fingerprint,
          probability: 80,
          confidence: 0.88,
          model: 'jev-1.13-free',
        },
      },
    });
    const round2 = buildDeps({ criteria: [cached] });
    const res2 = await round2.service.judgeAcceptance({ acceptanceId: 'acc1' });

    expect(round2.quickJudge.judge).not.toHaveBeenCalled();
    expect(res2.items[0]).toEqual({
      criteriaId: 'cr1',
      probability: 80,
      confidence: 0.88,
      cached: true,
      model: 'jev-1.13-free',
    });
  });

  it('judge 成功 → score 0-9 折算 0-100 + 回写 metadata（合并不覆盖）', async () => {
    const { service, quickJudge, updates } = buildDeps({
      criteria: [buildCriteria({ metadata: { otherKey: 'keep' } })],
      judgeResult: JUDGE_RESULT,
    });

    const res = await service.judgeAcceptance({ acceptanceId: 'acc1' });

    expect(quickJudge.judge).toHaveBeenCalledTimes(1);
    const [scenario, state, questions] = (quickJudge.judge as any).mock
      .calls[0];
    expect(scenario).toBe('acceptance_probability');
    expect(state).toContain('用户可以登录');
    expect(state).toContain('ci_result×1');
    expect(questions[0].id).toBe('cr1');
    expect(questions[0].type).toBe('score');

    expect(res.items[0]).toMatchObject({
      criteriaId: 'cr1',
      probability: 80, // 7.2×100/9 = 80
      confidence: 0.88,
      cached: false,
      model: 'jev-1.13-free',
    });

    expect(updates).toHaveLength(1);
    expect(updates[0].metadata.otherKey).toBe('keep');
    expect(updates[0].metadata.acceptanceProbability.probability).toBe(80);
    expect(updates[0].metadata.acceptanceProbability.fingerprint).toBeTruthy();
  });

  it('judge null（通道不可用/场景禁用）→ probability null 且零回写（advisory 纪律）', async () => {
    const { service, updates } = buildDeps({ judgeResult: null });

    const res = await service.judgeAcceptance({ acceptanceId: 'acc1' });

    expect(res.items[0]).toEqual({
      criteriaId: 'cr1',
      probability: null,
      confidence: null,
      cached: false,
    });
    expect(updates).toHaveLength(0);
  });

  it('指纹随证据变化失效：metadata 缓存的旧指纹与新证据态不一致 → 重新判', async () => {
    const cached = buildCriteria({
      metadata: {
        acceptanceProbability: {
          fingerprint: 'stale-fingerprint',
          probability: 90,
          confidence: 0.9,
        },
      },
    });
    const { service, quickJudge } = buildDeps({
      criteria: [cached],
      judgeResult: JUDGE_RESULT,
    });

    const res = await service.judgeAcceptance({ acceptanceId: 'acc1' });

    expect(quickJudge.judge).toHaveBeenCalledTimes(1);
    expect(res.items[0].cached).toBe(false);
    expect(res.items[0].probability).toBe(80);
  });

  it('批量护栏：超过 40 条截断判前 40 条，其余回 null', async () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      buildCriteria({ id: `cr${i}`, content: `标准${i}` }),
    );
    const answers = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [
        `cr${i}`,
        { type: 'score', score: 5, confidence: 0.7 },
      ]),
    );
    const { service, quickJudge } = buildDeps({
      criteria: many,
      judgeResult: { ...JUDGE_RESULT, answers },
    });

    const res = await service.judgeAcceptance({ acceptanceId: 'acc1' });

    expect(res.items).toHaveLength(45);
    const questions = (quickJudge.judge as any).mock.calls[0][2];
    expect(questions).toHaveLength(40);
    expect(res.items[44].probability).toBeNull();
  });
});
