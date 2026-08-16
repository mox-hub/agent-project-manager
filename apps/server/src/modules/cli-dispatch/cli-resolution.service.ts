import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CliProviderRegistry } from './cli-provider.registry';
import { Prisma } from '@prisma/client';

export interface ResolvedBinding {
  /** Provider id (claude-code / codex / zcode) */
  providerId: string;
  /** AgentIdentityBinding.id 已存在则用现有，否则为 null */
  agentBindingId: string | null;
  /** 是否自动创建/复用了 AgentIdentityBinding */
  bindingReused: boolean;
  /** 命中解析链路的阶段 */
  resolvedFrom:
    | 'member.defaultCliProviderId'
    | 'projectRole.defaultCliProviderId'
    | 'globalRole.defaultCliProviderId'
    | 'cliProviderConfig.enabled'
    | 'cliProviderRegistry.default';
  /** 角色上下文（注入到 CLI prompt） */
  promptHint?: string | null;
  executionRole: string;
}

@Injectable()
export class CliResolutionService {
  private readonly logger = new Logger(CliResolutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: CliProviderRegistry,
  ) {}

  /**
   * 根据 Member + 项目解析派发所需的 provider + binding。
   *
   * 解析优先级：
   *   1. member.defaultCliProviderId（员工级）
   *   2. projectRole.defaultCliProviderId（项目级，先按 member.defaultExecutionRole，再按 guessed role）
   *   3. globalRole.defaultCliProviderId（全局模板）
   *   4. cliProviderConfig.enabled=true 的第一个
   *   5. registry defaultProvider（claude-code -> codex）
   */
  async resolveForMember(
    memberId: string,
    projectId: string,
  ): Promise<ResolvedBinding> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) {
      throw new BadRequestException(`Member ${memberId} not found`);
    }
    if (member.type !== 'ai_agent') {
      throw new BadRequestException(
        `Member ${memberId} is not an AI agent (type=${member.type})`,
      );
    }

    // 校验成员已加入项目
    const binding = await this.prisma.memberProjectBinding.findFirst({
      where: { memberId, projectId },
    });
    if (!binding) {
      throw new BadRequestException(
        `Member ${memberId} is not bound to project ${projectId}`,
      );
    }

    // 1) 员工级覆盖
    if (member.defaultCliProviderId) {
      const providerId = member.defaultCliProviderId;
      this.assertProviderAvailable(providerId);
      return this.ensureBinding(
        projectId,
        memberId,
        providerId,
        member.defaultExecutionRole ?? 'general',
        null,
        'member.defaultCliProviderId',
      );
    }

    // 2) 项目级 / 3) 全局模板
    const roleKey = member.defaultExecutionRole ?? 'general';
    const roleDef =
      (await this.prisma.projectRoleDefinition.findFirst({
        where: { projectId, executionRole: roleKey },
      })) ??
      (await this.prisma.projectRoleDefinition.findFirst({
        where: { projectId: null, executionRole: roleKey },
      }));

    if (roleDef?.defaultCliProviderId) {
      const providerId = roleDef.defaultCliProviderId;
      this.assertProviderAvailable(providerId);
      return this.ensureBinding(
        projectId,
        memberId,
        providerId,
        roleDef.executionRole,
        roleDef.promptHint,
        roleDef.projectId
          ? 'projectRole.defaultCliProviderId'
          : 'globalRole.defaultCliProviderId',
      );
    }

    // 4) 全局 CliProviderConfig 第一个 enabled
    const cfg = await this.prisma.cliProviderConfig.findFirst({
      where: { enabled: true },
      orderBy: { providerId: 'asc' },
    });
    if (cfg) {
      this.assertProviderAvailable(cfg.providerId);
      return this.ensureBinding(
        projectId,
        memberId,
        cfg.providerId,
        roleDef?.executionRole ?? roleKey,
        roleDef?.promptHint ?? null,
        'cliProviderConfig.enabled',
      );
    }

    // 5) registry 默认
    return this.ensureBinding(
      projectId,
      memberId,
      'claude-code',
      roleDef?.executionRole ?? roleKey,
      roleDef?.promptHint ?? null,
      'cliProviderRegistry.default',
    );
  }

  /**
   * 校验 provider 在本机可用
   */
  private assertProviderAvailable(providerId: string) {
    if (!this.registry.isAvailable(providerId as any)) {
      throw new BadRequestException(
        `CLI Provider "${providerId}" is not available on this machine. ` +
          `请到 AI Management 页面点击 "Detect" 重新探测。`,
      );
    }
  }

  /**
   * 复用或创建 AgentIdentityBinding（幂等）
   * - subjectType = 'platform_ai_member'
   * - subjectId = memberId
   */
  private async ensureBinding(
    projectId: string,
    memberId: string,
    providerId: string,
    executionRole: string,
    promptHint: string | null,
    resolvedFrom: ResolvedBinding['resolvedFrom'],
  ): Promise<ResolvedBinding> {
    const existing = await this.prisma.agentIdentityBinding.findFirst({
      where: {
        projectId,
        subjectType: 'platform_ai_member',
        subjectId: memberId,
      },
    });

    if (existing && existing.providerId === providerId) {
      return {
        providerId,
        agentBindingId: existing.id,
        bindingReused: true,
        resolvedFrom,
        promptHint,
        executionRole,
      };
    }

    if (existing) {
      // 更新 providerId（幂等）
      const updated = await this.prisma.agentIdentityBinding.update({
        where: { id: existing.id },
        data: {
          providerId,
          mappedRole: executionRole,
          updatedAt: new Date(),
        },
      });
      return {
        providerId,
        agentBindingId: updated.id,
        bindingReused: true,
        resolvedFrom,
        promptHint,
        executionRole,
      };
    }

    const created = await this.prisma.agentIdentityBinding.create({
      data: {
        projectId,
        subjectType: 'platform_ai_member',
        subjectId: memberId,
        providerId,
        identitySource: 'cli',
        mappedRole: executionRole,
        status: 'active',
        metadata: {
          promptHint: promptHint ?? null,
          autoCreated: true,
          source: 'cli-resolution-service',
        } as Prisma.InputJsonValue,
      },
    });
    this.logger.log(
      `Created AgentIdentityBinding ${created.id} (member=${memberId} project=${projectId} provider=${providerId})`,
    );
    return {
      providerId,
      agentBindingId: created.id,
      bindingReused: false,
      resolvedFrom,
      promptHint,
      executionRole,
    };
  }
}
