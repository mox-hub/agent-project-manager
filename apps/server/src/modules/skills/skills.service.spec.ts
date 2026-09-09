/**
 * Skills Service 单测：CRUD / 内置种子 / 本地 SKILL.md 导入（frontmatter 解析）
 */

import { vi } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SkillsService, parseSkillMarkdown } from './skills.service';
import type { PrismaService } from '@/core/database/prisma.service';
import type { MessageBusService } from '@/core/message-bus/message-bus.service';

vi.mock('node:fs', () => ({
  promises: { readFile: vi.fn() },
  default: {},
}));

import { promises as fs } from 'node:fs';

const readFileMock = vi.mocked(fs.readFile);

function makePrisma() {
  const store = new Map<string, Record<string, unknown>>();
  const clone = (row: Record<string, unknown>) => ({
    createdAt: new Date(),
    updatedAt: new Date(),
    description: null,
    category: 'Development',
    content: null,
    sourcePath: null,
    ...row,
  });
  return {
    store,
    skillConfig: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        const row = store.get(where.key);
        return row ? clone(row) : null;
      }),
      findMany: vi.fn(async () =>
        [...store.values()]
          .sort((a, b) => String(a.key).localeCompare(String(b.key)))
          .map(clone),
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        store.set(String(data.key), { ...data });
        return clone(data);
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { key: string };
          data: Record<string, unknown>;
        }) => {
          const row = store.get(where.key);
          if (!row) throw new Error('record not found');
          const next = { ...row, ...data };
          store.set(where.key, next);
          return clone(next);
        },
      ),
      delete: vi.fn(async ({ where }: { where: { key: string } }) => {
        const row = store.get(where.key);
        if (!row) throw new Error('record not found');
        store.delete(where.key);
        return clone(row);
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
        }: {
          where: { key: string };
          create: Record<string, unknown>;
        }) => {
          if (!store.has(where.key)) store.set(where.key, { ...create });
          return clone(create);
        },
      ),
    },
  };
}

function makeService(prisma = makePrisma()) {
  const messageBus = { publish: vi.fn() };
  const service = new SkillsService(
    prisma as unknown as PrismaService,
    messageBus as unknown as MessageBusService,
  );
  return { service, prisma, messageBus };
}

