/**
 * Skills Service
 *
 * AI 技能注册表：模块启动时幂等写入内置技能（与前端既有形态对齐），
 * 支持 list / create / get / update / remove / import（本地 SKILL.md 路径导入）。
 * content 物化入 DB（grill 等场景经 instructions 注入 AI 会话），sourcePath 仅留档。
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { ImportSkillDto } from './dto/import-skill.dto';

export interface SkillStatus {
  key: string;
  name: string;
  description?: string;
  category: string;
  source: 'builtin' | 'custom';
  enabled: boolean;
  updatedAt: string;
}

/** GET /skills/:key 的全量形态（含指令正文与来源路径） */
export interface SkillDetail extends SkillStatus {
  content?: string;
  sourcePath?: string;
}

/** 内置技能清单（key 与前端历史 mock 对齐） */
const BUILTIN_SKILLS: Array<{
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  content?: string;
}> = [
  {
    key: 'code-review',
    name: 'Code Review',
    description: 'Analyze code for quality and bugs',
    category: 'Development',
    enabled: true,
  },
  {
    key: 'bug-analysis',
    name: 'Bug Analysis',
    description: 'Debug and analyze error reports',
    category: 'Development',
    enabled: true,
  },
  {
    key: 'test-gen',
    name: 'Test Generation',
    description: 'Generate unit and integration tests',
    category: 'Development',
    enabled: true,
  },
  {
    key: 'doc-gen',
    name: 'Documentation',
    description: 'Generate code documentation',
    category: 'Development',
    enabled: false,
  },
  {
    key: 'refactor',
    name: 'Refactoring',
    description: 'Suggest code improvements',
    category: 'Development',
    enabled: false,
  },
  {
    key: 'pm-assist',
    name: 'PM Assistant',
    description: 'Help with project management',
    category: 'Management',
    enabled: true,
  },
  {
    key: 'planning',
    name: 'Sprint Planning',
    description: 'Assist with sprint planning',
    category: 'Management',
    enabled: false,
  },
  {
    key: 'grilling',
    name: 'Grilling 需求拷问',
    description:
      '连续追问把模糊想法拷问成边界清晰的需求摘要（CAP-P-01 grill 环节驱动指令）',
    category: 'Management',
    enabled: true,
    content: [
      '你是 APM 的需求拷问官（grill）。你的任务：通过连续追问，把用户一句模糊的想法拷问成一份边界清晰的需求摘要，让可能完全不懂工程的小白也能拿到靠谱的开工依据。',
      '',
      '铁律：',
      '1. 一次只问一个问题。',
      '2. 每个问题附 2~4 个候选选项——它们是你对用户想法的合理猜测（guess: true），选项只是降低思考负担，用户永远可以自由输入。',
      '3. 用大白话提问，禁止术语。不问「技术栈」「架构」，问「它大概长什么样」「在什么设备上用」。',
      '4. 追问维度按需覆盖、不要机械全问：要解决什么问题、给谁用、这一期做到哪、明确不做什么、有什么约束（时间/钱/必须用的东西）、怎么算做完了。',
      '5. 用户回答模糊时，用一个具体例子追问；用户明显不耐烦时，尽快收敛。',
      '6. 当你能不虚构地写出摘要时，置 done=true 并输出 summary，不再提问。',
      '',
      '输出 JSON（只输出 JSON，不要多余文字）：',
      '{',
      '  "done": false,',
      '  "question": "下一个问题",',
      '  "choices": [{"key": "a", "label": "选项", "sub": "补充说明", "guess": true}]',
      '}',
      'done=false 时只给 question + choices；done=true 时只给 summary：',
      '{',
      '  "done": true,',
      '  "summary": {',
      '    "name": "项目名（短）", "description": "一段话说清它是什么",',
      '    "goals": ["要达成的结果"], "users": ["给谁用"],',
      '    "scope": ["这一期做什么"], "nonGoals": ["明确不做什么"],',
      '    "constraints": ["约束"], "acceptanceHints": ["怎么算做完的线索"]',
      '  }',
      '}',
      'summary 各数组字段用简洁中文短句，宁缺毋假——没问到的维度留空数组。',
    ].join('\n'),
  },
];

/**
 * 解析 SKILL.md：提取 YAML frontmatter 的 name/description（行式 key: value），
 * 正文（frontmatter 之后的内容）作为指令全文；无 frontmatter 时全文返回。
 */
