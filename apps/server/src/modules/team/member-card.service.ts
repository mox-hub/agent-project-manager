import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { IssueAssigneeService } from './issue-assignee.service';

export interface MemberCardDto {
  id: string;
  shortId: string;
  type: string;
  displayName: string;
  handle: string;
  email: string | null;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  status: string;
  trustLevel: number | null;
  trustScore: number | null;
  hasPersonalPrompt: boolean;
  thinkingLevel: string | null;
  isOnline: boolean;
  lastActiveAt: string | null;
  tags: string[];
  userId: string | null;
  phone: string | null;
  timezone: string | null;
  aiModel: { id: string; name: string; provider: string } | null;
  capabilities: string[];
  projects: Array<{
    projectId: string;
    projectName: string;
    color: string | null;
    role: string;
    source: string;
  }>;
  load: { todo: number; inProgress: number; completed: number; total: number };
  recentActivities: Array<{
    id: string;
    type: string;
    detail: unknown;
    createdAt: string;
  }>;
  teams: Array<{
    teamId: string;
    teamName: string;
    role: string;
    color: string | null;
    projects: Array<{
      projectId: string;
      projectName: string;
      color: string | null;
    }>;
  }>;
}

/** 成员维度用量/成本聚合（AI 成员口径 = Execution subject 聚合；人类成员诚实零值） */
export interface MemberUsageSummaryDto {
  scope: 'ai_agent' | 'human';
  totals: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    totalCost: number;
  };
  byModel: Array<{ model: string; tokens: number; cost: number }>;
  executions: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
  };
  lastExecutionAt: string | null;
}

@Injectable()
export class MemberCardService {
  private readonly logger = new Logger(MemberCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly issueAssigneeService: IssueAssigneeService,
  ) {}