describe('SkillsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('onModuleInit 内置种子', () => {
    it('幂等写入 8 个内置技能，grilling 携带驱动指令', async () => {
      const { service, prisma } = makeService();
      await service.onModuleInit();
      expect(prisma.skillConfig.upsert).toHaveBeenCalledTimes(8);
      const grilling = prisma.store.get('grilling') as { content?: string };
      expect(grilling).toBeDefined();
      expect(grilling.content).toContain('一次只问一个问题');
      expect(grilling.content).toContain('"done"');
    });

    it('已存在的 key 不覆盖用户改动（update 分支为空）', async () => {
      const { service, prisma } = makeService();
      prisma.store.set('code-review', {
        key: 'code-review',
        name: '用户改过的名字',
        source: 'builtin',
        enabled: false,
      });
      await service.onModuleInit();
      const row = prisma.store.get('code-review') as {
        name: string;
        enabled: boolean;
      };
      expect(row.name).toBe('用户改过的名字');
      expect(row.enabled).toBe(false);
    });

    it('种子失败仅告警不抛出', async () => {
      const { service, prisma } = makeService();
      prisma.skillConfig.upsert = vi
        .fn()
        .mockRejectedValue(new Error('db down'));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('listSkills / getSkill', () => {
    it('列表映射为轻量 SkillStatus（不含 content）', async () => {
      const { service, prisma } = makeService();
      prisma.store.set('grilling', {
        key: 'grilling',
        name: 'Grilling 需求拷问',
        source: 'builtin',
        content: '指令全文',
      });
      const list = await service.listSkills();
      expect(list).toHaveLength(1);
      expect(list[0]).not.toHaveProperty('content');
      expect(list[0].source).toBe('builtin');
    });

    it('getSkill 返回全量（含 content/sourcePath），未知 key 404', async () => {
      const { service, prisma } = makeService();
      prisma.store.set('imported', {
        key: 'imported',
        name: 'Imported',
        source: 'custom',
        content: '正文',
        sourcePath: 'C:/skills/imported/SKILL.md',
      });
      const detail = await service.getSkill('imported');
      expect(detail.content).toBe('正文');
      expect(detail.sourcePath).toBe('C:/skills/imported/SKILL.md');
      await expect(service.getSkill('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSkill', () => {
    it('成功创建 custom 技能并发布事件', async () => {
      const { service, messageBus } = makeService();
      const created = await service.createSkill({
        key: 'my-skill',
        name: 'My Skill',
        content: '指令',
      });
      expect(created.source).toBe('custom');
      expect(created.content).toBe('指令');
      expect(created.enabled).toBe(true);
      expect(messageBus.publish).toHaveBeenCalledWith('skill.updated', {
        key: 'my-skill',
        action: 'created',
      });
    });

    it('key 冲突 409', async () => {
      const { service, prisma } = makeService();
      prisma.store.set('dup', { key: 'dup', name: 'Dup', source: 'custom' });
      await expect(
        service.createSkill({ key: 'dup', name: 'Dup2' }),
      ).rejects.toThrow(ConflictException);
    });

    it('缺 content 但给 sourcePath 时读文件物化', async () => {
      const { service } = makeService();
      readFileMock.mockResolvedValueOnce(
        '---\nname: File Skill\n---\n正文内容',
      );
      const created = await service.createSkill({
        key: 'from-file',
        name: 'From File',
        sourcePath: 'C:/skills/from-file/SKILL.md',
      });
      expect(created.content).toBe('正文内容');
      expect(created.sourcePath).toBe('C:/skills/from-file/SKILL.md');
    });
  });

  describe('importSkill', () => {
    it('frontmatter 提供 name/description，正文作 content', async () => {
      const { service } = makeService();
      readFileMock.mockResolvedValueOnce(
        '---\nname: Grill Me\ndescription: "A relentless interview."\n---\n# 指令\n一次一问。',
      );
      const imported = await service.importSkill({
        sourcePath: 'C:/skills/grill-me/SKILL.md',
        key: 'grill-me',
      });
      expect(imported.name).toBe('Grill Me');
      expect(imported.description).toBe('A relentless interview.');
      expect(imported.content).toBe('# 指令\n一次一问。');
      expect(imported.sourcePath).toBe('C:/skills/grill-me/SKILL.md');
    });

    it('显式 dto 值覆盖 frontmatter', async () => {
      const { service } = makeService();
      readFileMock.mockResolvedValueOnce('---\nname: From File\n---\n正文');
      const imported = await service.importSkill({
        sourcePath: 'C:/skills/x/SKILL.md',
        key: 'x',
        name: '显式名',
      });
      expect(imported.name).toBe('显式名');
    });

    it('key 缺省时从目录名派生（SKILL.md → 目录名）', async () => {
      const { service } = makeService();
      readFileMock.mockResolvedValueOnce('只有正文');
      const imported = await service.importSkill({
        sourcePath: 'C:/skills/My Cool Skill/SKILL.md',
      });
      expect(imported.key).toBe('my-cool-skill');
    });

    it('文件不可读 400', async () => {
      const { service } = makeService();
      readFileMock.mockRejectedValueOnce(new Error('ENOENT'));
      await expect(
        service.importSkill({ sourcePath: 'C:/nope/SKILL.md', key: 'nope' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('导入撞已有 key 409', async () => {
      const { service, prisma } = makeService();
      prisma.store.set('taken', {
        key: 'taken',
        name: 'Taken',
        source: 'builtin',
      });
      readFileMock.mockResolvedValueOnce('正文');
      await expect(
        service.importSkill({
          sourcePath: 'C:/skills/taken/SKILL.md',
          key: 'taken',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateSkill', () => {
    it('支持更新 content 与 sourcePath', async () => {
      const { service, prisma } = makeService();
      prisma.store.set('s1', { key: 's1', name: 'S1', source: 'custom' });
      const updated = await service.updateSkill('s1', {
        content: '新指令',
        sourcePath: 'C:/skills/s1/SKILL.md',
      });
      expect(updated.name).toBe('S1');
      const row = prisma.store.get('s1') as { content?: string };
      expect(row.content).toBe('新指令');
    });

    it('未知 key 404', async () => {
      const { service } = makeService();
      await expect(
        service.updateSkill('ghost', { enabled: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeSkill', () => {
    it('builtin 禁删 403', async () => {
      const { service, prisma } = makeService();
      prisma.store.set('grilling', {
        key: 'grilling',
        name: 'G',
        source: 'builtin',
      });
      await expect(service.removeSkill('grilling')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('custom 可删并发布事件；未知 key 404', async () => {
      const { service, prisma, messageBus } = makeService();
      prisma.store.set('mine', { key: 'mine', name: 'M', source: 'custom' });
      await expect(service.removeSkill('mine')).resolves.toEqual({
        key: 'mine',
        deleted: true,
      });
      expect(prisma.store.has('mine')).toBe(false);
      expect(messageBus.publish).toHaveBeenCalledWith('skill.updated', {
        key: 'mine',
        action: 'deleted',
      });
      await expect(service.removeSkill('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

describe('parseSkillMarkdown', () => {
  it('解析 frontmatter 并剥离引号', () => {
    const parsed = parseSkillMarkdown(
      '---\nname: Grill\ndescription: " quoted "\n---\nBODY',
    );
    expect(parsed.name).toBe('Grill');
    expect(parsed.description).toBe('quoted');
    expect(parsed.body).toBe('BODY');
  });

  it('无 frontmatter 时全文返回，兼容 CRLF 与 BOM', () => {
    const parsed = parseSkillMarkdown('\uFEFF# 标题\r\n正文');
    expect(parsed.body).toBe('# 标题\n正文');
  });
});
