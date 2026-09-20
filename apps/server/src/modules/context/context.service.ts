/**
 * Context Service (DEPRECATED)
 *
 * 此服务已废弃，功能并入 AI Hub 模块的 ContextBuilderService。
 * 计划 Phase 2 合并到 ContextBuilderService。
 *
 * CAP-B-06（上下文时效性）：ContextPack 的 freshness 不再恒写 'realtime'，
 * 改为按各层数据源实际更新时间（updatedAt 等既有字段）与当前时间的差值
 * 映射到档位；无法取得可信时间戳时诚实降级为 'unknown'，绝不谎报。
 *
 * @deprecated 使用 AiHubModule 中的 ContextBuilderService
 */

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';

/**
 * 判龄时钟注入 token。函数类型参数若依赖 Nest 的反射类型元数据会被当作
 * `Function` token 解析而炸掉 AppModule 启动——必须经 @Inject 显式 token +
 * ContextModule providers 注册（见 CONTEXT_CLOCK_PROVIDER）。
 */
export const CONTEXT_CLOCK = 'CONTEXT_CLOCK';

/**
 * ContextPack freshness 档位词表（由新到旧：fresh > recent > stale）。
 * `unknown` 表示该层数据源无可信时间戳（空层/源不存在/时钟不可信），
 * 是「诚实降级」档位，语义上比 stale 更不可信。
 *
 * 向后兼容：旧实现恒写的 'realtime' 不再输出，读取侧经
 * normalizeContextFreshness 统一映射为 'fresh'。
 */
export type ContextFreshness = 'fresh' | 'recent' | 'stale' | 'unknown';

/** 可参与「最低档」排序的档位（unknown 不可排序，见 aggregateContextFreshness） */
export type RankedContextFreshness = Exclude<ContextFreshness, 'unknown'>;

/** 排序权重：值越大越旧 */
export const CONTEXT_FRESHNESS_RANK: Record<RankedContextFreshness, number> = {
  fresh: 0,
  recent: 1,
  stale: 2,
};

/** 旧词表兼容映射：恒写 'realtime' 的历史口径按 fresh 理解 */
const LEGACY_FRESHNESS_MAP: Record<string, ContextFreshness> = {
  realtime: 'fresh',
};

/**
 * 归一化历史 freshness 词表：'realtime' → 'fresh'；
 * 未知词表原样归为 unknown（不猜测、不谎报）。
 */
export function normalizeContextFreshness(
  raw: string | null | undefined,
): ContextFreshness {
  if (!raw) return 'unknown';
  if (raw in LEGACY_FRESHNESS_MAP) return LEGACY_FRESHNESS_MAP[raw];
  if (raw === 'fresh' || raw === 'recent' || raw === 'stale') return raw;
  return 'unknown';
}

/** 默认阈值（毫秒）：<1h fresh、<24h recent、更旧 stale */
export const DEFAULT_FRESH_MAX_AGE_MS = 60 * 60 * 1000;
export const DEFAULT_RECENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** 未来时间戳的时钟漂移容差：容差内按 fresh，超出视为不可信 */
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

function readThresholdFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface FreshnessThresholds {
  freshMaxAgeMs?: number;
  recentMaxAgeMs?: number;
}

function resolveThresholds(
  overrides?: FreshnessThresholds,
): Required<FreshnessThresholds> {
  return {
    freshMaxAgeMs:
      overrides?.freshMaxAgeMs ??
      readThresholdFromEnv(
        'CONTEXT_FRESH_MAX_AGE_MS',
        DEFAULT_FRESH_MAX_AGE_MS,
      ),
    recentMaxAgeMs:
      overrides?.recentMaxAgeMs ??
      readThresholdFromEnv(
        'CONTEXT_RECENT_MAX_AGE_MS',
        DEFAULT_RECENT_MAX_AGE_MS,
      ),
  };
}

/**
 * 数据源实龄 → freshness 档位。
 *
 * @param lastUpdatedAt 数据源最后更新时间（updatedAt/timestamp 等既有字段）
 * @param now 判定时钟（可注入以便测试）
 * @param thresholds 档位阈值（可注入以便测试；缺省读
 *   CONTEXT_FRESH_MAX_AGE_MS / CONTEXT_RECENT_MAX_AGE_MS，再缺省 1h/24h）
 * @returns 无可信时间戳（null/undefined/非法日期/超出容差的未来时间）一律
 *   'unknown'——诚实降级，绝不回落 'realtime'
 */