  async getCard(memberId: string, projectId?: string): Promise<MemberCardDto> {
    const m =
      (await this.prisma.member.findUnique({
        where: { id: memberId },
      })) ??
      (await this.prisma.member.findUnique({
        where: { shortId: memberId },
      }));
    if (!m) throw new NotFoundException('Member not found');

    const [bindings, teamMembers, load, activities] = await Promise.all([
      this.prisma.memberProjectBinding.findMany({
        where: { memberId, ...(projectId ? { projectId } : {}) },
      }),
      this.prisma.teamMember.findMany({
        where: { memberId },
      }),
      this.issueAssigneeService.getMemberLoad(memberId, projectId),
      this.prisma.memberActivity.findMany({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // 项目/团队当前模型不提供关系字段，按 id 另行查询以补齐名称与颜色；
    // 团队→项目走 TeamProject 关联（先团队、团队再参与项目的层级语义）
    const projectIds = bindings.map((b) => b.projectId);
    const teamIds = teamMembers.map((t) => t.teamId);
    const [projects, teams, teamProjectLinks] = await Promise.all([
      projectIds.length > 0
        ? this.prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, name: true, color: true },
          })
        : Promise.resolve([]),
      teamIds.length > 0
        ? this.prisma.team.findMany({
            where: { id: { in: teamIds } },
            select: { id: true, name: true, color: true },
          })
        : Promise.resolve([]),
      teamIds.length > 0
        ? this.prisma.teamProject.findMany({
            where: { teamId: { in: teamIds } },
          })
        : Promise.resolve([]),
    ]);
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const allTeamProjectIds = [
      ...new Set(teamProjectLinks.map((tp) => tp.projectId)),
    ];
    const teamProjects =
      allTeamProjectIds.length > 0
        ? await this.prisma.project.findMany({
            where: { id: { in: allTeamProjectIds } },
            select: { id: true, name: true, color: true },
          })
        : [];
    const teamProjectMap = new Map(teamProjects.map((p) => [p.id, p]));
    const teamProjectLinksByTeam = new Map<string, typeof teamProjectLinks>();
    for (const link of teamProjectLinks) {
      const list = teamProjectLinksByTeam.get(link.teamId) ?? [];
      list.push(link);
      teamProjectLinksByTeam.set(link.teamId, list);
    }

    const metadata = (m.metadata ?? {}) as Record<string, unknown>;

    return {
      id: m.id,
      shortId: m.shortId,
      type: m.type,
      displayName: m.displayName,
      handle: m.handle ?? '',
      email: m.email,
      avatarUrl: m.avatarUrl,
      title: m.title ?? (metadata.title as string) ?? null,
      bio:
        m.description ??
        (metadata.bio as string) ??
        (metadata.description as string) ??
        null,
      status: m.status,
      trustLevel: m.trustLevel,
      trustScore: m.trustScore,
      hasPersonalPrompt: Boolean(m.personalPrompt && m.personalPrompt.trim()),
      thinkingLevel: m.thinkingLevel,
      // 当前模型不跟踪在线与最近活跃时间，给出安全默认值
      isOnline: false,
      lastActiveAt: null,
      tags: m.tags ? this.toArray(m.tags) : this.toArray(metadata.tags),
      userId: m.userId,
      phone: (metadata.phone as string) ?? null,
      timezone: (metadata.timezone as string) ?? null,
      aiModel: m.aiModelConfigId
        ? {
            id: m.aiModelConfigId,
            name: (metadata.model as string) ?? '',
            provider: (metadata.provider as string) ?? '',
          }
        : null,
      capabilities: this.toArray(metadata.capabilities),
      projects: bindings.map((b) => {
        const p = projectMap.get(b.projectId);
        return {
          projectId: b.projectId,
          projectName: p?.name ?? b.projectId,
          color: p?.color ?? null,
          role: b.role,
          source: b.source,
        };
      }),
      load,
      recentActivities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        detail:
          a.metadata !== null && a.metadata !== undefined
            ? a.metadata
            : undefined,
        createdAt: a.createdAt.toISOString(),
      })),
      teams: teamMembers.map((t) => {
        const team = teamMap.get(t.teamId);
        const links = teamProjectLinksByTeam.get(t.teamId) ?? [];
        return {
          teamId: t.teamId,
          teamName: team?.name ?? t.teamId,
          role: t.role,
          color: team?.color ?? null,
          projects: links.map((link) => {
            const p = teamProjectMap.get(link.projectId);
            return {
              projectId: link.projectId,
              projectName: p?.name ?? link.projectId,
              color: p?.color ?? null,
            };
          }),
        };
      }),
    };
  }

  async getCardBatch(memberIds: string[], projectId?: string) {
    const results = await Promise.all(
      memberIds.map(async (id) => {
        try {
          return await this.getCard(id, projectId);
        } catch (e) {
          this.logger.warn(`getCard failed for ${id}`, e);
          return null;
        }
      }),
    );
    return results.filter(Boolean);
  }

  /**
   * 成员维度用量/成本聚合（个人页成本预览数据源）。
   * AI 成员：Execution(subjectType=platform_ai_member) 关联 AIUsageLog 聚合；
   * 人类成员：无 CLI 执行口径，返回诚实零值（scope='human'）。
   */
  async getUsageSummary(memberId: string): Promise<MemberUsageSummaryDto> {
    const m =
      (await this.prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, type: true },
      })) ??
      (await this.prisma.member.findUnique({
        where: { shortId: memberId },
        select: { id: true, type: true },
      }));
    if (!m) throw new NotFoundException('Member not found');

    const emptyTotals = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCost: 0,
    };
    if (m.type !== 'ai_agent') {
      return {
        scope: 'human',
        totals: emptyTotals,
        byModel: [],
        executions: { total: 0, completed: 0, failed: 0, inProgress: 0 },
        lastExecutionAt: null,
      };
    }

    const runs = await this.prisma.execution.findMany({
      where: { subjectType: 'platform_ai_member', subjectId: m.id },
      select: { id: true, status: true, completedAt: true, createdAt: true },
    });

    const statusCount = { completed: 0, failed: 0, inProgress: 0 };
    let lastExecutionAt: string | null = null;
    for (const run of runs) {
      if (run.status === 'completed') statusCount.completed += 1;
      else if (run.status === 'failed') statusCount.failed += 1;
      else if (run.status === 'in_progress') statusCount.inProgress += 1;
      const ts = (run.completedAt ?? run.createdAt).toISOString();
      if (!lastExecutionAt || ts > lastExecutionAt) lastExecutionAt = ts;
    }

    const runIds = runs.map((r) => r.id);
    if (runIds.length === 0) {
      return {
        scope: 'ai_agent',
        totals: emptyTotals,
        byModel: [],
        executions: { total: 0, ...statusCount },
        lastExecutionAt: null,
      };
    }

    const [totalsAgg, byModelAgg] = await Promise.all([
      this.prisma.aIUsageLog.aggregate({
        where: { executionRunId: { in: runIds } },
        _sum: {
          totalTokens: true,
          promptTokens: true,
          completionTokens: true,
          estimatedCost: true,
        },
      }),
      this.prisma.aIUsageLog.groupBy({
        by: ['modelName'],
        where: { executionRunId: { in: runIds } },
        _sum: { totalTokens: true, estimatedCost: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
      }),
    ]);

    return {
      scope: 'ai_agent',
      totals: {
        totalTokens: totalsAgg._sum.totalTokens ?? 0,
        promptTokens: totalsAgg._sum.promptTokens ?? 0,
        completionTokens: totalsAgg._sum.completionTokens ?? 0,
        totalCost: totalsAgg._sum.estimatedCost ?? 0,
      },
      byModel: byModelAgg.map((row) => ({
        model: row.modelName,
        tokens: row._sum.totalTokens ?? 0,
        cost: row._sum.estimatedCost ?? 0,
      })),
      executions: { total: runs.length, ...statusCount },
      lastExecutionAt,
    };
  }

  /** 将可能为 json 字符串 / 数组 / 空值的元数据字段统一归约为字符串数组 */
  private toArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        // fall through
      }
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }
}
