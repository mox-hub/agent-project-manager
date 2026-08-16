import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { EncryptionService } from '../../core/crypto/encryption.service';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';
import { IntegrationQueryDto } from './dto/integration-query.dto';
import { CreateExternalIssueLinkDto } from './dto/create-external-issue-link.dto';
import { ExternalIssueQueryDto } from './dto/external-issue-query.dto';

/**
 * 服务端 Provider 限定列表（与前端枚举保持一致）
 */
const ALLOWED_PROVIDERS = new Set([
  'github',
  'gitlab',
  'jira',
  'linear',
  'slack',
  'discord',
  'notion',
  'figma',
  'sentry',
]);

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly encryption: EncryptionService,
  ) {
    // EncryptionService 自行校验环境变量，依赖注入触发其构造器即可
  }

  /**
   * 加密（委派 EncryptionService，删除自实现 AES-CBC，避免 P0-SEC-001）
   */
  private encryptConfig(config: Record<string, any>): string {
    return this.encryption.encryptJson(config);
  }

  /**
   * 解密（用于 Internal 调用方；外部响应不会暴露解密值）
   */
  private decryptConfig<T = Record<string, any>>(
    encrypted: string | unknown,
  ): T {
    if (typeof encrypted !== 'string') {
      // 旧数据（明文对象）做 best-effort 兼容
      return encrypted as T;
    }
    try {
      return this.encryption.decryptJson<T>(encrypted);
    } catch (err) {
      // 旧 AES-CBC 数据可能成功解密不到（密码不同时），返回空
      throw new BadRequestException(
        `Failed to decrypt integration config: ${(err as Error).message}`,
      );
    }
  }

  async createIntegrationConfig(
    dto: CreateIntegrationConfigDto,
    userId: string,
  ) {
    if (!ALLOWED_PROVIDERS.has(dto.provider)) {
      throw new BadRequestException(
        `Unsupported integration provider: ${dto.provider}`,
      );
    }

    // Validate project access if projectId is provided
    if (dto.scope === 'project' && dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
        include: { members: true },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      const isMember = project.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    // Encrypt sensitive config
    const encryptedConfig = this.encryptConfig(dto.config);

    const config = await this.prisma.integrationConfig.create({
      data: {
        provider: dto.provider,
        scope: dto.scope,
        projectId: dto.scope === 'project' ? dto.projectId : null,
        name: dto.name,
        enabled: dto.enabled ?? true,
        configJson: encryptedConfig as any,
        status: 'disconnected',
        createdBy: userId,
        metadata: dto.metadata as any,
      },
    });

    // Publish event
    this.messageBus.publish('integration.config.created', {
      id: config.id,
      provider: config.provider,
      scope: config.scope,
      projectId: config.projectId,
    });

    return {
      ...config,
      config: undefined,
      configJson: undefined,
    };
  }

  async getIntegrationConfigs(query: IntegrationQueryDto, userId: string) {
    const where: any = {};

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
      const project = await this.prisma.project.findUnique({
        where: { id: query.projectId },
        include: { members: true },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      const isMember = project.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    const configs = await this.prisma.integrationConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return configs.map((config) => ({
      ...config,
      configJson: undefined,
    }));
  }

  async getIntegrationConfigById(id: string, userId: string) {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Integration config not found');
    }

    if (config.scope === 'project' && config.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: config.projectId },
        include: { members: true },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      const isMember = project.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException(
          'You do not have access to this integration',
        );
      }
    }

    return {
      ...config,
      configJson: undefined,
    };
  }

  async getDecryptedConfig<T = Record<string, any>>(
    id: string,
    userId: string,
  ): Promise<T> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { id },
    });
    if (!config) {
      throw new NotFoundException('Integration config not found');
    }
    if (config.scope === 'project' && config.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: config.projectId },
        include: { members: true },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      const isMember = project.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException(
          'You do not have access to this integration',
        );
      }
    }
    return this.decryptConfig<T>(config.configJson);
  }

  async updateIntegrationConfig(
    id: string,
    dto: UpdateIntegrationConfigDto,
    userId: string,
  ) {
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Integration config not found');
    }

    if (existing.scope === 'project' && existing.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: existing.projectId },
        include: { members: true },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      const isMember = project.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException(
          'You do not have access to this integration',
        );
      }
    }

    if (dto.provider && !ALLOWED_PROVIDERS.has(dto.provider)) {
      throw new BadRequestException(
        `Unsupported integration provider: ${dto.provider}`,
      );
    }

    const updateData: any = {};
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
    if (dto.name) updateData.name = dto.name;
    if (dto.provider) updateData.provider = dto.provider;
    if (dto.status) updateData.status = dto.status;
    if (dto.errorMessage !== undefined)
      updateData.errorMessage = dto.errorMessage;
    if (dto.metadata) updateData.metadata = dto.metadata as any;

    if (dto.config) {
      updateData.configJson = this.encryptConfig(dto.config) as any;
    }

    const updated = await this.prisma.integrationConfig.update({
      where: { id },
      data: updateData,
    });

    this.messageBus.publish('integration.config.updated', {
      id: updated.id,
      provider: updated.provider,
    });

    return {
      ...updated,
      configJson: undefined,
    };
  }

  async deleteIntegrationConfig(id: string, userId: string) {
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Integration config not found');
    }

    if (existing.scope === 'project' && existing.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: existing.projectId },
        include: { members: true },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      const isMember = project.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException(
          'You do not have access to this integration',
        );
      }
    }

    await this.prisma.integrationConfig.delete({
      where: { id },
    });

    this.messageBus.publish('integration.config.deleted', {
      id,
      provider: existing.provider,
    });
  }

  async createExternalIssueLink(
    dto: CreateExternalIssueLinkDto,
    userId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: { members: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const existing = await this.prisma.externalIssueLink.findUnique({
      where: {
        provider_externalId: {
          provider: dto.provider,
          externalId: dto.externalId,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.externalIssueLink.update({
        where: { id: existing.id },
        data: {
          projectId: dto.projectId,
          taskId: dto.taskId,
          url: dto.url,
          summary: dto.summary,
          status: dto.status,
          metadata: dto.metadata as any,
        },
      });

      this.messageBus.publish('integration.external-issue.linked', {
        id: updated.id,
        provider: updated.provider,
        externalId: updated.externalId,
        taskId: updated.taskId,
      });

      return updated;
    }

    const link = await this.prisma.externalIssueLink.create({
      data: {
        projectId: dto.projectId,
        taskId: dto.taskId,
        provider: dto.provider,
        externalId: dto.externalId,
        url: dto.url,
        summary: dto.summary,
        status: dto.status,
        metadata: dto.metadata as any,
      },
    });

    this.messageBus.publish('integration.external-issue.linked', {
      id: link.id,
      provider: link.provider,
      externalId: link.externalId,
      taskId: link.taskId,
    });

    return link;
  }

  async getExternalIssueLinks(query: ExternalIssueQueryDto, userId: string) {
    const where: any = {};

    if (query.projectId) {
      where.projectId = query.projectId;
      const project = await this.prisma.project.findUnique({
        where: { id: query.projectId },
        include: { members: true },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      const isMember = project.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    if (query.taskId) {
      where.taskId = query.taskId;
    }

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.externalId) {
      where.externalId = query.externalId;
    }

    return this.prisma.externalIssueLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
