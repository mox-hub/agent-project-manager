import { MemoryService, memoryScope } from './memory.service';
import { PrismaService } from '../../core/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

/** 记忆 Store B 单元测试：召回隔离/排序/保鲜、去重合并、brief 组装、软删 */

const atomRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'mem1',
  scope: 'project:p1',
  type: 'preference',
  content: '用户喜欢先看风险再看排期',
  confidence: 0.8,
  refs: null,
  sourceEventId: null,
  sourceType: 'digest',
  lifecycle: 'working',
  pinned: false,
  hits: 0,
  lastUsedAt: null,
  createdAt: new Date('2026-09-06T00:00:00Z'),
  updatedAt: new Date('2026-09-06T00:00:00Z'),
  ...overrides,
});

function buildPrisma() {
  const store: Record<string, ReturnType<typeof atomRow>[]> = {};
  const prisma = {
    memoryAtom: {
      findMany: jest.fn(
        async (args: { where: Record<string, unknown>; orderBy?: unknown }) => {
          const where = args.where;
          const scopeFilter = where.scope as { in?: string[] } | string;
          const scope =
            typeof scopeFilter === 'string'
              ? [scopeFilter]
              : (scopeFilter?.in ?? []);
          let rows = (store['all'] ?? []).filter((r) =>
            scope.includes(r.scope),
          );
          if (where.lifecycle === 'working') {
            rows = rows.filter((r) => r.lifecycle === 'working');
          }
          if (where.type) rows = rows.filter((r) => r.type === where.type);
          if (where.pinned === true) rows = rows.filter((r) => r.pinned);
          const contentFilter = where.content as
            { contains?: string } | undefined;
          if (contentFilter?.contains) {
            rows = rows.filter((r) =>
              r.content.includes(contentFilter.contains as string),
            );
          }
          const idFilter = where.id as { in?: string[] } | undefined;
          if (idFilter?.in) {
            rows = rows.filter((r) => idFilter.in!.includes(r.id));
          }
          // 应用 orderBy（服务依赖 pinned/confidence/lastUsedAt/updatedAt 排序）
          const orderBy = (args as { orderBy?: unknown }).orderBy;
          if (orderBy) {
            const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
            for (const o of [...orders].reverse()) {
              const [[key, dir]] = Object.entries(o as Record<string, string>);
              rows = [...rows].sort((a, b) => {
                const av = (a as Record<string, unknown>)[key] as number | null;
                const bv = (b as Record<string, unknown>)[key] as number | null;
                const cmp = av === bv ? 0 : (av ?? 0) > (bv ?? 0) ? 1 : -1;
                return dir === 'desc' ? -cmp : cmp;
              });
            }
          }
          return rows;
        },
      ),
      findFirst: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          (store['all'] ?? []).find(
            (r) =>
              r.scope === where.scope &&
              r.type === where.type &&
              r.content === where.content &&
              ['working', 'consolidated'].includes(r.lifecycle),
          ),
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = atomRow({
          ...data,
          id: `mem${(store['all']?.length ?? 0) + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        store['all'] = [...(store['all'] ?? []), row];
        return row;
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          let updated: ReturnType<typeof atomRow> | undefined;
          store['all'] = (store['all'] ?? []).map((r) => {
            if (r.id !== where.id) return r;
            updated = { ...r, ...data };
            return updated;
          });
          return updated;
        },
      ),
      updateMany: jest.fn(async () => ({ count: 1 })),
      count: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const scope = where.scope as string;
        return (store['all'] ?? []).filter(
          (r) =>
            r.scope === scope &&
            (where.lifecycle ? r.lifecycle === where.lifecycle : true),
        ).length;
      }),
    },
    seed(rows: ReturnType<typeof atomRow>[]) {
      store['all'] = rows;
    },
    store,
  };
  return prisma;
}

describe('MemoryService', () => {
  it('scope 归一：projectId → project:{id}，无 → global', () => {
    expect(memoryScope('p1')).toBe('project:p1');
    expect(memoryScope()).toBe('global');
  });

  it('召回：项目域可带 global 共享档，只回 working，按 pinned>confidence 排序', async () => {
    const prisma = buildPrisma();
    prisma.seed([
      atomRow({ id: 'a', content: '偏好 A', confidence: 0.6 }),
      atomRow({
        id: 'b',
        content: '全局偏好',
        scope: 'global',
        confidence: 0.9,
      }),
      atomRow({
        id: 'c',
        content: '钉住结论',
        type: 'conclusion',
        pinned: true,
        confidence: 0.5,
      }),
      atomRow({ id: 'd', content: '已归档', lifecycle: 'archived' }),
    ]);
    const service = new MemoryService(prisma as unknown as PrismaService);
    const items = await service.recall({ projectId: 'p1' });
    expect(items.map((i) => i.id)).toEqual(['c', 'b', 'a']);
    // 命中保鲜：hits 递增被调用
    expect(prisma.memoryAtom.updateMany).toHaveBeenCalled();
  });

  it('召回：查无结果如实返回空数组', async () => {
    const prisma = buildPrisma();
    const service = new MemoryService(prisma as unknown as PrismaService);
    expect(await service.recall({ projectId: 'p1', query: '不存在' })).toEqual(
      [],
    );
  });

  it('note：同 scope+type+归一化正文去重 → 提升置信度而非重复插入', async () => {
    const prisma = buildPrisma();
    prisma.seed([
      atomRow({
        content: '接口风格用 REST',
        type: 'conclusion',
        confidence: 0.6,
      }),
    ]);
    const service = new MemoryService(prisma as unknown as PrismaService);

    const merged = await service.note({
      projectId: 'p1',
      type: 'conclusion',
      content: '  接口风格用  REST  ',
      confidence: 0.9,
    });
    expect(merged.id).toBe('mem1');
    expect(merged.confidence).toBe(0.9);
    expect(prisma.memoryAtom.create).not.toHaveBeenCalled();

    const created = await service.note({
      projectId: 'p1',
      type: 'conclusion',
      content: '全新结论',
    });
    expect(created.id).toBe('mem2');
  });

  it('note：未知类型 400 口径拒绝', async () => {
    const service = new MemoryService(
      buildPrisma() as unknown as PrismaService,
    );
    await expect(
      service.note({ projectId: 'p1', type: 'secret', content: 'xx' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('brief：钉住优先 + 最新记忆 + 计数', async () => {
    const prisma = buildPrisma();
    prisma.seed([
      atomRow({
        id: 'pin',
        content: '钉住的约定',
        type: 'conclusion',
        pinned: true,
      }),
      atomRow({ id: 'new', content: '最新纪要', type: 'summary' }),
      atomRow({ id: 'old', content: '归档旧忆', lifecycle: 'archived' }),
    ]);
    const service = new MemoryService(prisma as unknown as PrismaService);
    const brief = await service.brief('p1');
    expect(brief.scope).toBe('project:p1');
    expect(brief.pinned.map((p) => p.id)).toEqual(['pin']);
    expect(brief.recent.map((r) => r.id)).toContain('new');
    expect(brief.counts).toEqual({ total: 3, working: 2 });
  });

  it('remove：软删为 pruned', async () => {
    const prisma = buildPrisma();
    prisma.seed([atomRow()]);
    const service = new MemoryService(prisma as unknown as PrismaService);
    const removed = await service.remove('mem1');
    expect(removed.lifecycle).toBe('pruned');
  });
});
