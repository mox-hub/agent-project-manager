import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { TaskAssigneeService } from './task-assignee.service';

export interface MemberCardDto {
  id: string;
  type: string;
  displayName: string;
  handle: string;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  status: string;
  isOnline: boolean;
  lastActiveAt: Date | null;
  tags: string[];
  // human-only
  userId: string | null;
  phone: string | null;
  timezone: string | null;
  // ai-only
  aiModel: { id: string; name: string; provider: string } | null;
  capabilities: string[];
  // 角色与负载
  projects: Array<{
    projectId: string;
    projectName: string;
    color: string | null;
    role: string;
  }>;
  load: { todo: number; inProgress: number; completed: number; total: number };
  // 活动
  recentActivities: Array<{
    id: string;
    type: string;
    detail: any;
    createdAt: Date;
  }>;
  // 团队
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
    const m = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        aiModelConfig: { select: { id: true, name: true, provider: true } },
      },
    });
    if (!m) throw new NotFoundException('Member not found');

    const [bindings, teams, load, activities] = await Promise.all([
      this.prisma.memberProjectBinding.findMany({
        where: { memberId, ...(projectId ? { projectId } : {}) },
        include: {
          project: { select: { id: true, name: true, color: true } },
        },
      }),
      this.prisma.teamMember.findMany({
        where: { memberId },
        include: { team: { select: { id: true, name: true, color: true } } },
      }),
      this.taskAssigneeService.getMemberLoad(memberId, projectId),
      this.prisma.memberActivity.findMany({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      id: m.id,
      type: m.type,
      displayName: m.displayName,
      handle: m.handle,
      email: m.email,
      avatarUrl: m.avatarUrl,
      bio: m.bio,
      status: m.status,
      isOnline: m.isOnline,
      lastActiveAt: m.lastActiveAt,
      tags: this.parseTags(m.tagsJson),
      userId: m.userId,
      phone: m.phone,
      timezone: m.timezone,
      aiModel: m.aiModelConfig
        ? {
            id: m.aiModelConfig.id,
            name: m.aiModelConfig.name,
            provider: m.aiModelConfig.provider,
          }
        : null,
      capabilities: this.parseTags(m.capabilities),
      projects: bindings.map((b) => ({
        projectId: b.project.id,
        projectName: b.project.name,
        color: b.project.color,
        role: b.role,
      })),
      load,
      recentActivities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        detail: a.detail,
        createdAt: a.createdAt,
      })),
      teams: teams.map((t) => ({
        teamId: t.team.id,
        teamName: t.team.name,
        role: t.role,
        color: t.team.color,
      })),
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

  private parseTags(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        // fall through
      }
    }
    return [];
  }
}
