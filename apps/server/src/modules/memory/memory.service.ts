import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateMemoryDto,
  MEMORY_TYPES,
  MemoryAtomDto,
  UpdateMemoryDto,
} from './dto/memory.dto';

/**
 * 记忆 Store B（AI 同事化）：应用侧长期记忆库。
 * 铁律：真相在数据库只有代码能写，模型只读；写入不在热路径——
 * 消化器离线沉淀（ai-hub 的 assistant-memory-digest），这里提供原子 CRUD
 * 与两条召回路径（scope+type 扫描便宜，关键词 contains 兜底；embedding 后置）。
 * 查无结果如实返回空，绝不编（诚实边界）。
 */

const DEFAULT_RECALL_LIMIT = 8;
const MAX_LIMIT = 50;

export function memoryScope(projectId?: string | null): string {
  return projectId ? `project:${projectId}` : 'global';
}

function toDto(row: {
  id: string;
  scope: string;
  type: string;
  content: string;
  confidence: number;
  refs: unknown;
  sourceEventId: string | null;
  sourceType: string | null;
  lifecycle: string;
  pinned: boolean;
  hits: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}): MemoryAtomDto {
  return {
    id: row.id,
    scope: row.scope,
    type: row.type,
    content: row.content,
    confidence: row.confidence,
    refs: row.refs ?? undefined,
    sourceEventId: row.sourceEventId ?? undefined,
    sourceType: row.sourceType ?? undefined,
    lifecycle: row.lifecycle,
    pinned: row.pinned,
    hits: row.hits,
    lastUsedAt: row.lastUsedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/** 正文归一化：去重防"不同写法绕晕 AI"（v1 精确匹配，聚类归一后置） */
function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 召回：scope 命名空间隔离（项目域可带 global 共享档），working 生命周期，
   * pinned > confidence > lastUsedAt 排序；命中后异步保鲜（hits+1 / lastUsedAt）。
   */
  async recall(params: {
    projectId?: string | null;
    scope?: string | null;
    type?: string | null;
    query?: string | null;
    limit?: number | null;
  }): Promise<MemoryAtomDto[]> {
    const scope = params.scope ?? memoryScope(params.projectId);
    const scopes = scope.startsWith('project:') ? [scope, 'global'] : [scope];
    const limit = Math.min(
      Math.max(1, Number(params.limit ?? DEFAULT_RECALL_LIMIT)),
      MAX_LIMIT,
    );

    const rows = await this.prisma.memoryAtom.findMany({
      where: {
        scope: { in: scopes },
        lifecycle: 'working',
        ...(params.type ? { type: params.type } : {}),
        ...(params.query ? { content: { contains: params.query } } : {}),
      },
      orderBy: [
        { pinned: 'desc' },
        { confidence: 'desc' },
        { lastUsedAt: 'desc' },
      ],
      take: limit,
    });

    if (rows.length > 0) {
      // 保鲜是旁路：失败不影响召回
      this.prisma.memoryAtom
        .updateMany({
          where: { id: { in: rows.map((r) => r.id) } },
          data: { hits: { increment: 1 }, lastUsedAt: new Date() },
        })
        .catch((err: unknown) =>
          this.logger.warn(
            `memory touch failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    }
    return rows.map(toDto);
  }

  /**
   * 记录一条原子（消化器/tool/人共用）：scope+type+归一化正文去重——
   * 重复记录提升置信度而非新插（防记忆膨胀的最低门槛）。
   */
  async note(input: {
    projectId?: string | null;
    type: string;
    content: string;
    confidence?: number | null;
    refs?: Array<{ kind: string; id: string }> | null;
    sourceEventId?: string | null;
    sourceType?: string | null;
    createdBy?: string | null;
  }): Promise<MemoryAtomDto> {
    if (!MEMORY_TYPES.includes(input.type as (typeof MEMORY_TYPES)[number])) {
      throw new NotFoundException(
        `未知记忆类型：${input.type}（可用：${MEMORY_TYPES.join('、')}）`,
      );
    }
    const scope = memoryScope(input.projectId);
    const content = normalizeContent(input.content);

    const existing = await this.prisma.memoryAtom.findFirst({
      where: {
        scope,
        type: input.type,
        content,
        lifecycle: { in: ['working', 'consolidated'] },
      },
    });
    if (existing) {
      const updated = await this.prisma.memoryAtom.update({
        where: { id: existing.id },
        data: {
          confidence: Math.max(existing.confidence, input.confidence ?? 0.8),
          ...(input.sourceEventId
            ? { sourceEventId: input.sourceEventId }
            : {}),
        },
      });
      return toDto(updated);
    }

    const created = await this.prisma.memoryAtom.create({
      data: {
        scope,
        type: input.type,
        content,
        confidence: input.confidence ?? 0.8,
        refs: (input.refs ?? undefined) as unknown as undefined,
        sourceEventId: input.sourceEventId ?? undefined,
        sourceType: input.sourceType ?? 'manual',
        createdBy: input.createdBy ?? undefined,
      },
    });
    return toDto(created);
  }

  /** handover brief（交接摘要，一等公民）：钉住优先 + 最新 summary/结论 + 计数 */
  async brief(projectId?: string | null): Promise<{
    scope: string;
    pinned: MemoryAtomDto[];
    recent: MemoryAtomDto[];
    counts: { total: number; working: number };
  }> {
    const scope = memoryScope(projectId);
    const [pinned, recent, total, working] = await Promise.all([
      this.prisma.memoryAtom.findMany({
        where: { scope, lifecycle: 'working', pinned: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.memoryAtom.findMany({
        where: { scope, lifecycle: 'working' },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      this.prisma.memoryAtom.count({ where: { scope } }),
      this.prisma.memoryAtom.count({ where: { scope, lifecycle: 'working' } }),
    ]);
    return {
      scope,
      pinned: pinned.map(toDto),
      recent: recent.map(toDto),
      counts: { total, working },
    };
  }

  /** 人可检视：列表（含 archived，不含 pruned） */
  async list(params: {
    projectId?: string | null;
    type?: string | null;
    lifecycle?: string | null;
    limit?: number | null;
    offset?: number | null;
  }): Promise<{ items: MemoryAtomDto[]; total: number }> {
    const scope = memoryScope(params.projectId);
    const where = {
      scope,
      ...(params.type ? { type: params.type } : {}),
      ...(params.lifecycle
        ? { lifecycle: params.lifecycle }
        : { lifecycle: { not: 'pruned' } }),
    };
    const limit = Math.min(Math.max(1, Number(params.limit ?? 50)), 200);
    const offset = Math.max(0, Number(params.offset ?? 0));
    const [rows, total] = await Promise.all([
      this.prisma.memoryAtom.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.memoryAtom.count({ where }),
    ]);
    return { items: rows.map(toDto), total };
  }

  /** 人可改（置信度/钉住/归档/修正正文）——档案的主人 */
  async update(id: string, dto: UpdateMemoryDto): Promise<MemoryAtomDto> {
    const row = await this.prisma.memoryAtom.update({
      where: { id },
      data: {
        ...(dto.confidence != null ? { confidence: dto.confidence } : {}),
        ...(dto.lifecycle ? { lifecycle: dto.lifecycle } : {}),
        ...(dto.pinned != null ? { pinned: dto.pinned } : {}),
        ...(dto.content ? { content: normalizeContent(dto.content) } : {}),
      },
    });
    return toDto(row);
  }

  /** 遗忘是功能：软删（pruned，证据可查不注入） */
  async remove(id: string): Promise<MemoryAtomDto> {
    const row = await this.prisma.memoryAtom.update({
      where: { id },
      data: { lifecycle: 'pruned' },
    });
    return toDto(row);
  }
}