export function resolveFreshnessFromAge(
  lastUpdatedAt: Date | string | null | undefined,
  now: Date = new Date(),
  thresholds?: FreshnessThresholds,
): ContextFreshness {
  if (lastUpdatedAt == null) return 'unknown';
  const ts =
    lastUpdatedAt instanceof Date
      ? lastUpdatedAt.getTime()
      : Date.parse(lastUpdatedAt);
  if (!Number.isFinite(ts)) return 'unknown';

  const { freshMaxAgeMs, recentMaxAgeMs } = resolveThresholds(thresholds);
  const ageMs = now.getTime() - ts;
  if (ageMs < 0) {
    // 轻微时钟漂移按 fresh；明显未来时间戳说明时钟不可信 → unknown
    return ageMs >= -CLOCK_SKEW_TOLERANCE_MS ? 'fresh' : 'unknown';
  }
  if (ageMs < freshMaxAgeMs) return 'fresh';
  if (ageMs < recentMaxAgeMs) return 'recent';
  return 'stale';
}

/**
 * 各层 freshness 聚合为整体档位：取可排序层的最低档（最旧者）。
 * 诚实降级规则：存在 unknown 层时整体上限压到 recent——有层不可信就
 * 不得自称 fresh；全部层均 unknown（或无层）时整体为 unknown。
 */
export function aggregateContextFreshness(
  layers: ContextFreshness[],
): ContextFreshness {
  const ranked = layers.filter(
    (v): v is RankedContextFreshness => v !== 'unknown',
  );
  if (ranked.length === 0) return 'unknown';

  let worst = 'fresh' as RankedContextFreshness;
  for (const v of ranked) {
    if (CONTEXT_FRESHNESS_RANK[v] > CONTEXT_FRESHNESS_RANK[worst]) worst = v;
  }

  const hasUnknown = ranked.length !== layers.length;
  if (hasUnknown && worst === 'fresh') return 'recent';
  return worst;
}

/** 层数据 + 该层新鲜度判定基准（层内数据源最新更新时间；null = 无可信时间戳） */
interface LayerResult<T> {
  data: T;
  basis: Date | null;
}

