import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeamDto, userId: string) {
    const existing = await this.prisma.team.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Team slug ${dto.slug} 已存在`);
    }
    return this.prisma.team.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
        color: dto.color,
        ownerId: userId,
        status: 'active',
      },
    });
  }

  async update(id: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');
    return this.prisma.team.update({ where: { id }, data: dto });
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
        include: {
          _count: { select: { members: true, projects: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 20,
        skip: query.offset ?? 0,
      }),
      this.prisma.team.count({ where }),
    ]);
    return { teams, total };
  }

  async getDetail(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            member: true,
          },
        },
        projects: {
          include: {
            project: {
              select: { id: true, name: true, color: true, icon: true },
            },
          },
        },
        invites: { where: { status: 'pending' } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async addMember(teamId: string, dto: AddTeamMemberDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const existing = await this.prisma.teamMember.findUnique({
      where: { uniq_team_member: { teamId, memberId: dto.memberId } },
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
    const existing = await this.prisma.teamMember.findUnique({
      where: { uniq_team_member: { teamId, memberId } },
    });
    if (!existing) throw new NotFoundException('Team member not found');
    return this.prisma.teamMember.update({
      where: { id: existing.id },
      data: { role: dto.role },
    });
  }

  async removeMember(teamId: string, memberId: string) {
    const existing = await this.prisma.teamMember.findUnique({
      where: { uniq_team_member: { teamId, memberId } },
    });
    if (!existing) throw new NotFoundException('Team member not found');
    await this.prisma.teamMember.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async listMembers(teamId: string) {
    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: { member: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async bindProject(teamId: string, dto: BindTeamProjectDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const existing = await this.prisma.teamProject.findUnique({
      where: { uniq_team_project: { teamId, projectId: dto.projectId } },
    });
    if (existing) {
      return this.prisma.teamProject.update({
        where: { id: existing.id },
        data: { role: dto.role ?? 'contributor' },
      });
    }
    return this.prisma.teamProject.create({
      data: {
        teamId,
        projectId: dto.projectId,
        role: dto.role ?? 'contributor',
      },
    });
  }

  async unbindProject(teamId: string, projectId: string) {
    const existing = await this.prisma.teamProject.findUnique({
      where: { uniq_team_project: { teamId, projectId } },
    });
    if (!existing) throw new NotFoundException('Binding not found');
    await this.prisma.teamProject.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async listProjects(teamId: string) {
    return this.prisma.teamProject.findMany({
      where: { teamId },
      include: { project: true },
    });
  }

  async createInvite(teamId: string, dto: CreateTeamInviteDto, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    const token = crypto.randomBytes(16).toString('hex');
    return this.prisma.teamInvite.create({
      data: {
        teamId,
        email: dto.email,
        inviteeMemberId: dto.inviteeMemberId,
        role: dto.role ?? 'member',
        token,
        status: 'pending',
        expiresAt: dto.expiresAt
          ? new Date(dto.expiresAt)
          : new Date(Date.now() + 7 * 24 * 3600 * 1000),
        invitedBy: userId,
      },
    });
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
