import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CompletenessAuditService } from './completeness-audit.service';
import { CompletenessChecklistService } from './completeness-checklist.service';

/** 完整性审计单测：依赖完备性 + 工程完备性 + 三级响应（阻断/提议/通过）与执行前 Gate */

const makeAcceptance = (overrides: Record<string, unknown> = {}) => ({
  id: 'acc1',
  issueId: 'iss1',
  status: 'draft',
  createdAt: new Date('2026-09-08T00:00:00Z'),
  issue: {
    id: 'iss1',
    title: '实现导出功能',
    projectId: 'p1',
    project: null,
    dependencies: [] as Array<Record<string, unknown>>,
  },
  criteria: [] as Array<Record<string, unknown>>,
  auditReport: null,
  ...overrides,
});

const makeChecklist = (overrides: Record<string, unknown> = {}) => ({
  id: 'cl1',
  name: '后端通用清单',
  description: null,
  projectType: 'backend',
  techStack: 'ts-node',
  isSystem: true,
  ownerId: null,
  version: 1,
  checklist: [
    {
      content: '补充日志埋点验收标准',
      category: 'observability',
      severity: 'high',
      suggestion: '增加日志检查项',
      autoFixable: false,
    },
    {
      content: '补充错误码规范验收标准',
      category: 'contract',
      severity: 'medium',
      suggestion: null,
      autoFixable: true,
    },
  ],
  createdAt: new Date('2026-09-08T00:00:00Z'),
  updatedAt: new Date('2026-09-08T00:00:00Z'),
  ...overrides,
});

function buildPrisma() {
  const state = {
    acceptances: [] as Array<Record<string, any>>,
    reports: [] as Array<Record<string, any>>,
    checklists: [] as Array<Record<string, any>>,
    createdCriteria: [] as Array<Record<string, any>>,
    existingCriteriaMaxOrder: -1 as number,
  };

  const prisma = {
    acceptance: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) =>
          state.acceptances.find((a) => a.id === where.id) ?? null,
      ),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { issueId: string; status?: { notIn?: string[] } };
        }) => {
          const notIn = where.status?.notIn ?? [];
          return (
            state.acceptances
              .filter(
                (a) => a.issueId === where.issueId && !notIn.includes(a.status),
              )
              .sort(
                (a, b) =>
                  (b.createdAt as Date).getTime() -
                  (a.createdAt as Date).getTime(),
              )[0] ?? null
          );
        },
      ),
    },
    completenessAuditReport: {
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { acceptanceId: string };
          create: Record<string, any>;
          update: Record<string, any>;
        }) => {
          const idx = state.reports.findIndex(
            (r) => r.acceptanceId === where.acceptanceId,
          );
          if (idx >= 0) {
            const row = { ...state.reports[idx], ...update };
            state.reports[idx] = row;
            return row;
          }
          const row = {
            ...create,
            acceptanceId: where.acceptanceId,
            id: `rpt-${state.reports.length + 1}`,
          };
          state.reports.push(row);
          return row;
        },
      ),
      findUnique: vi.fn(
        async ({ where }: { where: { acceptanceId: string } }) =>
          state.reports.find((r) => r.acceptanceId === where.acceptanceId) ??
          null,
      ),
    },
    completenessChecklist: {
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { projectType: string; techStack: string; isSystem: boolean };
        }) =>
          state.checklists.find(
            (c) =>
              c.projectType === where.projectType &&
              c.techStack === where.techStack &&
              c.isSystem === where.isSystem,
          ) ?? null,
      ),
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) =>
          state.checklists.find((c) => c.id === where.id) ?? null,
      ),
    },
    acceptanceCriteria: {
      aggregate: vi.fn(async () => ({
        _max: { order: state.existingCriteriaMaxOrder },
      })),
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        const row = {
          id: `crit-${state.createdCriteria.length + 1}`,
          ...data,
        };
        state.createdCriteria.push(row);
        return row;
      }),
    },
  };

  return { prisma, state };
}

function buildService(prisma: ReturnType<typeof buildPrisma>['prisma']) {
  const checklistService = new CompletenessChecklistService(prisma as any);
  return new CompletenessAuditService(prisma as any, checklistService);
}

