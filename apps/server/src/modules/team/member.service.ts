import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import {
  CreateMemberDto,
  UpdateMemberDto,
  MemberQueryDto,
  BindMemberProjectDto,
} from './dto/member.dto';
import { Prisma } from '@prisma/client';
import { generateMemberShortId } from '@/common/utils/member-short-id.util';
import { ProjectMembershipSyncService } from './project-membership-sync.service';

/** 系统内置 AI 助理成员（小周）：metadata.isSystemAssistant 标记，禁删除/停用 */
export const SYSTEM_ASSISTANT_HANDLE = 'xiaozhou';

export function isSystemAssistantMember(member: {
  handle?: string | null;
  metadata?: unknown;
}): boolean {
  return (
    member.handle === SYSTEM_ASSISTANT_HANDLE ||
    (member.metadata as Record<string, unknown> | null | undefined)?.[
      'isSystemAssistant'
    ] === true
  );
}

@Injectable()
export class MemberService implements OnModuleInit {
  private readonly logger = new Logger(MemberService.name);

  constructor(
    readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly membershipSync: ProjectMembershipSyncService,
  ) {}

  /**
   * 确保小助理（小周）作为默认成员存在：服务启动时补齐既有库；
   * 新工作区由 template.db 内置（build-template.ts 同规则 upsert）。
   */
  async onModuleInit() {
    try {
      await this.ensureSystemAssistantMember();
    } catch (error) {
      this.logger.warn(
        `Ensure system assistant member failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async ensureSystemAssistantMember() {
    const existing = await this.prisma.member.findUnique({
      where: { handle: SYSTEM_ASSISTANT_HANDLE },
    });
    if (existing) {
      // 旧库补标记（按 handle 幂等）
      if (
        (existing.metadata as Record<string, unknown> | null)?.[
          'isSystemAssistant'
        ] !== true
      ) {
        await this.prisma.member.update({
          where: { id: existing.id },
          data: {
            metadata: {
              ...((existing.metadata as Record<string, unknown>) ?? {}),
              isSystemAssistant: true,
            },
          },
        });
      }
      return existing;
    }

    let shortId = generateMemberShortId();
    for (let i = 0; i < 5; i += 1) {
      const dup = await this.prisma.member.findUnique({ where: { shortId } });
      if (!dup) break;
      shortId = generateMemberShortId();
    }

    return this.prisma.member.create({
      data: {
        type: 'ai_agent',
        shortId,
        handle: SYSTEM_ASSISTANT_HANDLE,
        displayName: '小周',
        title: 'AI 项目管理搭档',
        description: '系统内置的主 AI 助理，可查询与操作项目数据。',
        status: 'active',
        metadata: { isSystemAssistant: true },
      },
    });
  }

  async create(dto: CreateMemberDto, userId: string) {
    // 类型验证
    if (dto.type === 'human' && !dto.userId) {
      throw new BadRequestException('Human member requires userId');
    }
    if (dto.type === 'ai_agent' && !dto.aiModelConfigId) {
      throw new BadRequestException('AI agent member requires aiModelConfigId');
    }

    // AI 员工 defaultCliProviderId 校验
    if (dto.type === 'ai_agent' && dto.defaultCliProviderId) {
      const cfg = await this.prisma.cliProviderConfig.findUnique({
        where: { providerId: dto.defaultCliProviderId },
      });
      if (!cfg) {
        throw new BadRequestException(
          `CLI provider "${dto.defaultCliProviderId}" not configured. 请先到 AI Management 探测并启用。`,
        );
      }
      if (!cfg.enabled) {
        throw new BadRequestException(
          `CLI provider "${dto.defaultCliProviderId}" is disabled.`,
        );
      }
    }

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

    // 生成唯一短 ID（极小概率碰撞时重试）
    let shortId = generateMemberShortId();
    for (let i = 0; i < 5; i += 1) {
      const dup = await this.prisma.member.findUnique({ where: { shortId } });
      if (!dup) break;
      shortId = generateMemberShortId();
    }

    const member = await this.prisma.member.create({
      data: {
        type: dto.type ?? 'human',
        shortId,
        displayName: dto.displayName,
        handle: dto.handle,
        email: dto.email,
        avatarUrl: dto.avatarUrl,
        title: dto.title ?? null,
        description: dto.description ?? null,
        tags: (dto.tags as Prisma.InputJsonValue) ?? undefined,
        trustLevel: dto.trustLevel ?? null,
        trustScore: dto.trustScore ?? null,
        personalPrompt: dto.personalPrompt ?? null,
        thinkingLevel: dto.thinkingLevel ?? null,
        costRatePerDay: dto.costRatePerDay ?? null,
        userId: dto.userId,
        aiModelConfigId: dto.aiModelConfigId,
        defaultCliProviderId: dto.defaultCliProviderId ?? null,
        defaultExecutionRole: dto.defaultExecutionRole ?? null,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        status: dto.status ?? 'active',
      },
    });

    this.messageBus.publish('member.created', {
      memberId: member.id,
      displayName: member.displayName,
      type: member.type,
      userId,
    });
    return member;
  }

  async update(id: string, dto: UpdateMemberDto) {
    const m = await this.prisma.member.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');

    // 系统内置 AI 助理：允许改信息，不允许停用/删除
    if (isSystemAssistantMember(m) && dto.status && dto.status !== 'active') {
      throw new BadRequestException(
        'AI 助理是系统内置成员，不可停用；仅允许修改资料信息',
      );
    }

    // AI 员工 defaultCliProviderId 校验
    if (m.type === 'ai_agent' && dto.defaultCliProviderId) {
      const cfg = await this.prisma.cliProviderConfig.findUnique({
        where: { providerId: dto.defaultCliProviderId },
      });
      if (!cfg) {
        throw new BadRequestException(
          `CLI provider "${dto.defaultCliProviderId}" not configured.`,
        );
      }
      if (!cfg.enabled) {
        throw new BadRequestException(
          `CLI provider "${dto.defaultCliProviderId}" is disabled.`,
        );
      }
    }

    const data: any = { ...dto };
    if (dto.metadata) {
      data.metadata = dto.metadata as Prisma.InputJsonValue;
    }
    if (dto.tags) {
      data.tags = dto.tags as Prisma.InputJsonValue;
    }

    return this.prisma.member.update({
      where: { id },
      data,
    });
  }

  async findById(id: string) {
    // 路由参数兼容数据库 id 与 shortId
    const member =
      (await this.prisma.member.findUnique({ where: { id } })) ??
      (await this.prisma.member.findUnique({ where: { shortId: id } }));
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  /** 硬删除：清理成员关联行后删除本体；已绑定登录账号/系统内置成员禁止删除 */
  async remove(id: string) {
    const member = await this.findById(id);

    if (isSystemAssistantMember(member)) {
      throw new BadRequestException('AI 助理是系统内置成员，不可删除');
    }

    if (member.userId) {
      throw new ConflictException('该成员已绑定登录账号，请改为停用对应账号');
    }

    await this.prisma.$transaction([
      this.prisma.issueAssignee.deleteMany({ where: { memberId: member.id } }),
      this.prisma.issueWatcher.deleteMany({ where: { memberId: member.id } }),
      this.prisma.teamMember.deleteMany({ where: { memberId: member.id } }),
      this.prisma.memberProjectBinding.deleteMany({
        where: { memberId: member.id },
      }),
      this.prisma.memberToolGrant.deleteMany({
        where: { memberId: member.id },
      }),
      this.prisma.memberActivity.deleteMany({
        where: { memberId: member.id },
      }),
      this.prisma.member.delete({ where: { id: member.id } }),
    ]);

    this.messageBus.publish('member.removed', {
      memberId: member.id,
      displayName: member.displayName,
    });

    return { ok: true };
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
      where.id = { in: bindings.map((b) => b.memberId) };
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
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const existing = await this.prisma.memberProjectBinding.findFirst({
      where: { memberId, projectId: dto.projectId },
    });
    if (existing) throw new ConflictException('Member已绑定到此项目');

    const binding = await this.prisma.memberProjectBinding.create({
      data: {
        memberId,
        projectId: dto.projectId,
        role: dto.role ?? 'member',
        source: 'direct',
      },
    });
    // 对有登录账号的成员同步 ProjectMember 权限缓存
    await this.membershipSync.propagateMemberToProject(
      { id: memberId, userId: member.userId },
      dto.projectId,
      dto.role ?? 'member',
      'direct',
    );
    return binding;
  }

  async unbindProject(memberId: string, projectId: string) {
    const binding = await this.prisma.memberProjectBinding.findFirst({
      where: { memberId, projectId },
    });
    if (!binding) throw new NotFoundException('Member未绑定到此项目');

    await this.prisma.memberProjectBinding.delete({
      where: { id: binding.id },
    });
    // 该成员在此项目已无任何绑定时清掉权限缓存
    await this.membershipSync.revokeMemberFromProject(memberId, projectId);
    return binding;
  }

  async recordActivity(
    memberId: string,
    type: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
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