@Injectable()
export class ContextService {
  private readonly DEFAULT_TOKEN_BUDGET = 128000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    /** 判龄时钟（可注入以便测试；生产为系统时间） */
    @Inject(CONTEXT_CLOCK) private readonly clock: () => Date,
  ) {}

  async buildContextPack(projectId: string, issueId?: string) {
    const [system, project, session, runtime] = await Promise.all([
      this.buildSystemContext(projectId),
      this.buildProjectContext(projectId, issueId),
      this.buildSessionContext(projectId, issueId),
      this.buildRuntimeContext(projectId),
    ]);

    const checkedAt = this.clock();
    const layerFreshness = {
      system: resolveFreshnessFromAge(system.basis, checkedAt),
      project: resolveFreshnessFromAge(project.basis, checkedAt),
      session: resolveFreshnessFromAge(session.basis, checkedAt),
      runtime: resolveFreshnessFromAge(runtime.basis, checkedAt),
    };

    const tokens = this.calculateTokens(
      system.data,
      project.data,
      session.data,
      runtime.data,
    );
    await this.loadDocumentSources(projectId);
    const sources = this.collectSources(runtime.data);

    return {
      id: `ctx_${Date.now()}`,
      projectId,
      issueId,
      layers: {
        system: system.data,
        project: project.data,
        session: session.data,
        runtime: runtime.data,
      },
      layerFreshness,
      freshness: aggregateContextFreshness(Object.values(layerFreshness)),
      freshnessCheckedAt: checkedAt.toISOString(),
      tokens,
      sources,
      createdAt: checkedAt.toISOString(),
    };
  }

  async getContextRecipes(projectId: string) {
    const configs = await this.prisma.appConfig.findMany({
      where: { projectId, scope: 'context.recipe' },
    });
    if (configs.length === 0) {
      return this.getDefaultRecipes();
    }
    return configs.map((c) => c.value);
  }

  async autoCurateContext(projectId: string, taskType: string) {
    const recipes = await this.getContextRecipes(projectId);
    const typeMapping: Record<string, string> = {
      feature: 'feature-dev',
      bugfix: 'bug-fix',
      refactor: 'refactor',
      review: 'code-review',
    };
    const recipeName = typeMapping[taskType] || 'default';
    const recipe = recipes.find((r: any) => r.name === recipeName);
    return recipe || recipes[0] || this.getDefaultRecipes()[0];
  }

  async getAdjustableContext(projectId: string) {
    const sources = await this.discoverAvailableSources(projectId);
    return {
      availableSources: sources,
      currentSelections: sources
        .filter((s: any) => s.relevance > 0.7)
        .map((s: any) => s.id),
      suggestions: sources
        .filter((s: any) => s.relevance > 0.5 && s.relevance <= 0.7)
        .map((s: any) => s.id),
    };
  }

  calculateTokenBudget(tokens: any) {
    const total =
      tokens.system + tokens.project + tokens.session + tokens.runtime;
    return {
      ...tokens,
      total,
      budget: this.DEFAULT_TOKEN_BUDGET,
      remaining: this.DEFAULT_TOKEN_BUDGET - total,
    };
  }

  async scoreFileRelevance(
    projectId: string,
    issueId: string,
    files: string[],
  ) {
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: { issueTags: { include: { tag: true } } },
    });

    if (!task) return {};

    const taskKeywords = this.extractKeywords(
      `${task.title} ${task.description || ''}`,
    );
    const tagNames = task.issueTags.map((tt) => tt.tag.name.toLowerCase());
    const scores: Record<string, number> = {};

    for (const file of files) {
      const fileName = file.split('/').pop()?.toLowerCase() || '';
      const filePath = file.toLowerCase();
      let score = 0;

      for (const keyword of taskKeywords) {
        if (filePath.includes(keyword)) score += 0.3;
      }
      for (const tag of tagNames) {
        if (filePath.includes(tag)) score += 0.2;
      }
      for (const keyword of taskKeywords.slice(0, 3)) {
        if (fileName.includes(keyword)) score += 0.1;
      }

      scores[file] = Math.min(1, score);
    }

    return scores;
  }

  private async buildSystemContext(
    projectId: string,
  ): Promise<LayerResult<unknown>> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { include: { user: true } }, aiContext: true },
    });

    if (!project) {
      return {
        data: {
          projectName: '',
          projectType: '',
          techStack: [] as string[],
          teamRoles: {} as Record<string, string[]>,
        },
        basis: null,
      };
    }

    const teamRoles: Record<string, string[]> = {};
    project.members.forEach((m) => {
      if (!teamRoles[m.role]) teamRoles[m.role] = [];
      teamRoles[m.role].push(m.user.username);
    });

    const techStack = (project.aiContext as any)?.techStack || [];
    return {
      data: {
        projectName: project.name,
        projectType: project.type,
        techStack,
        teamRoles,
      },
      basis: project.updatedAt,
    };
  }

  private async buildProjectContext(
    projectId: string,
    _issueId?: string,
  ): Promise<LayerResult<unknown>> {
    const [activeTasks, milestones, recentActivity] = await Promise.all([
      this.prisma.issue.findMany({
        where: { projectId },
        select: {
          id: true,
          title: true,
          status: true,
          assigneeId: true,
          priority: true,
          updatedAt: true,
        },
        take: 20,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.milestone.findMany({
        where: { projectId },
        select: { id: true, name: true, status: true, targetDate: true },
        take: 10,
      }),
      this.prisma.issueActivity.findMany({
        where: { projectId },
        select: { type: true, timestamp: true, summary: true },
        take: 10,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    // 层基准 = 层内各数据源最新一条记录的更新时间（查询均按时间倒序，取首条）
    const basis = this.latestOf(
      activeTasks[0]?.updatedAt ?? null,
      recentActivity[0]?.timestamp ?? null,
    );

    return {
      data: {
        activeTasks: activeTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assignee: t.assigneeId,
          priority: t.priority,
        })),
        milestones: milestones.map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          targetDate: m.targetDate?.toISOString(),
        })),
        blockers: [] as any[],
        recentActivity: recentActivity.map((a) => ({
          type: a.type,
          timestamp: a.timestamp.toISOString(),
          summary: a.summary || '',
        })),
      },
      basis,
    };
  }

  private async buildSessionContext(
    projectId: string,
    issueId?: string,
  ): Promise<LayerResult<unknown>> {
    if (!issueId) {
      return {
        data: {
          conversationHistory: [] as any[],
          sharedContext: {},
          artifacts: [] as any[],
        },
        basis: null,
      };
    }

    const conversations = await this.prisma.aIConversation.findMany({
      where: { issueId },
      include: {
        messages: { take: 5, orderBy: { createdAt: 'desc' as const } },
      },
      take: 3,
      orderBy: { updatedAt: 'desc' as const },
    });

    const artifacts = await this.prisma.executionArtifact.findMany({
      where: { executionRun: { issueId } },
      select: { id: true, artifactType: true, name: true },
      take: 10,
    });

    const conversationHistory = conversations.flatMap((c) =>
      c.messages.map((m) => ({
        id: m.id,
        role: m.role,
        preview: m.content.slice(0, 100),
        timestamp: m.createdAt.toISOString(),
      })),
    );

    // 层基准 = 最新会话的 updatedAt 与其最新一条消息 createdAt 的较大者；
    // 无任何会话 → 无可信时间戳
    const basis = conversations.length
      ? this.latestOf(
          conversations[0].updatedAt,
          conversations[0].messages[0]?.createdAt ?? null,
        )
      : null;

    return {
      data: {
        conversationHistory,
        sharedContext: {},
        artifacts: artifacts.map((a) => ({
          id: a.id,
          type: a.artifactType,
          name: a.name,
        })),
      },
      basis,
    };
  }

  private async buildRuntimeContext(
    projectId: string,
  ): Promise<LayerResult<unknown>> {
    const workspace = await this.prisma.projectWorkspace.findUnique({
      where: { projectId },
    });

    return {
      data: {
        workspacePath: workspace?.localPath,
        currentFiles: [] as any[],
      },
      basis: workspace?.updatedAt ?? null,
    };
  }

  /** 取多个候选时间中最新者（null 视为缺失；全缺失返回 null） */
  private latestOf(...candidates: Array<Date | null>): Date | null {
    const valid = candidates.filter(
      (c): c is Date => c instanceof Date && Number.isFinite(c.getTime()),
    );
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
  }

  private calculateTokens(
    system: any,
    project: any,
    session: any,
    runtime: any,
  ) {
    const estimate = (obj: unknown) =>
      Math.floor(JSON.stringify(obj).length / 4);
    const tokens = {
      system: estimate(system),
      project: estimate(project),
      session: estimate(session),
      runtime: estimate(runtime),
      total: 0,
      budget: this.DEFAULT_TOKEN_BUDGET,
      remaining: 0,
    };
    tokens.total =
      tokens.system + tokens.project + tokens.session + tokens.runtime;
    tokens.remaining = tokens.budget - tokens.total;
    return tokens;
  }

  private collectSources(runtime: any) {
    return {
      databases: [] as any[],
      documents: this.cachedDocuments,
      files: (runtime.currentFiles || []).map((f: any) => ({
        type: 'file',
        id: f.path,
        name: f.path.split('/').pop(),
        relevance: f.relevance || 0,
      })),
      apis: [] as any[],
    };
  }

  /**
   * 文档取数（契约与文档知识层 v2 纪要 §9）：catalog 摘要形态填充，
   * 消灭历史空壳。注意：本服务已整体 deprecated，dispatch 管线的
   * docs provider 正式接入点在 ai-hub ContextBuilderService.buildContext
   * 的 projectKnowledge 段（含 digest 命中），此处仅为兼容性兜底。
   */
  private cachedDocuments: any[] = [];
  private async loadDocumentSources(projectId: string): Promise<void> {
    const docs = await this.prisma.document.findMany({
      where: { projectId, isDeleted: false },
      select: {
        id: true,
        title: true,
        docRole: true,
        status: true,
        updatedAt: true,
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });
    this.cachedDocuments = docs.map((d) => ({
      type: 'document',
      id: d.id,
      name: d.title,
      role: d.docRole,
      status: d.status,
      relevance: d.status === 'published' ? 0.9 : 0.6,
      lastAccessed: d.updatedAt.toISOString(),
    }));
  }

  private async discoverAvailableSources(projectId: string) {
    const sources: any[] = [];

    const tasks = await this.prisma.issue.findMany({
      where: { projectId },
      select: { id: true, title: true, updatedAt: true },
      take: 50,
    });
    sources.push(
      ...tasks.map((t) => ({
        type: 'task',
        id: t.id,
        name: t.title,
        relevance: 0.8,
        lastAccessed: t.updatedAt.toISOString(),
      })),
    );

    const apiLinks = await this.prisma.projectApiDocLink.findMany({
      where: { projectId },
      select: { id: true, label: true },
    });
    sources.push(
      ...apiLinks.map((l) => ({
        type: 'api',
        id: l.id,
        name: l.label,
        relevance: 0.6,
      })),
    );

    return sources;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ]);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));
  }

  private getDefaultRecipes() {
    return [
      {
        id: 'default',
        name: 'default',
        layers: ['system', 'project', 'session'],
        maxTokens: 50000,
        priorities: { system: 1, project: 1, session: 0.8, runtime: 0 },
      },
      {
        id: 'feature-dev',
        name: 'feature-dev',
        layers: ['system', 'project', 'session', 'runtime'],
        maxTokens: 80000,
        priorities: { system: 1, project: 1, session: 0.9, runtime: 1 },
      },
    ];
  }
}