describe('CompletenessAuditService', () => {
  it('auditAcceptance：验收不存在抛 NotFoundException', async () => {
    const { prisma } = buildPrisma();
    const service = buildService(prisma);
    await expect(service.auditAcceptance('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('auditAcceptance：无依赖无清单无标准 → green 且 upsert 落 create 分支', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(makeAcceptance());
    const service = buildService(prisma);

    const { report, result } = await service.auditAcceptance('acc1');

    expect(result.riskLevel).toBe('green');
    expect(result.blockedItems).toHaveLength(0);
    expect(result.suggestedItems).toHaveLength(0);
    expect(result.summary).toBe('验收标准完整，可以执行');
    expect(state.reports).toHaveLength(1);
    expect(report.riskLevel).toBe('green');
  });

  it('依赖完备性：blocks 依赖未在验收标准提及 → high 进 blockedItems，riskLevel red', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(
      makeAcceptance({
        issue: {
          id: 'iss1',
          title: '实现导出功能',
          projectId: 'p1',
          project: null,
          dependencies: [
            {
              id: 'dep1',
              type: 'blocks',
              dependsOnIssue: { id: 'iss0', title: '底层导入服务' },
            },
          ],
        },
      }),
    );
    const service = buildService(prisma);

    const { result } = await service.auditAcceptance('acc1');

    expect(result.riskLevel).toBe('red');
    expect(result.blockedItems).toHaveLength(1);
    expect(result.blockedItems[0]).toMatchObject({
      type: 'dependency',
      severity: 'high',
      category: '依赖完备性',
    });
    expect(result.blockedItems[0].content).toContain('底层导入服务');
    expect(result.summary).toContain('1 个强阻断项');
  });

  it('依赖完备性：非 blocks 依赖未提及 → medium 进 suggestedItems，riskLevel yellow', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(
      makeAcceptance({
        issue: {
          id: 'iss1',
          title: '实现导出功能',
          projectId: 'p1',
          project: null,
          dependencies: [
            {
              id: 'dep2',
              type: 'related',
              dependsOnIssue: { id: 'iss0', title: '辅助服务' },
            },
          ],
        },
      }),
    );
    const service = buildService(prisma);

    const { result } = await service.auditAcceptance('acc1');

    expect(result.riskLevel).toBe('yellow');
    expect(result.blockedItems).toHaveLength(0);
    expect(result.suggestedItems).toHaveLength(1);
    expect(result.suggestedItems[0].severity).toBe('medium');
    expect(result.summary).toContain('建议补全 1 项');
  });

  it('依赖完备性：验收标准提及依赖标题（大小写不敏感）→ 无 finding', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(
      makeAcceptance({
        issue: {
          id: 'iss1',
          title: '实现导出功能',
          projectId: 'p1',
          project: null,
          dependencies: [
            {
              id: 'dep1',
              type: 'blocks',
              dependsOnIssue: { id: 'iss0', title: '底层导入服务' },
            },
          ],
        },
        criteria: [
          {
            id: 'c1',
            content: '验证与「底层导入服务」的集成正常',
            status: 'pending',
            category: null,
            severity: 'medium',
            source: 'manual',
          },
        ],
      }),
    );
    const service = buildService(prisma);

    const { result } = await service.auditAcceptance('acc1');

    expect(result.riskLevel).toBe('green');
    expect(result.blockedItems).toHaveLength(0);
    expect(result.suggestedItems).toHaveLength(0);
  });

  it('工程完备性：指定 checklistId → critical/high 缺失项进 blocked，medium 进 suggested', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(makeAcceptance());
    state.checklists.push(makeChecklist());
    const service = buildService(prisma);

    const { result } = await service.auditAcceptance('acc1', 'cl1');

    expect(result.riskLevel).toBe('red');
    expect(result.blockedItems).toHaveLength(1);
    expect(result.blockedItems[0]).toMatchObject({
      type: 'engineering',
      severity: 'high',
      source: 'Checklist: 后端通用清单',
    });
    expect(result.suggestedItems).toHaveLength(1);
    expect(result.suggestedItems[0].severity).toBe('medium');
    expect(result.suggestedItems[0].autoFixable).toBe(true);
  });

  it('工程完备性：验收标准已覆盖清单项（双向 includes）→ 不重复报', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(
      makeAcceptance({
        criteria: [
          {
            id: 'c1',
            content: '服务端补充日志埋点验收标准的完整验证',
            status: 'pending',
            category: null,
            severity: 'medium',
            source: 'manual',
          },
        ],
      }),
    );
    state.checklists.push(makeChecklist());
    const service = buildService(prisma);

    const { result } = await service.auditAcceptance('acc1', 'cl1');

    expect(result.blockedItems).toHaveLength(0);
    // 仅剩 medium 的错误码项 → yellow
    expect(result.suggestedItems).toHaveLength(1);
    expect(result.riskLevel).toBe('yellow');
  });

  it('自动选清单：无 checklistId 且项目有 metadata → 按项目类型与技术栈命中', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(
      makeAcceptance({
        issue: {
          id: 'iss1',
          title: '实现导出功能',
          projectId: 'p1',
          project: {
            id: 'p1',
            metadata: { projectType: 'backend', techStack: 'typescript node' },
          },
          dependencies: [],
        },
      }),
    );
    state.checklists.push(makeChecklist());
    const service = buildService(prisma);

    const { report } = await service.auditAcceptance('acc1');

    expect(report.checklistId).toBe('cl1');
  });

  it('passed 标准进入 passedItems；二次审计走 upsert update 分支', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(
      makeAcceptance({
        criteria: [
          {
            id: 'c1',
            content: '导出文件格式为 xlsx',
            status: 'passed',
            category: '功能',
            severity: 'high',
            source: 'manual',
          },
        ],
      }),
    );
    const service = buildService(prisma);

    const first = await service.auditAcceptance('acc1');
    expect(first.result.passedItems).toHaveLength(1);
    expect(first.result.passedItems[0]).toMatchObject({
      type: 'engineering',
      id: 'c1',
      severity: 'high',
    });

    const second = await service.auditAcceptance('acc1');
    expect(second.report.id).toBe(first.report.id);
    expect(state.reports).toHaveLength(1);
  });
});

