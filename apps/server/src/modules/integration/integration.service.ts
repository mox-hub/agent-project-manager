import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';
import { IntegrationQueryDto } from './dto/integration-query.dto';
import { CreateExternalIssueLinkDto } from './dto/create-external-issue-link.dto';
import { ExternalIssueQueryDto } from './dto/external-issue-query.dto';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationService {
  private readonly encryptionKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {
  // In production, use environment variable for encryption key
  // ❌ Removed hardcoded fallback - P0-SEC-001
  if (!process.env.INTEGRATION_ENCRYPTION_KEY) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY environment variable is required');
  }
  this.encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  }

  private encryptConfig(config: Record<string, any>): string {
    // Simple encryption for demo - in production use proper encryption (AES-256-GCM)
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptConfig(encrypted: string): Record<string, any> {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      throw new BadRequestException('Failed to decrypt integration config');
    }
  }

  async createIntegrationConfig(
    dto: CreateIntegrationConfigDto,
    userId: string,
  ) {
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
      config: undefined, // Don't return encrypted config
    };
  }

  async getIntegrationConfigs(query: IntegrationQueryDto, userId: string) {
    const where: any = {};

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
      // Verify user has access to project
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
    } else {
      // For global scope, only show if user is admin/owner
      // For now, allow all users to see global configs (can be restricted later)
    }

    const configs = await this.prisma.integrationConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Don't return encrypted config details
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

    // Verify access
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
        throw new ForbiddenException('You do not have access to this integration');
      }
    }

    return {
      ...config,
      configJson: undefined, // Don't return encrypted config
    };
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

    // Verify access
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
        throw new ForbiddenException('You do not have access to this integration');
      }
    }

    const updateData: any = {};
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
    if (dto.name) updateData.name = dto.name;
    if (dto.status) updateData.status = dto.status;
    if (dto.errorMessage !== undefined) updateData.errorMessage = dto.errorMessage;
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

    // Verify access
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
        throw new ForbiddenException('You do not have access to this integration');
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

  async createExternalIssueLink(dto: CreateExternalIssueLinkDto, userId: string) {
    // Verify project access
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

    // Check if link already exists
    const existing = await this.prisma.externalIssueLink.findUnique({
      where: {
        provider_externalId: {
          provider: dto.provider,
          externalId: dto.externalId,
        },
      },
    });

    if (existing) {
      // Update existing link
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
      // Verify access
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
