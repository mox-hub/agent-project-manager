import { TrustService } from './trust.service';
import { PR_OUTCOME_DELTAS } from '@/modules/integration/providers/github/github.constants';

/** 信任档案与评估管道单测（内存桩）：档案 CRUD、三层评估、等级升降、跨项目迁移、PR outcome 注入 */

function buildPrisma() {
  const state = {
    appConfigs: [] as Array<Record<string, any>>,
    memberUpdates: [] as Record<string, any>,
    idSeq: 0,
  };

  const prisma = {
    appConfig: {
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { key: string; projectId?: string | null };
        }) =>
          state.appConfigs.find(
            (c) => c.key === where.key && c.projectId === where.projectId,
          ) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, any> }) => {
        const row = { ...data, id: `cfg-${++state.idSeq}` };
        state.appConfigs.push(row);
        return row;
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const found = state.appConfigs.find((c) => c.id === where.id);
          if (!found) throw new Error(`appConfig ${where.id} not found`);
          Object.assign(found, data);
          return found;
        },
      ),
    },
    member: {
      updateMany: jest.fn(async (args: Record<string, any>) => {
        state.memberUpdates.push(args);
        return { count: 0 };
      }),
    },
  };

  return { prisma, state };
}

function buildBus() {
  const events: { type: string; payload?: unknown }[] = [];
  const bus = {
    publish: jest.fn((type: string, payload?: unknown) => {
      events.push({ type, payload });
    }),
  };
  return { bus, events };
}

function buildService() {
  const { prisma, state } = buildPrisma();
  const { bus, events } = buildBus();
  const service = new TrustService(prisma as any, bus as any);
  return { service, state, events };
}

const defaultProfileValue = (agentId: string, projectId?: string) => ({
  agentId,
  projectId,
  trustScore: 50,
  trustLevel: 1,
  totalEvaluations: 0,
  successfulEvaluations: 0,
  averageScores: {
    correctness: 50,
    efficiency: 50,
    safety: 50,
    collaboration: 50,
  },
  recentEvaluations: [],
});

describe('TrustService.getOrCreateProfile', () => {
  it('首次获取：创建默认档案（50 分 / level 1 / 四维 50）', async () => {
    const { service, state } = buildService();

    const profile = (await service.getOrCreateProfile('agent-1', 'p1')) as any;

    expect(profile.trustScore).toBe(50);
    expect(profile.trustLevel).toBe(1);
    expect(profile.totalEvaluations).toBe(0);
    expect(profile.averageScores.correctness).toBe(50);
    expect(state.appConfigs).toHaveLength(1);
    expect(state.appConfigs[0].key).toBe('trust.profile.agent-1');
    expect(state.appConfigs[0].scope).toBe('trust.profile');
  });

  it('二次获取：复用既有档案不重复创建', async () => {
    const { service, state } = buildService();
    await service.getOrCreateProfile('agent-1', 'p1');
    await service.getOrCreateProfile('agent-1', 'p1');
    expect(state.appConfigs).toHaveLength(1);
  });

  it('获取时懒迁移：以 onlyIfNull 条件回填 Member 列', async () => {
    const { service, state } = buildService();
    await service.getOrCreateProfile('agent-1', 'p1');

    expect(state.memberUpdates).toHaveLength(1);
    const args = state.memberUpdates[0];
    expect(args.where.id).toBe('agent-1');
    // onlyIfNull：仅当 Member 列为空才回填
    expect(args.where.OR).toEqual([{ trustScore: null }, { trustLevel: null }]);
    expect(args.data).toEqual({ trustScore: 50, trustLevel: 1 });
  });
});

