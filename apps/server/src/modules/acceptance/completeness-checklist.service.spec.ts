import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CompletenessChecklistService } from './completeness-checklist.service';

/** 完备性清单单测：系统/团队清单 CRUD、属主与系统清单保护、应用清单生成技术标准 */

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
  ],
  createdAt: new Date('2026-09-08T00:00:00Z'),
  updatedAt: new Date('2026-09-08T00:00:00Z'),
  ...overrides,
});

function buildPrisma() {
  const state = {
    checklists: [] as Array<Record<string, any>>,
    acceptances: [] as Array<Record<string, any>>,
    criteria: [] as Array<Record<string, any>>,
    createdCriteria: [] as Array<Record<string, any>>,
    nextChecklistId: 100,
  };

  const prisma = {
    completenessChecklist: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: {
            isSystem?: boolean;
            ownerId?: string;
            projectType?: string;
            techStack?: string;
          };
          orderBy?: unknown;
        }) => {
          let rows = [...state.checklists];
          if (where.isSystem !== undefined)
            rows = rows.filter((c) => c.isSystem === where.isSystem);
          if (where.ownerId !== undefined)
            rows = rows.filter((c) => c.ownerId === where.ownerId);
          if (where.projectType !== undefined)
            rows = rows.filter((c) => c.projectType === where.projectType);
          if (where.techStack !== undefined)
            rows = rows.filter((c) => c.techStack === where.techStack);
          // orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] 或 { name: 'asc' }
          rows.sort((a, b) => {
            const nameCmp = a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
            return nameCmp;
          });
          return rows;
        },
      ),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: {
            projectType: string;
            techStack: string;
            isSystem: boolean;
          };
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
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        const row = {
          description: null,
          ownerId: null,
          version: 1,
          ...data,
          id: `cl-${state.nextChecklistId++}`,
          createdAt: new Date('2026-09-08T00:00:00Z'),
          updatedAt: new Date('2026-09-08T00:00:00Z'),
        };
        state.checklists.push(row);
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
          const found = state.checklists.find((c) => c.id === where.id);
          if (!found) throw new Error(`checklist ${where.id} not found`);
          const { checklist, version, ...rest } = data;
          Object.assign(found, rest);
          if (checklist !== undefined) found.checklist = checklist;
          if (version?.increment) found.version += version.increment;
          return found;
        },
      ),
    },
    acceptance: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) =>
          state.acceptances.find((a) => a.id === where.id) ?? null,
      ),
    },
    acceptanceCriteria: {
      aggregate: vi.fn(
        async ({ where }: { where: { acceptanceId: string } }) => ({
          _max: {
            order: Math.max(
              -1,
              ...state.criteria
                .filter((c) => c.acceptanceId === where.acceptanceId)
                .map((c) => c.order ?? -1),
              ...state.createdCriteria
                .filter((c) => c.acceptanceId === where.acceptanceId)
                .map((c) => c.order ?? -1),
            ),
          },
        }),
      ),
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

describe('CompletenessChecklistService', () => {
  it('getSystemChecklists：仅返回系统预置清单', async () => {
    const { prisma, state } = buildPrisma();
    state.checklists.push(
      makeChecklist(),
      makeChecklist({
        id: 'cl2',
        isSystem: false,
        ownerId: 'u1',
        name: '团队清单',
      }),
    );
    const service = new CompletenessChecklistService(prisma as any);

    const rows = await service.getSystemChecklists();

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('cl1');
  });

  it('findByTechStack：按项目类型 + 技术栈 + isSystem 精确命中', async () => {
    const { prisma, state } = buildPrisma();
    state.checklists.push(
      makeChecklist(),
      makeChecklist({ id: 'cl2', projectType: 'frontend', name: '前端清单' }),
    );
    const service = new CompletenessChecklistService(prisma as any);

    const hit = await service.findByTechStack('backend', 'ts-node');
    expect(hit?.id).toBe('cl1');

    const miss = await service.findByTechStack('mobile', 'ts-node');
    expect(miss).toBeNull();
  });

  it('findTeamChecklists：仅回指定属主的非系统清单', async () => {
    const { prisma, state } = buildPrisma();
    state.checklists.push(
      makeChecklist(),
      makeChecklist({
        id: 'cl2',
        isSystem: false,
        ownerId: 'u1',
        name: '甲清单',
      }),
      makeChecklist({
        id: 'cl3',
        isSystem: false,
        ownerId: 'u2',
        name: '乙清单',
      }),
    );
    const service = new CompletenessChecklistService(prisma as any);

    const rows = await service.findTeamChecklists('u1');

    expect(rows.map((r) => r.id)).toEqual(['cl2']);
  });

  it('createTeamChecklist：强制 isSystem=false 并落属主', async () => {
    const { prisma, state } = buildPrisma();
    const service = new CompletenessChecklistService(prisma as any);

    const row = await service.createTeamChecklist(
      {
        name: '团队清单',
        description: '自建',
        projectType: 'backend',
        techStack: 'ts-node',
        checklist: [
          {
            content: '项A',
            category: 'c',
            severity: 'high',
            autoFixable: false,
          },
        ],
      } as any,
      'u1',
    );

    expect(row.isSystem).toBe(false);
    expect(row.ownerId).toBe('u1');
    expect(state.checklists).toHaveLength(1);
  });

  it('updateTeamChecklist：不存在 → NotFoundException', async () => {
    const { prisma } = buildPrisma();
    const service = new CompletenessChecklistService(prisma as any);
    await expect(
      service.updateTeamChecklist('missing', { name: 'x' } as any, 'u1'),
    ).rejects.toThrow(new NotFoundException('Checklist missing not found'));
  });

  it('updateTeamChecklist：系统清单拒绝修改 → BadRequestException', async () => {
    const { prisma, state } = buildPrisma();
    state.checklists.push(makeChecklist());
    const service = new CompletenessChecklistService(prisma as any);
    await expect(
      service.updateTeamChecklist('cl1', { name: 'x' } as any, 'u1'),
    ).rejects.toThrow(
      new BadRequestException('Cannot modify system checklists'),
    );
  });

  it('updateTeamChecklist：非属主拒绝修改 → BadRequestException', async () => {
    const { prisma, state } = buildPrisma();
    state.checklists.push(
      makeChecklist({ id: 'cl2', isSystem: false, ownerId: 'u1' }),
    );
    const service = new CompletenessChecklistService(prisma as any);
    await expect(
      service.updateTeamChecklist('cl2', { name: 'x' } as any, 'u2'),
    ).rejects.toThrow(
      new BadRequestException('Not authorized to modify this checklist'),
    );
  });

  it('updateTeamChecklist：属主成功更新且 version 自增', async () => {
    const { prisma, state } = buildPrisma();
    state.checklists.push(
      makeChecklist({ id: 'cl2', isSystem: false, ownerId: 'u1' }),
    );
    const service = new CompletenessChecklistService(prisma as any);

    const row = await service.updateTeamChecklist(
      'cl2',
      { name: '改名', checklist: [{ content: '新项', category: 'c' }] } as any,
      'u1',
    );

    expect(row.name).toBe('改名');
    expect(row.version).toBe(2);
  });

  it('findOne：命中与 404', async () => {
    const { prisma, state } = buildPrisma();
    state.checklists.push(makeChecklist());
    const service = new CompletenessChecklistService(prisma as any);

    expect((await service.findOne('cl1')).id).toBe('cl1');
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('applyToAcceptance：验收不存在 → NotFoundException', async () => {
    const { prisma, state } = buildPrisma();
    state.checklists.push(makeChecklist());
    const service = new CompletenessChecklistService(prisma as any);
    await expect(service.applyToAcceptance('missing', 'cl1')).rejects.toThrow(
      new NotFoundException('Acceptance missing not found'),
    );
  });

  it('applyToAcceptance：清单不存在 → NotFoundException', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push({ id: 'acc1' });
    const service = new CompletenessChecklistService(prisma as any);
    await expect(service.applyToAcceptance('acc1', 'missing')).rejects.toThrow(
      new NotFoundException('Checklist missing not found'),
    );
  });

  it('applyToAcceptance：清单格式非法（非数组）→ BadRequestException', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push({ id: 'acc1' });
    state.checklists.push(makeChecklist({ checklist: { bad: true } }));
    const service = new CompletenessChecklistService(prisma as any);
    await expect(service.applyToAcceptance('acc1', 'cl1')).rejects.toThrow(
      new BadRequestException('Invalid checklist format'),
    );
  });

  it('applyToAcceptance：成功批量生成技术标准（order 续接 + template 溯源）', async () => {
    const { prisma, state } = buildPrisma();
    state.acceptances.push({ id: 'acc1' });
    state.checklists.push(makeChecklist());
    state.criteria.push(
      { acceptanceId: 'acc1', order: 0 },
      { acceptanceId: 'acc1', order: 1 },
    );
    const service = new CompletenessChecklistService(prisma as any);

    const { createdCount, criteria } = await service.applyToAcceptance(
      'acc1',
      'cl1',
    );

    expect(createdCount).toBe(1);
    expect(criteria).toHaveLength(1);
    const created = state.createdCriteria[0];
    expect(created).toMatchObject({
      acceptanceId: 'acc1',
      criteriaType: 'technical',
      content: '补充日志埋点验收标准',
      source: 'template',
      severity: 'high',
      order: 2,
    });
    expect(created.metadata).toMatchObject({
      fromChecklist: 'cl1',
      checklistName: '后端通用清单',
    });
  });

  it('findAll：按条件组合过滤且系统清单在前', async () => {
    const { prisma, state } = buildPrisma();
    state.checklists.push(
      makeChecklist({ id: 'clA', name: '甲' }),
      makeChecklist({ id: 'clB', name: '乙', isSystem: false, ownerId: 'u1' }),
      makeChecklist({ id: 'clC', name: '丙', projectType: 'frontend' }),
    );
    const service = new CompletenessChecklistService(prisma as any);

    const all = await service.findAll();
    expect(all).toHaveLength(3);

    const systemOnly = await service.findAll({ isSystem: true });
    // 桩按码点排序：乙/丙（U+4E..）在甲（U+7532）之前
    expect(systemOnly.map((r) => r.id)).toEqual(['clC', 'clA']);

    const backend = await service.findAll({ projectType: 'backend' });
    expect(backend.map((r) => r.id)).toEqual(['clB', 'clA']);
  });

  it('createSystemChecklist：isSystem=true 落库', async () => {
    const { prisma, state } = buildPrisma();
    const service = new CompletenessChecklistService(prisma as any);

    const row = await service.createSystemChecklist({
      name: '预置清单',
      projectType: 'backend',
      techStack: 'ts-node',
      checklist: [{ content: '项A', category: 'c', severity: 'high' }],
    });

    expect(row.isSystem).toBe(true);
    expect(row.ownerId).toBeNull();
    expect(state.checklists).toHaveLength(1);
  });
});