describe('CompletenessAuditService.applySuggestions', () => {
  it('验收不存在 → NotFoundException', async () => {
    const { prisma } = buildPrisma();
    const service = buildService(prisma);
    await expect(service.applySuggestions('missing', ['x'])).rejects.toThrow(
      new NotFoundException('Acceptance missing not found'),
    );
  });

  it('无审计报告 → NotFoundException', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(makeAcceptance());
    const service = buildService(prisma);
    await expect(service.applySuggestions('acc1', ['x'])).rejects.toThrow(
      'No audit report found',
    );
  });

  it('选中项全部无效 → BadRequestException', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(makeAcceptance());
    state.reports.push({
      acceptanceId: 'acc1',
      blockedItems: [],
      suggestedItems: [{ id: 'eng-x', content: '某标准' }],
    });
    const service = buildService(prisma);
    await expect(service.applySuggestions('acc1', ['nope'])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('成功：创建 technical 标准（fromAudit 溯源 + order 续接）并返回重审结果', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(makeAcceptance());
    state.existingCriteriaMaxOrder = 2;
    state.reports.push({
      acceptanceId: 'acc1',
      blockedItems: [
        {
          type: 'engineering',
          id: 'eng-a',
          content: '补充日志埋点验收标准',
          category: 'observability',
          severity: 'high',
          source: 'Checklist: 后端通用清单',
          autoFixable: false,
        },
      ],
      suggestedItems: [],
    });
    const service = buildService(prisma);

    const reaudit = await service.applySuggestions('acc1', ['eng-a']);

    expect(state.createdCriteria).toHaveLength(1);
    const created = state.createdCriteria[0];
    expect(created).toMatchObject({
      acceptanceId: 'acc1',
      criteriaType: 'technical',
      content: '补充日志埋点验收标准',
      severity: 'high',
      order: 3,
    });
    expect(created.metadata.fromAudit).toBe(true);
    // 重审后原阻断项已覆盖 → 无 finding
    expect(reaudit.result.blockedItems).toHaveLength(0);
  });
});

describe('CompletenessAuditService.getAuditReport / enforceAuditBeforeExecution', () => {
  it('getAuditReport：未命中返回 null', async () => {
    const { prisma } = buildPrisma();
    const service = buildService(prisma);
    expect(await service.getAuditReport('acc1')).toBeNull();
  });

  it('enforceAuditBeforeExecution：无活契约 → 放行并提示', async () => {
    const { prisma } = buildPrisma();
    const service = buildService(prisma);
    const gate = await service.enforceAuditBeforeExecution('iss1');
    expect(gate.allowed).toBe(true);
    expect(gate.message).toContain('暂无活契约');
  });

  it('enforceAuditBeforeExecution：活契约无审计报告 → 阻断', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(makeAcceptance());
    const service = buildService(prisma);
    const gate = await service.enforceAuditBeforeExecution('iss1');
    expect(gate.allowed).toBe(false);
    expect(gate.message).toContain('尚未通过完整性审计');
  });

  it('enforceAuditBeforeExecution：red 报告 → 阻断并携带报告', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(
      makeAcceptance({
        auditReport: {
          riskLevel: 'red',
          blockedItems: [{ id: 'eng-a' }, { id: 'eng-b' }],
          suggestedItems: [],
        },
      }),
    );
    const service = buildService(prisma);
    const gate = await service.enforceAuditBeforeExecution('iss1');
    expect(gate.allowed).toBe(false);
    expect(gate.report).not.toBeUndefined();
    expect(gate.message).toContain('2 个强阻断项');
  });

  it('enforceAuditBeforeExecution：yellow 报告 → 放行并携带报告', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push(
      makeAcceptance({
        auditReport: {
          riskLevel: 'yellow',
          blockedItems: [],
          suggestedItems: [{ id: 'eng-x' }],
        },
      }),
    );
    const service = buildService(prisma);
    const gate = await service.enforceAuditBeforeExecution('iss1');
    expect(gate.allowed).toBe(true);
    expect(gate.report.riskLevel).toBe('yellow');
  });
});