describe('TrustService.evaluateExecution', () => {
  const criteria = {
    correctness: 80,
    efficiency: 70,
    safety: 90,
    collaboration: 60,
  };

  it('三层综合分 = immediate 0.4 + rolling 0.35 + historical 0.25', async () => {
    const { service } = buildService();

    const result = await service.evaluateExecution({
      executionRunId: 'run-1',
      agentId: 'agent-1',
      projectId: 'p1',
      criteria,
      outcome: 'success',
    });

    // immediate = round(80,70,90,60 各 0.25) = round(75) = 75
    expect(result.immediateScore.total).toBe(75);
    // rolling 首评无历史 = 50；historical = 初始 50
    const expected = Math.round(75 * 0.4 + 50 * 0.35 + 50 * 0.25);
    expect(result.comprehensiveScore.total).toBe(expected);
    expect(result.rollingScore.total).toBe(50);
  });

  it('success 评估：successfulEvaluations +1，评估记录头插入 recentEvaluations', async () => {
    const { service, state } = buildService();

    await service.evaluateExecution({
      executionRunId: 'run-1',
      agentId: 'agent-1',
      projectId: 'p1',
      criteria,
      outcome: 'success',
    });

    const stored = state.appConfigs.find(
      (c) => c.key === 'trust.profile.agent-1',
    );
    const value = stored.value as any;
    expect(value.totalEvaluations).toBe(1);
    expect(value.successfulEvaluations).toBe(1);
    expect(value.recentEvaluations).toHaveLength(1);
    expect(value.recentEvaluations[0].outcome).toBe('success');
    expect(value.recentEvaluations[0].total).toBe(75);
  });

  it('failure 评估：successfulEvaluations 不增，综合分低于首评前档案分', async () => {
    const { service } = buildService();

    const before = (await service.getOrCreateProfile('agent-1', 'p1')) as any;
    const result = await service.evaluateExecution({
      executionRunId: 'run-1',
      agentId: 'agent-1',
      projectId: 'p1',
      criteria: {
        correctness: 30,
        efficiency: 20,
        safety: 40,
        collaboration: 10,
      },
      outcome: 'failure',
    });

    const stored = (await service.getOrCreateProfile('agent-1', 'p1')) as any;
    expect(stored.successfulEvaluations).toBe(
      before.successfulEvaluations ?? 0,
    );
    expect(result.comprehensiveScore.total).toBeLessThan(before.trustScore);
  });

  it('recentEvaluations 截断至 50 条', async () => {
    const { service, state } = buildService();
    // 先手工放入 50 条历史
    await service.getOrCreateProfile('agent-1', 'p1');
    const stored = state.appConfigs[0];
    stored.value = {
      ...defaultProfileValue('agent-1', 'p1'),
      recentEvaluations: Array.from({ length: 50 }, (_, i) => ({
        total: 50,
        timestamp: `t${i}`,
      })),
    };

    await service.evaluateExecution({
      executionRunId: 'run-1',
      agentId: 'agent-1',
      projectId: 'p1',
      criteria,
      outcome: 'success',
    });

    expect((stored.value as any).recentEvaluations).toHaveLength(50);
  });
});

describe('TrustService.getRoleBasedCriteria', () => {
  it('pm 角色权重以协作为主，developer 以正确性为主', () => {
    const { service } = buildService();
    expect(service.getRoleBasedCriteria('pm').weights.collaboration).toBe(0.45);
    expect(service.getRoleBasedCriteria('developer').weights.correctness).toBe(
      0.35,
    );
  });

  it('未知角色回退均分四维', () => {
    const { service } = buildService();
    const fallback = service.getRoleBasedCriteria('architect');
    expect(fallback.weights).toEqual({
      correctness: 0.25,
      efficiency: 0.25,
      safety: 0.25,
      collaboration: 0.25,
    });
  });
});

describe('TrustService.calculateTrustScore', () => {
  it('无评估历史：返回档案当前分与等级', async () => {
    const { service } = buildService();
    const result = await service.calculateTrustScore('agent-1', 'p1');
    expect(result).toEqual({ score: 50, level: 1 });
  });

  it('有评估历史：最近 10 条按 1.0→0.1 递减加权，新评估权重最高', async () => {
    const { service, state } = buildService();
    await service.getOrCreateProfile('agent-1', 'p1');
    const stored = state.appConfigs[0];
    stored.value = {
      ...defaultProfileValue('agent-1', 'p1'),
      // 最近一条 90（权重 1.0），前一条 50（权重 0.9）
      recentEvaluations: [{ total: 90 }, { total: 50 }],
    };

    const result = await service.calculateTrustScore('agent-1', 'p1');

    const expected = Math.round((90 * 1.0 + 50 * 0.9) / 1.9);
    expect(result.score).toBe(expected);
    expect(result.level).toBe(2); // >= 70
  });
});

