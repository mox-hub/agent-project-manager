import { ProfileService } from './profile.service';
import { PrismaService } from '../../core/database/prisma.service';
import { validateProfileDraft } from './profile-draft.schema';
import { NotFoundException } from '@nestjs/common';

/** 项目档案单测：槽位聚合/完备度、审批状态机、替换链、考古产物校验与落草稿 */

const atomRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'atom1',
  scope: 'project:p1',
  type: 'capability',
  slot: 'tech-stack',
  content: '前端 React 19 + Vite 7',
  confidence: 1,
  refs: null,
  sourceEventId: null,
  sourceType: 'manual',
  lifecycle: 'consolidated',
  pinned: false,
  supersededById: null,
  createdAt: new Date('2026-09-07T00:00:00Z'),
  updatedAt: new Date('2026-09-07T00:00:00Z'),
  ...overrides,
});

function buildPrisma() {
  let seq = 100;
  const store: { atoms: ReturnType<typeof atomRow>[] } = { atoms: [] };
  const findMany = jest.fn(
    async (args: {
      where: {
        scope: { in?: string[] } | string;
        slot?: { in?: string[] };
        lifecycle?: { in?: string[] } | { not?: string };
      };
    }) => {
      const where = args.where;
      const scopeFilter = where.scope as { in?: string[] } | string;
      const scopes =
        typeof scopeFilter === 'string'
          ? [scopeFilter]
          : (scopeFilter.in ?? []);
      let rows = store.atoms.filter((r) => scopes.includes(r.scope));
      if (where.slot?.in)
        rows = rows.filter((r) => r.slot && where.slot!.in!.includes(r.slot));
      const lc = where.lifecycle as
        { in?: string[] } | { not?: string } | undefined;
      if (lc && 'in' in lc && lc.in)
        rows = rows.filter((r) => lc.in!.includes(r.lifecycle));
      if (lc && 'not' in lc && lc.not)
        rows = rows.filter((r) => r.lifecycle !== lc.not);
      return [...rows].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      );
    },
  );
  const findFirst = jest.fn(
    async (args: {
      where: {
        scope: string;
        slot: string;
        content: string;
        lifecycle: { in: string[] };
      };
    }) => {
      const w = args.where;
      return (
        store.atoms.find(
          (r) =>
            r.scope === w.scope &&
            r.slot === w.slot &&
            r.content === w.content &&
            w.lifecycle.in.includes(r.lifecycle),
        ) ?? null
      );
    },
  );
  const prisma = {
    memoryAtom: {
      findMany,
      findFirst,
      findUnique: jest.fn(
        async (args: { where: { id: string } }) =>
          store.atoms.find((r) => r.id === args.where.id) ?? null,
      ),
      create: jest.fn(async (args: { data: Record<string, unknown> }) => {
        const row = atomRow({
          id: `atom${seq++}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Record<string, unknown>);
        store.atoms.push(row);
        return row;
      }),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = store.atoms.find((r) => r.id === args.where.id);
          if (!row) throw new Error('not found');
          Object.assign(row, args.data);
          return row;
        },
      ),
    },
    execution: {
      findUnique: jest.fn(),
    },
    activity: {
      create: jest.fn(async () => ({})),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prisma),
    ),
  };
  return { prisma, store };
}

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: ReturnType<typeof buildPrisma>;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new ProfileService(prisma.prisma as unknown as PrismaService);
  });

  describe('getProfile / 完备度派生', () => {
    it('按槽位分组：生效原子与草稿分离，完备度只数生效槽位', async () => {
      prisma.store.atoms.push(
        atomRow({ id: 'a1', slot: 'tech-stack', lifecycle: 'consolidated' }),
        atomRow({ id: 'a2', slot: 'tech-stack', lifecycle: 'working' }),
      );
      const profile = await service.getProfile('p1');
      expect(profile.slots).toHaveLength(5);
      const tech = profile.slots.find((s) => s.slot === 'tech-stack')!;
      expect(tech.atoms).toHaveLength(1);
      expect(tech.drafts).toHaveLength(1);
      expect(tech.filled).toBe(true);
      expect(profile.completeness).toEqual({ filled: 1, total: 5 });
    });

    it('被替换（superseded）的原子从分组中归并消失', async () => {
      prisma.store.atoms.push(
        atomRow({ id: 'old', lifecycle: 'archived', supersededById: 'new' }),
        atomRow({ id: 'new', lifecycle: 'consolidated' }),
      );
      const profile = await service.getProfile('p1');
      const tech = profile.slots.find((s) => s.slot === 'tech-stack')!;
      expect(tech.atoms.map((a) => a.id)).toEqual(['new']);
    });
  });

  describe('createAtom / 编辑替换链', () => {
    it('人写直接生效（consolidated、confidence=1）', async () => {
      const atom = await service.createAtom(
        {
          projectId: 'p1',
          slot: 'conventions',
          content: '提交走 conventional commits',
        },
        'u1',
      );
      expect(atom.lifecycle).toBe('consolidated');
      expect(atom.confidence).toBe(1);
      expect(atom.sourceType).toBe('manual');
    });

    it('同槽位同内容去重：提升置信度而非重复插入', async () => {
      prisma.store.atoms.push(atomRow({ id: 'exist', confidence: 0.6 }));
      const atom = await service.createAtom(
        {
          projectId: 'p1',
          slot: 'tech-stack',
          content: '前端 React 19 + Vite 7',
        },
        'u1',
      );
      expect(atom.id).toBe('exist');
      expect(atom.confidence).toBe(1);
    });

    it('编辑生效原子：新建替换 + 旧值 archived 且 supersededById 指向新原子', async () => {
      prisma.store.atoms.push(atomRow({ id: 'old', content: '旧表述' }));
      const replacement = await service.editAtom(
        'old',
        { content: '新表述' },
        'u1',
      );
      expect(replacement.content).toBe('新表述');
      expect(replacement.lifecycle).toBe('consolidated');
      const old = prisma.store.atoms.find((r) => r.id === 'old')!;
      expect(old.lifecycle).toBe('archived');
      expect(old.supersededById).toBe(replacement.id);
    });
  });

  describe('审批状态机', () => {
    it('批准草稿：working → consolidated', async () => {
      prisma.store.atoms.push(
        atomRow({
          id: 'd1',
          lifecycle: 'working',
          sourceType: 'tool',
          confidence: 0.5,
        }),
      );
      const atom = await service.approveAtom('d1', 'u1');
      expect(atom.lifecycle).toBe('consolidated');
      expect(atom.confidence).toBe(0.8);
    });

    it('非草稿不可批准/驳回', async () => {
      prisma.store.atoms.push(atomRow({ id: 'c1', lifecycle: 'consolidated' }));
      await expect(service.approveAtom('c1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.rejectAtom('c1', {}, 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('驳回草稿：working → archived', async () => {
      prisma.store.atoms.push(atomRow({ id: 'd2', lifecycle: 'working' }));
      const atom = await service.rejectAtom('d2', { reason: '证据不足' }, 'u1');
      expect(atom.lifecycle).toBe('archived');
    });
  });

  describe('考古产物校验', () => {
    it('合法产物通过校验', () => {
      const result = validateProfileDraft({
        schemaVersion: 1,
        slots: [
          {
            slot: 'tech-stack',
            items: [{ content: 'SQLite + Prisma 6', confidence: 0.6 }],
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('非法槽位与空 content 被拒', () => {
      const result = validateProfileDraft({
        schemaVersion: 1,
        slots: [
          { slot: 'not-a-slot', items: [{ content: 'x' }] },
          { slot: 'risks', items: [{ content: '  ' }] },
        ],
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors).toHaveLength(2);
    });
  });

  describe('ingestArchaeology / 拉取式落草稿', () => {
    it('产物落 working 草稿：confidence clamp 0.6、溯源 executionId；已存在去重 skip', async () => {
      prisma.prisma.execution.findUnique.mockResolvedValue({
        id: 'exec1',
        projectId: 'p1',
        output: null,
        artifacts: [
          {
            artifactType: 'profile_draft',
            metadata: {
              schemaVersion: 1,
              slots: [
                {
                  slot: 'tech-stack',
                  items: [
                    {
                      content: '前端 React 19 + Vite 7',
                      confidence: 0.6,
                      evidence: 'package.json',
                    },
                    { content: '全新事实', confidence: 0.9 },
                  ],
                },
              ],
            },
          },
        ],
      });
      prisma.store.atoms.push(
        atomRow({ id: 'exist', content: '前端 React 19 + Vite 7' }),
      );

      const result = await service.ingestArchaeology('p1', 'exec1', 'u1');
      expect(result.skipped).toBe(1);
      expect(result.created).toBe(1);
      const atom = result.atoms[0];
      expect(atom.lifecycle).toBe('working');
      expect(atom.confidence).toBe(0.6);
      expect(atom.sourceEventId).toBe('exec1');
      expect(atom.sourceType).toBe('tool');
    });

    it('产物校验失败时诚实报错', async () => {
      prisma.prisma.execution.findUnique.mockResolvedValue({
        id: 'exec2',
        projectId: 'p1',
        output: { bad: true },
        artifacts: [],
      });
      await expect(
        service.ingestArchaeology('p1', 'exec2', 'u1'),
      ).rejects.toThrow(/校验失败/);
    });
  });
});
