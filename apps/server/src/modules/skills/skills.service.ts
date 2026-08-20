/**
 * Skills Service
 *
 * AI 技能注册表：模块启动时幂等写入内置技能（与前端既有形态对齐），
 * 支持 list / update（开关、改名、描述、分类）。
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { UpdateSkillDto } from './dto/update-skill.dto';

export interface SkillStatus {
  key: string;
  name: string;
  description?: string;
  category: string;
  source: 'builtin' | 'custom';
  enabled: boolean;
  updatedAt: string;
}

/** 内置技能清单（key 与前端历史 mock 对齐） */
const BUILTIN_SKILLS: Array<{
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
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
];

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
    return rows.map((row) => ({
      key: row.key,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category,
      source: row.source as 'builtin' | 'custom',
      enabled: row.enabled,
      updatedAt: row.updatedAt.toISOString(),
    }));
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
      },
    });

    this.messageBus.publish('skill.updated', { key, action: 'updated' });

    return {
      key: updated.key,
      name: updated.name,
      description: updated.description ?? undefined,
      category: updated.category,
      source: updated.source as 'builtin' | 'custom',
      enabled: updated.enabled,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