describe('TrustService.migrateTrustProfile', () => {
  it.each([
    ['full', 80, 80],
    ['partial', 80, 56],
    ['reset', 80, 50],
  ] as const)(
    '%s 策略：目标项目建档并落对应分数',
    async (policy, sourceScore, expected) => {
      const { service, state, events } = buildService();
      await service.getOrCreateProfile('agent-1', 'p1');
      const source = state.appConfigs[0];
      source.value = {
        ...defaultProfileValue('agent-1', 'p1'),
        trustScore: sourceScore,
      };

      const result = await service.migrateTrustProfile(
        'agent-1',
        'p1',
        'p2',
        policy,
      );

      expect(result.score).toBe(expected);
      const target = state.appConfigs.find((c) => c.projectId === 'p2');
      expect(target?.value.migratedFrom).toBe('p1');
      expect(target?.value.migrationPolicy).toBe(policy);
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'trust.profile.migrated' }),
      );
    },
  );
});

describe('TrustService.applyPrOutcome', () => {
  it('无 agent/project 绑定：no-binding 跳过', async () => {
    const { service, state } = buildService();
    const result = await service.applyPrOutcome({
      prState: 'merged',
      repoFullName: 'o/r',
      prNumber: 1,
    });
    expect(result).toEqual({ ok: false, reason: 'no-binding' });
    expect(state.appConfigs).toHaveLength(0);
  });

  it('delta=0（open）：noop 不改档案', async () => {
    const { service } = buildService();
    const result = await service.applyPrOutcome({
      agentId: 'agent-1',
      projectId: 'p1',
      prState: 'open',
      repoFullName: 'o/r',
      prNumber: 1,
    });
    expect(result).toEqual({ ok: true, delta: 0 });
  });

  it('merged（+8）：correctness 维度与总分同步 +8，发信任事件', async () => {
    const { service, state, events } = buildService();
    await service.getOrCreateProfile('agent-1', 'p1');

    const delta = PR_OUTCOME_DELTAS.merged;
    expect(delta).toBe(8);

    const result = await service.applyPrOutcome({
      agentId: 'agent-1',
      projectId: 'p1',
      prState: 'merged',
      repoFullName: 'o/r',
      prNumber: 7,
      reviewerLogin: 'alice',
    });

    expect(result.ok).toBe(true);
    expect(result.newTrustScore).toBe(58);
    expect(result.newLevel).toBe(1);

    const stored = state.appConfigs[0].value as any;
    expect(stored.averageScores.correctness).toBe(58);
    expect(stored.recentEvaluations[0].source).toBe('pr_outcome');
    expect(stored.recentEvaluations[0].sourceRef).toBe('o/r#7');

    expect(events).toContainEqual(
      expect.objectContaining({ type: 'trust.pr_outcome.applied' }),
    );
  });

  it('分数夹取 [0,100]：连续 merged 到顶不再升', async () => {
    const { service, state } = buildService();
    await service.getOrCreateProfile('agent-1', 'p1');
    const stored = state.appConfigs[0];
    stored.value = {
      ...defaultProfileValue('agent-1', 'p1'),
      trustScore: 97,
      averageScores: {
        correctness: 97,
        efficiency: 50,
        safety: 50,
        collaboration: 50,
      },
    };

    const result = await service.applyPrOutcome({
      agentId: 'agent-1',
      projectId: 'p1',
      prState: 'merged',
      repoFullName: 'o/r',
      prNumber: 9,
    });

    expect(result.newTrustScore).toBe(100);
    expect((stored.value as any).trustLevel).toBe(3); // >= 90
    expect((stored.value as any).averageScores.correctness).toBe(100);
  });
});
