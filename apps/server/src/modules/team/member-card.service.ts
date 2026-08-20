import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { TaskAssigneeService } from './task-assignee.service';

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
  }>;
}

@Injectable()
export class MemberCardService {
  private readonly logger = new Logger(MemberCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskAssigneeService: TaskAssigneeService,
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
      this.taskAssigneeService.getMemberLoad(memberId, projectId),
      this.prisma.memberActivity.findMany({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // 项目/团队当前模型不提供关系字段，按 id 另行查询以补齐名称与颜色
    const projectIds = bindings.map((b) => b.projectId);
    const teamIds = teamMembers.map((t) => t.teamId);
    const [projects, teams] = await Promise.all([
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
    ]);
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const teamMap = new Map(teams.map((t) => [t.id, t]));

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
        return {
          teamId: t.teamId,
          teamName: team?.name ?? t.teamId,
          role: t.role,
          color: team?.color ?? null,
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
