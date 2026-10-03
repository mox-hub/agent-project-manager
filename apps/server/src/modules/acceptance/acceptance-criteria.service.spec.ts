import { NotFoundException } from '@nestjs/common';
import {
  AcceptanceCriteriaService,
  isEvidenceCurrent,
} from './acceptance-criteria.service';

/** CAP-B-01 验收标准版本化：修订即失效 + 证据 revision 快照 + 有效性判定 */

function buildPrisma() {
  const state = {
    criteria: null as Record<string, any> | null,
    updated: null as Record<string, any> | null,
    createdEvidences: [] as Array<Record<string, any>>,
  };

  const prisma = {
    acceptanceCriteria: {
      findUnique: vi.fn(async () => state.criteria),
      update: vi.fn(async ({ where, data }: any) => {
        state.updated = { ...state.criteria, id: where.id, ...data };
        return state.updated;
      }),
    },
    acceptanceEvidence: {
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        const row = { id: `ev-${state.createdEvidences.length + 1}`, ...data };
        state.createdEvidences.push(row);
        return row;
      }),
    },
  };

  return { prisma, state };
}

function makeCriteria(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    acceptanceId: 'acc1',
    criteriaType: 'functional',
    category: null,
    content: '导出文件格式为 xlsx',
    source: 'manual',
    weight: 1,
    status: 'passed',
    severity: 'high',
    order: 0,
    revision: 1,
    revisedAt: null,
    passedAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  };
}

