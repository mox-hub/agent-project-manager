import { DashboardService } from './dashboard.service';
import { PrismaService } from '@/core/database/prisma.service';

/** 档案健康 / 剧本健康派生口径单测（全派生零存储） */

function buildPrisma(opts: {
  projects?: Array<Record<string, unknown>>;
  atoms?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  mountedProjects?: number;
}) {
  return {
    project: {
      findMany: jest.fn(async () => opts.projects ?? []),
      count: jest.fn(async () => opts.mountedProjects ?? 0),
    },
    memoryAtom: {
      findMany: jest.fn(async () => opts.atoms ?? []),
    },
    activity: {
      findMany: jest.fn(async () => opts.events ?? []),
    },
  };
}

describe('DashboardService 档案健康', () => {
  it('按项目聚合完备度 / 平均置信度 / 过期槽位', async () => {
    const now = Date.now();
    const day = 86_400_000;
    const prisma = buildPrisma({
      projects: [
        { id: 'p1', name: '新项目' },
        { id: 'p2', name: '老项目' },
      ],
      atoms: [
        // p1：两个槽位，其一 180 天前（过期）
        {
          scope: 'project:p1',
          slot: 'tech-stack',
          confidence: 1,
          updatedAt: new Date(now - 10 * day),
        },
        {
          scope: 'project:p1',
          slot: 'conventions',
          confidence: 0.5,
          updatedAt: new Date(now - 180 * day),
        },
        // p2：无原子
      ],
    });
    const service = new DashboardService(prisma as unknown as PrismaService);
    const res = await service.getProfileHealth();
    expect(res.items).toHaveLength(2);
    const p1 = res.items.find((i) => i.projectId === 'p1');
    expect(p1).toMatchObject({ filled: 2, total: 5, staleSlots: 1 });
    expect(p1?.avgConfidence).toBeCloseTo(0.75, 2);
    const p2 = res.items.find((i) => i.projectId === 'p2');
    expect(p2).toMatchObject({ filled: 0, staleSlots: 0, avgConfidence: null });
  });
});

describe('DashboardService 剧本健康', () => {
  const base = (n: number) => new Date(2026, 8, 1, 0, 0, n);

  it('聚合通过/跳过/驳回与跳过率、退回率', async () => {
    const ev = (stage: string, type: string, n: number) => ({
      projectId: 'p1',
      type,
      metadata: { stage },
      createdAt: base(n),
    });
    const prisma = buildPrisma({
      mountedProjects: 3,
      events: [
        ev('research', 'playbook_stage_completed', 10),
        ev('requirements', 'playbook_stage_completed', 20),
        ev('requirements', 'playbook_stage_skipped', 30),
        ev('design', 'playbook_gate_rejected', 40),
        ev('design', 'playbook_stage_completed', 50),
        // 无 stage 的杂音事件应被忽略
        {
          projectId: 'p1',
          type: 'playbook_mounted',
          metadata: {},
          createdAt: base(1),
        },
      ],
    });
    const service = new DashboardService(prisma as unknown as PrismaService);
    const res = await service.getPlaybookHealth();
    expect(res.mountedProjects).toBe(3);
    const byStage = Object.fromEntries(res.stages.map((s) => [s.stage, s]));
    expect(byStage.research).toMatchObject({
      completed: 1,
      skipped: 0,
      rejected: 0,
      skipRatePct: 0,
      rejectRatePct: 0,
    });
    expect(byStage.requirements).toMatchObject({ completed: 1, skipped: 1 });
    expect(byStage.requirements.skipRatePct).toBe(50);
    expect(byStage.design).toMatchObject({ completed: 1, rejected: 1 });
    expect(byStage.design.rejectRatePct).toBe(50);
  });

  it('停留时长 = 同项目上一剧本事件到通过的间隔（毫秒均值）', async () => {
    const prisma = buildPrisma({
      events: [
        {
          projectId: 'p1',
          type: 'playbook_stage_completed',
          metadata: { stage: 'research' },
          createdAt: base(30),
        },
        {
          projectId: 'p1',
          type: 'playbook_stage_completed',
          metadata: { stage: 'requirements' },
          createdAt: base(90),
        },
      ],
    });
    const service = new DashboardService(prisma as unknown as PrismaService);
    const res = await service.getPlaybookHealth();
    const byStage = Object.fromEntries(res.stages.map((s) => [s.stage, s]));
    // research 是首条事件（无前驱）→ null；requirements 距上一事件 60s
    expect(byStage.research.avgDurationMs).toBeNull();
    expect(byStage.requirements.avgDurationMs).toBe(60_000);
  });
});
