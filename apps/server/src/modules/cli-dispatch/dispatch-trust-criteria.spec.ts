/**
 * P0-10 信任量纲契约单测：dispatch → trust 两侧量纲一致性锁定。
 * dispatch 侧 criteria 常量必须为 0-100 量纲（与 TrustService 契约一致），
 * 且方向正确：成功执行综合分 > 基线 50（信任演进向上），失败执行 < 50。
 * 背景：此前 dispatch 传 0-1 值而 trust 按 0-100 加权，成功评估反而把
 * 信任分从 50 打到 ~30（执行越多分越低），等级跌为观察者。
 */
import { TrustService } from '@/modules/trust/trust.service';
import {
  TRUST_CRITERIA_SUCCESS,
  TRUST_CRITERIA_FAILURE,
} from './dispatch.service';

/** 内存桩（与 trust.service.spec 同款） */
function buildPrisma() {
  const state = {
    appConfigs: [] as Array<Record<string, any>>,
    idSeq: 0,
  };
  const prisma = {
    appConfig: {
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { key: string; projectId?: string | null };
        }) =>
          state.appConfigs.find(
            (c) => c.key === where.key && c.projectId === where.projectId,
          ) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        const row = { ...data, id: `cfg-${++state.idSeq}` };
        state.appConfigs.push(row);
        return row;
      }),
      update: vi.fn(
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
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  };
  return { prisma, state };
}

function buildTrustService() {
  const { prisma, state } = buildPrisma();
  const service = new TrustService(
    prisma as any,
    {
      publish: vi.fn(),
    } as any,
  );
  return { service, state };
}

const BASELINE = 50;

describe('P0-10 信任量纲契约（dispatch criteria 0-100）', () => {
  it('成功 criteria（90/70/90/70）为 0-100 量纲：一次成功执行综合分高于基线 50', async () => {
    expect(Object.values(TRUST_CRITERIA_SUCCESS).every((v) => v > 1)).toBe(
      true,
    ); // 显式量纲：无 0-1 残留

    const { service, state } = buildTrustService();
    const result = await service.evaluateExecution({
      executionRunId: 'run-succ',
      agentId: 'agent-1',
      projectId: 'p1',
      criteria: { ...TRUST_CRITERIA_SUCCESS },
      outcome: 'success',
    });

    // immediate = round(80) = 80；首评综合 = round(80*0.4 + 50*0.35 + 50*0.25) = 62
    expect(result.immediateScore.total).toBe(80);
    expect(result.comprehensiveScore.total).toBeGreaterThan(BASELINE);
    expect(result.newTrustLevel).toBeGreaterThanOrEqual(2); // 不降为观察者

    const stored = state.appConfigs.find(
      (c) => c.key === 'trust.profile.agent-1',
    );
    expect((stored!.value as any).trustScore).toBeGreaterThan(BASELINE);
  });

  it('连续成功：信任分持续上升（执行越多分越高，修复「越执行越低」）', async () => {
    const { service } = buildTrustService();

    let last = BASELINE;
    for (let i = 0; i < 3; i++) {
      const result = await service.evaluateExecution({
        executionRunId: `run-succ-${i}`,
        agentId: 'agent-1',
        projectId: 'p1',
        criteria: { ...TRUST_CRITERIA_SUCCESS },
        outcome: 'success',
      });
      expect(result.comprehensiveScore.total).toBeGreaterThanOrEqual(last);
      last = result.comprehensiveScore.total;
    }
    expect(last).toBeGreaterThan(BASELINE);
  });

  it('失败 criteria（10/20/50/30）：一次失败执行综合分低于基线 50', async () => {
    expect(Object.values(TRUST_CRITERIA_FAILURE).every((v) => v > 1)).toBe(
      true,
    ); // 显式量纲：无 0-1 残留

    const { service, state } = buildTrustService();
    const result = await service.evaluateExecution({
      executionRunId: 'run-fail',
      agentId: 'agent-2',
      projectId: 'p1',
      criteria: { ...TRUST_CRITERIA_FAILURE },
      outcome: 'failure',
    });

    // immediate = round(27.5) = 28；首评综合 = round(28*0.4 + 50*0.35 + 50*0.25) = 41
    expect(result.immediateScore.total).toBe(28);
    expect(result.comprehensiveScore.total).toBeLessThan(BASELINE);

    const stored = state.appConfigs.find(
      (c) => c.key === 'trust.profile.agent-2',
    );
    expect((stored!.value as any).trustScore).toBeLessThan(BASELINE);
  });

  it('失败后档案分随评估落库（syncToMember 写穿 Member 列）', async () => {
    const { prisma } = buildPrisma();
    const memberWrites: Array<Record<string, any>> = [];
    const service = new TrustService(
      {
        ...prisma,
        member: {
          updateMany: vi.fn(async (args: Record<string, any>) => {
            memberWrites.push(args);
            return { count: 0 };
          }),
        },
      } as any,
      { publish: vi.fn() } as any,
    );

    await service.evaluateExecution({
      executionRunId: 'run-fail-2',
      agentId: 'mem_1',
      projectId: 'p1',
      criteria: { ...TRUST_CRITERIA_FAILURE },
      outcome: 'failure',
    });

    const writeThrough = memberWrites.at(-1);
    expect(writeThrough?.where.id).toBe('mem_1');
    expect(writeThrough?.data.trustScore).toBeLessThan(BASELINE);
  });
});
