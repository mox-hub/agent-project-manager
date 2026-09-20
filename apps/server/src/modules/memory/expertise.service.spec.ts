import { ExpertiseService } from './expertise.service';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

/** 专长度档位单测：静默学习（忽略 3 次降密度 / 追问回升 / 手动抑制 / 恢复） */

function buildPrisma() {
  const store = new Map<
    string,
    {
      id: string;
      refs: Record<string, unknown>;
      confidence: number;
      lifecycle: string;
      updatedAt: Date;
    }
  >();
  let seq = 0;

  const prisma = {
    memoryAtom: {
      findMany: vi.fn(
        async ({ where }: { where: { scope: string; type: string } }) =>
          [...store.values()]
            .filter((r) => r.refs && (where.scope ? true : true))
            .map((r) => ({
              ...r,
              scope: 'scope',
              type: 'preference',
              content: 'x',
            })),
      ),
      findFirst: vi.fn(async ({ where }: { where: { content: string } }) => {
        for (const r of store.values()) {
          if ((r.refs as { __content?: string }).__content === where.content)
            return r;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `atom${++seq}`;
        const row = {
          id,
          refs: data.refs as Record<string, unknown>,
          confidence: data.confidence as number,
          lifecycle: 'working',
          updatedAt: new Date(),
        };
        (row.refs as { __content?: string }).__content = data.content as string;
        store.set(id, row);
        return row;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { refs: Record<string, unknown>; confidence: number };
        }) => {
          const row = store.get(where.id);
          if (!row) throw new Error('not found');
          const content = (row.refs as { __content?: string }).__content;
          row.refs = data.refs;
          (row.refs as { __content?: string }).__content = content;
          row.confidence = data.confidence;
          row.updatedAt = new Date();
          return row;
        },
      ),
    },
  };
  return { prisma, store };
}

function build() {
  const h = buildPrisma();
  const service = new ExpertiseService(h.prisma as unknown as PrismaService);
  return { service, ...h };
}

const LEVEL = async (
  service: ExpertiseService,
  domain: string,
): Promise<string> => {
  const res = await service.getExpertise('u1');
  return res.domains.find((d) => d.domain === domain)?.level ?? 'detailed';
};

describe('ExpertiseService', () => {
  it('默认全部领域 detailed', async () => {
    const { service } = build();
    const res = await service.getExpertise('u1');
    expect(res.domains.map((d) => d.domain)).toEqual([
      'requirements',
      'technical',
      'acceptance',
      'process',
    ]);
    expect(res.domains.every((d) => d.level === 'detailed')).toBe(true);
  });

  it('忽略 3 次自动降为 terse（前 2 次保持 detailed）', async () => {
    const { service } = build();
    await service.feedback('u1', { domain: 'acceptance', signal: 'ignored' });
    await service.feedback('u1', { domain: 'acceptance', signal: 'ignored' });
    expect(await LEVEL(service, 'acceptance')).toBe('detailed');
    await service.feedback('u1', { domain: 'acceptance', signal: 'ignored' });
    expect(await LEVEL(service, 'acceptance')).toBe('terse');
  });

  it('主动追问回升 detailed 且清零忽略计数', async () => {
    const { service } = build();
    for (let i = 0; i < 3; i++) {
      await service.feedback('u1', { domain: 'technical', signal: 'ignored' });
    }
    expect(await LEVEL(service, 'technical')).toBe('terse');
    await service.feedback('u1', { domain: 'technical', signal: 'asked' });
    const res = await service.getExpertise('u1');
    const technical = res.domains.find((d) => d.domain === 'technical');
    expect(technical?.level).toBe('detailed');
    expect(technical?.ignoreCount).toBe(0);
  });

  it('suppress 直写抑制，reset 恢复 detailed', async () => {
    const { service } = build();
    await service.feedback('u1', { domain: 'process', signal: 'suppress' });
    expect(await LEVEL(service, 'process')).toBe('suppressed');
    await service.feedback('u1', { domain: 'process', signal: 'reset' });
    expect(await LEVEL(service, 'process')).toBe('detailed');
  });

  it('同一领域原地更新不膨胀（只有一个原子）', async () => {
    const { service, store } = build();
    await service.feedback('u1', { domain: 'requirements', signal: 'ignored' });
    await service.feedback('u1', { domain: 'requirements', signal: 'ignored' });
    expect(store.size).toBe(1);
  });

  it('未知领域 / 未知信号拒绝', async () => {
    const { service } = build();
    await expect(
      service.feedback('u1', { domain: 'cooking', signal: 'ignored' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.feedback('u1', { domain: 'technical', signal: 'shout' }),
    ).rejects.toThrow(BadRequestException);
  });
});
