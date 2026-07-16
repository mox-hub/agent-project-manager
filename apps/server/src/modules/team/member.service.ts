import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  CreateMemberDto,
  UpdateMemberDto,
  MemberQueryDto,
  BindMemberProjectDto,
} from './dto/member.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMemberDto, userId: string) {
    if (dto.type === 'human' && !dto.userId) {
      throw new BadRequestException('Human 成员必须提供 userId');
    }
    if (dto.type === 'ai_agent' && !dto.aiModelConfigId) {
      throw new BadRequestException('AI 成员必须提供 aiModelConfigId');
    }

    // handle 唯一
    const existingHandle = await this.prisma.member.findUnique({
      where: { handle: dto.handle },
    });
    if (existingHandle) throw new ConflictException('handle 已存在');

    if (dto.type === 'human' && dto.userId) {
      const existing = await this.prisma.member.findUnique({
        where: { userId: dto.userId },
      });
      if (existing) throw new ConflictException('该用户已存在 Member 记录');
    }
    if (dto.email) {
      const existing = await this.prisma.member.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException('该邮箱已存在 Member 记录');
    }

    return this.prisma.member.create({
      data: {
        type: dto.type,
        displayName: dto.displayName,
        handle: dto.handle,
        email: dto.email,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
        userId: dto.userId,
        phone: dto.phone,
        timezone: dto.timezone,
        aiModelConfigId: dto.aiModelConfigId,
        aiProvider: dto.aiProvider,
        systemPrompt: dto.systemPrompt,
        capabilities: dto.capabilities
          ? (dto.capabilities as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        status: dto.status ?? 'active',
        tagsJson: dto.tags
          ? (dto.tags as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        createdBy: userId,
      },
    });
  }

  async update(id: string, dto: UpdateMemberDto) {
    const m = await this.prisma.member.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    const data: any = { ...dto };
    if (dto.capabilities) data.capabilities = dto.capabilities;
    if (dto.tags) data.tagsJson = dto.tags;
    delete data.capabilities;
    delete data.tags;
    return this.prisma.member.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    const m = await this.prisma.member.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    return this.prisma.member.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  async getDetail(id: string) {
    const m = await this.prisma.member.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            isActive: true,
          },
        },
        aiModelConfig: {
          select: {
            id: true,
            name: true,
            provider: true,
            enabled: true,
            maxTokens: true,
          },
        },
        teamMemberships: {
          include: {
            team: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
        projectBindings: {
          include: {
            project: {
              select: { id: true, name: true, color: true, icon: true },
            },
          },
        },
        _count: {
          select: {
            taskAssignees: true,
            documentAuthors: true,
            documentReviewers: true,
            executions: true,
            activities: true,
          },
        },
      },
    });
    if (!m) throw new NotFoundException('Member not found');
    return m;
  }

  async list(query: MemberQueryDto) {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    else where.status = { not: 'inactive' };
    if (query.q) {
      where.OR = [
        { displayName: { contains: query.q } },
        { handle: { contains: query.q } },
        { email: { contains: query.q } },
      ];
    }
    if (query.projectId) {
      where.projectBindings = { some: { projectId: query.projectId } };
    }
    if (query.teamId) {
      where.teamMemberships = { some: { teamId: query.teamId } };
    }

    const [items, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          aiModelConfig: { select: { id: true, name: true, provider: true } },
        },
        orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.member.count({ where }),
    ]);
    return { items, total };
  }

  async bindProject(memberId: string, dto: BindMemberProjectDto) {
    const m = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!m) throw new NotFoundException('Member not found');
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const existing = await this.prisma.memberProjectBinding.findUnique({
      where: {
        uniq_member_project_binding: { memberId, projectId: dto.projectId },
      },
    });
    if (existing) {
      return this.prisma.memberProjectBinding.update({
        where: { id: existing.id },
        data: { role: dto.role },
      });
    }
    return this.prisma.memberProjectBinding.create({
      data: { memberId, projectId: dto.projectId, role: dto.role },
    });
  }

  async unbindProject(memberId: string, projectId: string) {
    const existing = await this.prisma.memberProjectBinding.findUnique({
      where: { uniq_member_project_binding: { memberId, projectId } },
    });
    if (!existing) throw new NotFoundException('Binding not found');
    await this.prisma.memberProjectBinding.delete({
      where: { id: existing.id },
    });
    return { success: true };
  }

  async listProjectBindings(memberId: string) {
    return this.prisma.memberProjectBinding.findMany({
      where: { memberId },
      include: {
        project: { select: { id: true, name: true, color: true, icon: true } },
      },
    });
  }

  async listProjectMembers(
    projectId: string,
    query: { type?: string; q?: string },
  ) {
    const where: any = {
      projectBindings: { some: { projectId } },
      status: { not: 'inactive' },
    };
    if (query.type) where.type = query.type;
    if (query.q) {
      where.OR = [
        { displayName: { contains: query.q } },
        { handle: { contains: query.q } },
      ];
    }
    return this.prisma.member.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        aiModelConfig: { select: { id: true, name: true, provider: true } },
        projectBindings: {
          where: { projectId },
          select: { role: true, joinedAt: true },
        },
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async recordActivity(memberId: string, type: string, detail?: any) {
    return this.prisma.memberActivity.create({
      data: {
        memberId,
        type,
        detail: detail ? (detail as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }
}