export function parseSkillMarkdown(raw: string): {
  name?: string;
  description?: string;
  body: string;
} {
  const normalized = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized);
  if (!match) {
    return { body: normalized.trim() };
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']/, '')
      .replace(/["']$/, '')
      .trim();
    if (key && value) meta[key] = value;
  }
  return {
    name: meta.name,
    description: meta.description,
    body: normalized.slice(match[0].length).trim(),
  };
}

@Injectable()
export class SkillsService implements OnModuleInit {
  private readonly logger = new Logger(SkillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  /**
   * 幂等写入内置技能（已存在的 key 不覆盖用户改动）
   */
  async onModuleInit(): Promise<void> {
    try {
      for (const skill of BUILTIN_SKILLS) {
        await this.prisma.skillConfig.upsert({
          where: { key: skill.key },
          create: { ...skill, source: 'builtin' },
          update: {},
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to seed builtin skills: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async listSkills(): Promise<SkillStatus[]> {
    const rows = await this.prisma.skillConfig.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => this.toStatus(row));
  }

  async getSkill(key: string): Promise<SkillDetail> {
    const row = await this.prisma.skillConfig.findUnique({ where: { key } });
    if (!row) {
      throw new NotFoundException(`Skill not found: ${key}`);
    }
    return {
      ...this.toStatus(row),
      content: row.content ?? undefined,
      sourcePath: row.sourcePath ?? undefined,
    };
  }

  async createSkill(dto: CreateSkillDto): Promise<SkillDetail> {
    const exists = await this.prisma.skillConfig.findUnique({
      where: { key: dto.key },
    });
    if (exists) {
      throw new ConflictException(`Skill key already exists: ${dto.key}`);
    }
    const content = await this.resolveContent(dto.content, dto.sourcePath);
    const row = await this.prisma.skillConfig.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description ?? dto.name,
        category: dto.category ?? 'Development',
        source: 'custom',
        enabled: true,
        ...(content !== undefined ? { content } : {}),
        ...(dto.sourcePath !== undefined ? { sourcePath: dto.sourcePath } : {}),
      },
    });
    this.messageBus.publish('skill.updated', {
      key: row.key,
      action: 'created',
    });
    return {
      ...this.toStatus(row),
      content: row.content ?? undefined,
      sourcePath: row.sourcePath ?? undefined,
    };
  }

  /** 从本地 SKILL.md 导入：frontmatter 提供默认 name/description，dto 显式值覆盖 */
  async importSkill(dto: ImportSkillDto): Promise<SkillDetail> {
    const raw = await this.readLocalFile(dto.sourcePath);
    const parsed = parseSkillMarkdown(raw);
    const key = dto.key ?? this.deriveKeyFromPath(dto.sourcePath);
    const name = dto.name ?? parsed.name ?? key;
    return this.createSkill({
      key,
      name,
      description: dto.description ?? parsed.description,
      category: dto.category,
      content: parsed.body,
      sourcePath: dto.sourcePath,
    });
  }

  async updateSkill(key: string, dto: UpdateSkillDto): Promise<SkillStatus> {
    const existing = await this.prisma.skillConfig.findUnique({
      where: { key },
    });
    if (!existing) {
      throw new NotFoundException(`Skill not found: ${key}`);
    }

    const updated = await this.prisma.skillConfig.update({
      where: { key },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.sourcePath !== undefined ? { sourcePath: dto.sourcePath } : {}),
      },
    });

    this.messageBus.publish('skill.updated', { key, action: 'updated' });

    return this.toStatus(updated);
  }

  async removeSkill(key: string): Promise<{ key: string; deleted: boolean }> {
    const existing = await this.prisma.skillConfig.findUnique({
      where: { key },
    });
    if (!existing) {
      throw new NotFoundException(`Skill not found: ${key}`);
    }
    if (existing.source === 'builtin') {
      throw new ForbiddenException(
        `Builtin skill cannot be deleted: ${key}（可禁用）`,
      );
    }
    await this.prisma.skillConfig.delete({ where: { key } });
    this.messageBus.publish('skill.updated', { key, action: 'deleted' });
    return { key, deleted: true };
  }

  private toStatus(row: {
    key: string;
    name: string;
    description: string | null;
    category: string;
    source: string;
    enabled: boolean;
    updatedAt: Date;
  }): SkillStatus {
    return {
      key: row.key,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category,
      source: row.source as 'builtin' | 'custom',
      enabled: row.enabled,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** content 缺省但给了 sourcePath 时，读本地文件物化为 content */
  private async resolveContent(
    content: string | undefined,
    sourcePath: string | undefined,
  ): Promise<string | undefined> {
    if (content !== undefined) return content;
    if (sourcePath !== undefined) {
      const raw = await this.readLocalFile(sourcePath);
      return parseSkillMarkdown(raw).body;
    }
    return undefined;
  }

  private async readLocalFile(sourcePath: string): Promise<string> {
    try {
      return await fs.readFile(sourcePath, 'utf8');
    } catch (error) {
      throw new BadRequestException(
        `无法读取本地技能文件: ${sourcePath}（${error instanceof Error ? error.message : error}）`,
      );
    }
  }

  /** 从路径派生默认 key：取目录名或文件名（去扩展名），kebab 化 */
  private deriveKeyFromPath(sourcePath: string): string {
    const base = path.basename(sourcePath);
    const stem =
      base.toLowerCase() === 'skill.md'
        ? path.basename(path.dirname(sourcePath))
        : base.replace(/\.[^.]+$/, '');
    const key = stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return key || `imported-${Date.now()}`;
  }
}
