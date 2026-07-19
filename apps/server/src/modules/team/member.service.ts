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

  constructor(readonly prisma: PrismaService) {}

  async create(dto: CreateMemberDto, userId: string) {
    // handle 唯一
    if (dto.handle) {
      const existingHandle = await this.prisma.member.findUnique({
        where: { handle: dto.handle },
      });
      if (existingHandle) throw new ConflictException('handle 已存在');
    }

    // 检查 userId 是否已存在（如果有的话）
    if (dto.userId) {
      const existing = await this.prisma.member.findFirst({
        where: { userId: dto.userId },
      });
      if (existing) throw new ConflictException('该用户已存在 Member 记录');
    }

    return this.prisma.member.create({
      data: {
        type: dto.type ?? 'human',
        displayName: dto.displayName,
        handle: dto.handle,
        email: dto.email,
        avatarUrl: dto.avatarUrl,
        userId: dto.userId,
        aiModelConfigId: dto.aiModelConfigId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        status: dto.status ?? 'active',
      },
    });
  }

  async update(id: string, dto: UpdateMemberDto) {
    const m = await this.prisma.member.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');

    const data: any = { ...dto };
    if (dto.metadata) {
      data.metadata = dto.metadata as Prisma.InputJsonValue;
    }

    return this.prisma.member.update({
      where: { id },
      data,
    });
  }

  async findById(id: string) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async findByUserId(userId: string) {
    return this.prisma.member.findFirst({
      where: { userId },
    });
  }

  async findByHandle(handle: string) {
    return this.prisma.member.findUnique({
      where: { handle },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.member.findFirst({
      where: { email },
    });
  }

  async list(query: MemberQueryDto) {
    const where: any = {};

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.projectId) {
      const bindings = await this.prisma.memberProjectBinding.findMany({
        where: { projectId: query.projectId },
        select: { memberId: true },
      });
      where.id = { in: bindings.map(b => b.memberId) };
    }

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip: query.offset ?? 0,
        take: query.limit ?? 20,
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.member.count({ where }),
    ]);

    return { data, total };
  }

  async bindProject(memberId: string, dto: BindMemberProjectDto) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');

    const existing = await this.prisma.memberProjectBinding.findFirst({
      where: { memberId, projectId: dto.projectId },
    });
    if (existing) throw new ConflictException('Member已绑定到此项目');

    return this.prisma.memberProjectBinding.create({
      data: {
        memberId,
        projectId: dto.projectId,
        role: dto.role ?? 'member',
      },
    });
  }

  async unbindProject(memberId: string, projectId: string) {
    const binding = await this.prisma.memberProjectBinding.findFirst({
      where: { memberId, projectId },
    });
    if (!binding) throw new NotFoundException('Member未绑定到此项目');

    return this.prisma.memberProjectBinding.delete({
      where: { id: binding.id },
    });
  }

  async recordActivity(memberId: string, type: string, content: string, metadata?: Record<string, unknown>) {
    return this.prisma.memberActivity.create({
      data: {
        memberId,
        type,
        content,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