describe('AcceptanceCriteriaService.update 修订即失效（CAP-B-01）', () => {
  it('修改 content → revision+1、revisedAt 落时间、status 重置 pending、passedAt 清空', async () => {
    const { prisma, state } = buildPrisma();
    state.criteria = makeCriteria();
    const service = new AcceptanceCriteriaService(
      prisma as any,
      { setContext: vi.fn() } as any,
      { judge: vi.fn(async () => null) } as any,
    );

    const updated = await service.update('c1', { content: '导出格式改为 csv' });

    expect(updated.revision).toBe(2);
    expect(updated.revisedAt).toBeInstanceOf(Date);
    expect(updated.status).toBe('pending');
    expect(updated.passedAt).toBeNull();
    expect(updated.content).toBe('导出格式改为 csv');
  });

  it('修改 content 时同请求携带 status → 修订失效优先，忽略状态直写且不落人工判定证据', async () => {
    const { prisma, state } = buildPrisma();
    state.criteria = makeCriteria();
    const service = new AcceptanceCriteriaService(
      prisma as any,
      { setContext: vi.fn() } as any,
      { judge: vi.fn(async () => null) } as any,
    );

    const updated = await service.update('c1', {
      content: '修订后的标准',
      status: 'passed',
    });

    expect(updated.status).toBe('pending');
    expect(updated.revision).toBe(2);
    expect(state.createdEvidences).toHaveLength(0);
  });

  it('传入相同 content → 不触发修订（revision 不变）', async () => {
    const { prisma, state } = buildPrisma();
    state.criteria = makeCriteria();
    const service = new AcceptanceCriteriaService(
      prisma as any,
      { setContext: vi.fn() } as any,
      { judge: vi.fn(async () => null) } as any,
    );

    const updated = await service.update('c1', {
      content: '导出文件格式为 xlsx',
    });

    expect(updated.revision).toBe(1);
    expect(updated.revisedAt).toBeNull();
  });

  it('仅改 severity/order 等元属性 → 不触发修订', async () => {
    const { prisma, state } = buildPrisma();
    state.criteria = makeCriteria();
    const service = new AcceptanceCriteriaService(
      prisma as any,
      { setContext: vi.fn() } as any,
      { judge: vi.fn(async () => null) } as any,
    );

    const updated = await service.update('c1', {
      severity: 'critical',
      order: 5,
    });

    expect(updated.revision).toBe(1);
    expect(updated.revisedAt).toBeNull();
    expect(updated.severity).toBe('critical');
  });

  it('status=passed（无 content 修订）→ passedAt 落时间并自动落带版本快照的人工判定证据', async () => {
    const { prisma, state } = buildPrisma();
    state.criteria = makeCriteria({ status: 'pending', passedAt: null });
    const service = new AcceptanceCriteriaService(
      prisma as any,
      { setContext: vi.fn() } as any,
      { judge: vi.fn(async () => null) } as any,
    );

    const updated = await service.update('c1', { status: 'passed' }, 'u1');

    expect(updated.revision).toBe(1);
    expect(updated.passedAt).toBeInstanceOf(Date);
    expect(state.createdEvidences).toHaveLength(1);
    expect(state.createdEvidences[0]).toMatchObject({
      criteriaId: 'c1',
      evidenceType: 'human_approval',
      submittedBy: 'u1',
      criteriaRevision: 1,
    });
  });

  it('标准不存在 → NotFoundException', async () => {
    const { prisma } = buildPrisma();
    const service = new AcceptanceCriteriaService(
      prisma as any,
      { setContext: vi.fn() } as any,
      { judge: vi.fn(async () => null) } as any,
    );
    await expect(service.update('missing', { content: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('AcceptanceCriteriaService.addEvidence 证据版本快照（CAP-B-01）', () => {
  it('创建证据时快照当前标准 revision', async () => {
    const { prisma, state } = buildPrisma();
    state.criteria = makeCriteria({ revision: 3 });
    const service = new AcceptanceCriteriaService(
      prisma as any,
      { setContext: vi.fn() } as any,
      { judge: vi.fn(async () => null) } as any,
    );

    await service.addEvidence(
      'c1',
      { evidenceType: 'test_result', content: '全量用例通过' },
      'u1',
    );

    expect(state.createdEvidences[0].criteriaRevision).toBe(3);
  });
});

describe('isEvidenceCurrent 有效性判定口径（CAP-B-01）', () => {
  it('存量证据无快照（null）按初版 1 处理：对 revision=1 有效，对 revision=2 待复核', () => {
    expect(isEvidenceCurrent({ criteriaRevision: null }, 1)).toBe(true);
    expect(isEvidenceCurrent({}, 1)).toBe(true);
    expect(isEvidenceCurrent({ criteriaRevision: null }, 2)).toBe(false);
  });

  it('快照与当前 revision 一致 → 有效；落后 → 待复核', () => {
    expect(isEvidenceCurrent({ criteriaRevision: 2 }, 2)).toBe(true);
    expect(isEvidenceCurrent({ criteriaRevision: 1 }, 2)).toBe(false);
  });
});

/** CAP-A-27 P0-B：AI 证据预审 advisory——落 model_evaluation 证据、防重、降级零写入 */
describe('AcceptanceCriteriaService.runAiEvidencePrecheck（CAP-A-27）', () => {
  const JUDGE_OK = {
    scenario: 'evidence_precheck',
    model: 'jev-1.13-free',
    answers: {
      verdict: {
        type: 'choice',
        choice: 'passed',
        confidence: 0.99,
        probabilities: { passed: 0.9, failed: 0.05, unclear: 0.05 },
      },
      evidence_sufficient: { type: 'noul', noul: 0.88 },
    },
    usage: { inputTokens: 200, outputTokens: 30 },
  };

  function buildPrecheckPrisma(
    opts: { existing?: Array<Record<string, any>> } = {},
  ) {
    const existingPrechecks = [...(opts.existing ?? [])];
    const created: Array<Record<string, any>> = [];
    const prisma = {
      acceptanceCriteria: {
        findUnique: vi.fn(async () =>
          makeCriteria({ content: '关键接口响应时间 < 200ms', revision: 2 }),
        ),
      },
      acceptanceEvidence: {
        findMany: vi.fn(async () => existingPrechecks),
        create: vi.fn(async ({ data }: any) => {
          const row = { id: `ev-${created.length + 1}`, ...data };
          created.push(row);
          return row;
        }),
      },
    };
    const quickJudge = { judge: vi.fn(async () => JUDGE_OK) };
    const service = new AcceptanceCriteriaService(
      prisma as any,
      { setContext: vi.fn(), log: vi.fn() } as any,
      quickJudge as any,
    );
    return { service, prisma, created, quickJudge, existingPrechecks };
  }

  it('judge 成功 → 落 model_evaluation 证据（advisory + 版本快照 + 置信度 metadata）', async () => {
    const { service, created } = buildPrecheckPrisma();

    await service.runAiEvidencePrecheck('c1', {
      evidenceType: 'ci_result',
      content: 'build:success:abc123',
    });

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      criteriaId: 'c1',
      evidenceType: 'model_evaluation',
      content: 'AI 预审：passed',
      criteriaRevision: 2,
    });
    expect(created[0].metadata).toMatchObject({
      advisory: true,
      precheckKey: 'ci_result:build:success:abc123',
      confidence: 0.99,
      evidenceSufficient: 0.88,
      model: 'jev-1.13-free',
    });
  });

  it('防重：已有同 precheckKey 的预审 → 跳过不重复落', async () => {
    const { service, created } = buildPrecheckPrisma({
      existing: [
        {
          id: 'ev0',
          metadata: { precheckKey: 'ci_result:build:success:abc123' },
        },
      ],
    });

    await service.runAiEvidencePrecheck('c1', {
      evidenceType: 'ci_result',
      content: 'build:success:abc123',
    });

    expect(created).toHaveLength(0);
  });

  it('judge 返回 null（未启用/失败）→ 零写入不抛', async () => {
    const { service, created, quickJudge } = buildPrecheckPrisma();
    (quickJudge.judge as ReturnType<typeof vi.fn>).mockImplementation(
      async () => null,
    );

    await expect(
      service.runAiEvidencePrecheck('c1', {
        evidenceType: 'ci_result',
        content: 'x',
      }),
    ).resolves.toBeUndefined();
    expect(created).toHaveLength(0);
  });

  it('judge 返回畸形 answers（verdict 无效）→ 零写入', async () => {
    const { service, created, quickJudge } = buildPrecheckPrisma();
    (quickJudge.judge as ReturnType<typeof vi.fn>).mockImplementation(
      async () => ({
        ...JUDGE_OK,
        answers: {
          verdict: { type: 'noul', noul: 0.5 },
          evidence_sufficient: { type: 'noul', noul: 0.5 },
        },
      }),
    );

    await service.runAiEvidencePrecheck('c1', {
      evidenceType: 'ci_result',
      content: 'x',
    });

    expect(created).toHaveLength(0);
  });
});
