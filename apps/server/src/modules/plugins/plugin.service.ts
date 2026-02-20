import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma, Plugin, PluginPermission, PluginScope, PluginStatus } from '@prisma/client';

@Injectable()
export class PluginService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find all plugins with optional filters
   */
  async findAll(params?: {
    provider?: string;
    scope?: PluginScope;
    projectId?: string;
    enabled?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { page = 1, pageSize = 50 } = params || {};
    const { provider, scope, projectId, enabled, search } = params;

    const where: any = {};

    if (provider) {
      where.provider = provider;
    }

    if (scope) {
      where.scope = scope;
    }

    if (projectId && scope === 'project') {
      where.projectId = projectId;
    }

    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [plugins, total] = await this.prisma.$transaction([
      this.prisma.plugin.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plugin.count({ where }),
    ]);

    return {
      data: plugins,
      meta: { page, pageSize, total },
    };
  }

  /**
   * Find plugin by ID
   */
  async findById(id: string): Promise<Plugin | null> {
    const plugin = await this.prisma.plugin.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!plugin) {
      throw new NotFoundException(`Plugin with ID ${id} not found`);
    }

    return plugin;
  }

  /**
   * Install plugin from manifest
   */
  async install(createDto: {
    name,
    provider,
    scope,
    projectId,
    manifest,
    permissions,
    config,
    enabled = true,
  }: any) {
    // Check if plugin already exists
    const existing = await this.prisma.plugin.findFirst({
      where: {
        name,
        provider,
        scope,
        ...(projectId ? { projectId } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Plugin already installed');
    }

    // Create plugin with permissions
    const plugin = await this.prisma.plugin.create({
      data: {
        name,
        provider,
        scope: projectId,
        manifest,
        config,
        enabled,
      },
    });

    // Create permissions
    if (permissions && permissions.length > 0) {
      await this.prisma.pluginPermission.createMany({
        data: permissions.map((permission: string) => ({
          pluginId: plugin.id,
          permission,
          granted: false, // Default to not granted
        })),
      });
    }

    return plugin;
  }

  /**
   * Uninstall plugin
   */
  async uninstall(id: string): Promise<void> {
    await this.prisma.pluginPermission.deleteMany({
      where: { pluginId: id },
    });

    await this.prisma.plugin.delete({
      where: { id },
    });
  }

  /**
   * Update plugin
   */
  async update(id: string, updateDto: {
    name,
    manifest,
    config,
    enabled,
  }: any) {
    return this.prisma.plugin.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(manifest && { manifest }),
        ...(config !== undefined && { config }),
        ...(enabled !== undefined && { enabled }),
      },
    });
  });

  /**
   * Update plugin permission
   */
  async updatePermission(pluginId: string, permission: string, granted: boolean): Promise<void> {
    await this.prisma.pluginPermission.updateMany({
      where: { pluginId, permission },
      data: { granted },
    });

    await this.prisma.plugin.update({
      where: { id: pluginId },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * Grant all permissions for a plugin
   */
  async grantAllPermissions(pluginId: string): Promise<void> {
    await this.prisma.pluginPermission.updateMany({
      where: { pluginId },
      data: { granted: true },
    });

    await this.prisma.plugin.update({
      where: { id: pluginId },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * Revoke all permissions for a plugin
   */
  async revokeAllPermissions(pluginId: string): Promise<void> {
    await this.prisma.pluginPermission.updateMany({
      where: { pluginId },
      data: { granted: false },
    });

    await this.prisma.plugin.update({
      where: { id: pluginId },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * Check if a plugin has a specific permission
   */
  async hasPermission(pluginId: string, permission: string): Promise<boolean> {
    const perm = await this.prisma.pluginPermission.findUnique({
      where: { pluginId, permission },
    });

    return perm?.granted ?? false;
  }
}
