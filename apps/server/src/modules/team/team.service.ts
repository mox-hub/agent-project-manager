import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MailService } from '@/modules/mail/mail.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  UpdateTeamMemberDto,
  BindTeamProjectDto,
  CreateTeamInviteDto,
} from './dto/team.dto';
import * as crypto from 'crypto';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateTeamDto, userId: string) {
    const existing = await this.prisma.team.findFirst({
      where: { OR: [{ slug: dto.slug }, { name: dto.name }] },
    });
    if (existing) {
      throw new ConflictException(`Team 已存在`);
    }
    return this.prisma.team.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
        color: dto.color,
        teamPrompt: dto.teamPrompt ?? null,
        tags: (dto.tags as unknown as import('@prisma/client').Prisma.InputJsonValue) ?? undefined,
        ownerId: userId,
        status: 'active',
      },
    });
  }

  async update(id: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');
    const data: Record<string, unknown> = { ...dto };
    if (dto.tags) {
      data.tags = dto.tags as unknown as import('@prisma/client').Prisma.InputJsonValue;
    }
    return this.prisma.team.update({ where: { id }, data: data as any });
  }

  async archive(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');
    return this.prisma.team.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async list(query: {
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q } },
        { slug: { contains: query.q } },
        { description: { contains: query.q } },
      ];
    }
    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 20,
        skip: query.offset ?? 0,
      }),
      this.prisma.team.count({ where }),
    ]);
    // 聚合创始人显示名与成员数（模型无关系字段，手动补齐）
    const ownerIds = [...new Set(teams.map((t) => t.ownerId))];
    const [owners, memberCounts] = await Promise.all([
      ownerIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: ownerIds } },
            select: { id: true, displayName: true },
          })
        : Promise.resolve([]),
      this.prisma.teamMember.groupBy({
        by: ['teamId'],
        _count: { memberId: true },
      }),
    ]);
    const ownerMap = new Map(owners.map((o) => [o.id, o.displayName]));
    const countMap = new Map(memberCounts.map((c) => [c.teamId, c._count.memberId]));
    return {
      teams: teams.map((t) => ({
        ...t,
        ownerName: ownerMap.get(t.ownerId) ?? null,
        memberCount: countMap.get(t.id) ?? 0,
      })),
      total,
    };
  }

  async getDetail(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });
    if (!team) throw new NotFoundException('Team not found');
    const owner = await this.prisma.user.findUnique({
      where: { id: team.ownerId },
      select: { displayName: true },
    });
    return { ...team, ownerName: owner?.displayName ?? null };
  }

  async addMember(teamId: string, dto: AddTeamMemberDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const existing = await this.prisma.teamMember.findFirst({
      where: { teamId, memberId: dto.memberId },
    });
    if (existing) {
      return this.prisma.teamMember.update({
        where: { id: existing.id },
        data: { role: dto.role ?? 'member' },
      });
    }
    return this.prisma.teamMember.create({
      data: {
        teamId,
        memberId: dto.memberId,
        role: dto.role ?? 'member',
      },
    });
  }

  async updateMember(
    teamId: string,
    memberId: string,
    dto: UpdateTeamMemberDto,
  ) {
    const existing = await this.prisma.teamMember.findFirst({
      where: { teamId, memberId },
    });
    if (!existing) throw new NotFoundException('Team member not found');
    return this.prisma.teamMember.update({
      where: { id: existing.id },
      data: { role: dto.role },
    });
  }

  async removeMember(teamId: string, memberId: string) {
    const existing = await this.prisma.teamMember.findFirst({
      where: { teamId, memberId },
    });
    if (!existing) throw new NotFoundException('Team member not found');
    await this.prisma.teamMember.delete({ where: { id: existing.id } });
  }

  async listMembers(teamId: string) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { joinedAt: 'asc' },
    });

    // 手动获取Member信息
    const memberIds = [...new Set(members.map((m) => m.memberId))];
    const memberRecords = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
    });
    const memberMap = new Map(memberRecords.map((m) => [m.id, m]));

    return members.map((m) => ({
      ...m,
      member: memberMap.get(m.memberId),
    }));
  }

  async bindProject(teamId: string, dto: BindTeamProjectDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const existing = await this.prisma.teamProject.findFirst({
      where: { teamId, projectId: dto.projectId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.teamProject.create({
      data: {
        teamId,
        projectId: dto.projectId,
      },
    });
  }

  async unbindProject(teamId: string, projectId: string) {
    const existing = await this.prisma.teamProject.findFirst({
      where: { teamId, projectId },
    });
    if (!existing) throw new NotFoundException('Binding not found');
    await this.prisma.teamProject.delete({ where: { id: existing.id } });
  }

  async listProjects(teamId: string) {
    const bindings = await this.prisma.teamProject.findMany({
      where: { teamId },
    });

    // 手动获取Project信息
    const projectIds = [...new Set(bindings.map((b) => b.projectId))];
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true, color: true, icon: true },
    });
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    return bindings.map((b) => ({
      ...b,
      project: projectMap.get(b.projectId),
    }));
  }

  async createInvite(teamId: string, dto: CreateTeamInviteDto, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    const token = crypto.randomBytes(16).toString('hex');
    const invite = await this.prisma.teamInvite.create({
      data: {
        teamId,
        email: dto.email || '',
        memberId: dto.memberId,
        role: dto.role ?? 'member',
        token,
        status: 'pending',
        expiresAt: dto.expiresAt
          ? new Date(dto.expiresAt)
          : new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });

    // Outbox 邮件（无 SMTP 时落库，管理端可查看/复制链接）
    if (invite.email) {
      const inviter = await this.prisma.user.findUnique({
        where: { id: team.ownerId },
        select: { displayName: true },
      });
      await this.mailService.sendTeamInvite({
        to: invite.email,
        teamName: team.name,
        inviterName: inviter?.displayName ?? '团队管理员',
        role: invite.role,
        token,
      });
    }

    return invite;
  }

  async listInvites(teamId: string) {
    return this.prisma.teamInvite.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvite(inviteId: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    return this.prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: 'revoked' },
    });
  }
}
