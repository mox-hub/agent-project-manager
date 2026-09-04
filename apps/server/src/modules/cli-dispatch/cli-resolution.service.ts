import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CliProviderRegistry } from './cli-provider.registry';

/**
 * V3 身份口径：AI 主体即 Member(type=ai_agent)，派发解析只读不落库——
 * provider/role 从 Member 与 ProjectRoleDefinition 现场解析，不再持久化
 * AgentIdentityBinding（V2 已废弃）。
 */
export interface ResolvedBinding {
  /** Provider id (claude-code / codex / zcode) */
  providerId: string;
  /** 命中解析链路的阶段 */
  resolvedFrom:
    | 'member.defaultCliProviderId'
    | 'projectRole.defaultCliProviderId'
    | 'globalRole.defaultCliProviderId'
    | 'cliProviderConfig.enabled'
    | 'cliProviderRegistry.default';
  /** 角色上下文（注入到 CLI prompt） */
  promptHint?: string | null;
  /** 执行角色（coder/reviewer/pm/qa/general） */
  executionRole: string;
  /** 命中项目角色定义时的 key/name（prompt 注入展示用） */
  roleKey: string | null;
  roleName: string | null;
}

@Injectable()
export class CliResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: CliProviderRegistry,
  ) {}

  /**
   * 根据 Member + 项目解析派发所需的 provider + 角色。
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
      return {
        providerId,
        resolvedFrom: 'member.defaultCliProviderId',
        promptHint: null,
        executionRole: member.defaultExecutionRole ?? 'general',
        roleKey: null,
        roleName: null,
      };
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
      return {
        providerId,
        resolvedFrom: roleDef.projectId
          ? 'projectRole.defaultCliProviderId'
          : 'globalRole.defaultCliProviderId',
        promptHint: roleDef.promptHint,
        executionRole: roleDef.executionRole,
        roleKey: roleDef.key,
        roleName: roleDef.name,
      };
    }

    // 4) 全局 CliProviderConfig 第一个 enabled
    const cfg = await this.prisma.cliProviderConfig.findFirst({
      where: { enabled: true },
      orderBy: { providerId: 'asc' },
    });
    if (cfg) {
      this.assertProviderAvailable(cfg.providerId);
      return {
        providerId: cfg.providerId,
        resolvedFrom: 'cliProviderConfig.enabled',
        promptHint: roleDef?.promptHint ?? null,
        executionRole: roleDef?.executionRole ?? roleKey,
        roleKey: roleDef?.key ?? null,
        roleName: roleDef?.name ?? null,
      };
    }

    // 5) registry 默认
    return {
      providerId: 'claude-code',
      resolvedFrom: 'cliProviderRegistry.default',
      promptHint: roleDef?.promptHint ?? null,
      executionRole: roleDef?.executionRole ?? roleKey,
      roleKey: roleDef?.key ?? null,
      roleName: roleDef?.name ?? null,
    };
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
}
