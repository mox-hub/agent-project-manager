import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class MetadataService {
  constructor(private readonly prisma: PrismaService) {}

  private isPrismaRecordNotFound(e: unknown): boolean {
    return (
      e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025'
    );
  }

  // Tags
  async getTags(projectId?: string, resourceType?: string) {
    const where: any = {};
    if (projectId !== undefined) {
      where.projectId = projectId;
    }

    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Filter by resourceType in memory (SQLite doesn't support JSON array queries well)
    if (resourceType) {
      return tags.filter((tag) => {
        const resourceTypes = tag.resourceTypes as string[] | null;
        return resourceTypes && resourceTypes.includes(resourceType);
      });
    }

    return tags;
  }

  async createOrUpdateTag(data: any, userId?: string, currentUserId?: string) {
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Tag name is required');
    }

    // Check permissions for project-level tags
    if (data.projectId && currentUserId) {
      await this.checkProjectPermission(data.projectId, currentUserId, [
        'owner',
        'maintainer',
      ]);
    } else if (currentUserId) {
      // Global tags require admin role
      await this.checkGlobalAdmin(currentUserId);
    }

    const tagData: any = {
      name: data.name.trim(),
      color: data.color,
      description: data.description,
      resourceTypes: data.resourceTypes,
      projectId: data.projectId,
      createdBy: userId || currentUserId,
      metadata: data.metadata,
    };

    if (data.id) {
      // Update existing tag
      const existing = await this.prisma.tag.findUnique({
        where: { id: data.id },
      });

      if (!existing) {
        throw new NotFoundException(`Tag ${data.id} not found`);
      }

      // Check permission to update
      if (existing.projectId && currentUserId) {
        await this.checkProjectPermission(existing.projectId, currentUserId, [
          'owner',
          'maintainer',
        ]);
      } else if (currentUserId) {
        await this.checkGlobalAdmin(currentUserId);
      }

      return this.prisma.tag.update({
        where: { id: data.id },
        data: tagData,
      });
    }

    // Check for existing tag with same name in same project/global scope (幂等)
    const existing = await this.prisma.tag.findFirst({
      where: {
        name: data.name.trim(),
        projectId: data.projectId || null,
      },
    });

    if (existing) {
      // Update existing tag instead of creating duplicate
      return this.prisma.tag.update({
        where: { id: existing.id },
        data: tagData,
      });
    }

    return this.prisma.tag.create({
      data: tagData,
    });
  }

  async deleteTag(tagId: string, currentUserId?: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundException(`Tag ${tagId} not found`);
    }

    // Check permission
    if (tag.projectId && currentUserId) {
      await this.checkProjectPermission(tag.projectId, currentUserId, [
        'owner',
        'maintainer',
      ]);
    } else if (currentUserId) {
      await this.checkGlobalAdmin(currentUserId);
    }

    try {
      await this.prisma.tag.delete({
        where: { id: tagId },
      });
    } catch (e) {
      if (this.isPrismaRecordNotFound(e)) {
        throw new NotFoundException(`Tag ${tagId} not found`);
      }
      throw e;
    }
  }

  // Status Definitions
  async getStatuses(projectId?: string, type?: string) {
    const where: any = {};
    if (projectId !== undefined) {
      where.projectId = projectId;
    }
    if (type) {
      where.type = type;
    }

    return this.prisma.statusDefinition.findMany({
      where,
      orderBy: { order: 'asc' },
    });
  }

  async createOrUpdateStatus(data: any, currentUserId?: string) {
    // Validate required fields
    if (!data.type || !data.key || !data.name) {
      throw new BadRequestException('Status type, key, and name are required');
    }

    // Check permissions
    if (data.projectId && currentUserId) {
      await this.checkProjectPermission(data.projectId, currentUserId, [
        'owner',
        'maintainer',
      ]);
    } else if (currentUserId) {
      await this.checkGlobalAdmin(currentUserId);
    }

    const statusData: any = {
      projectId: data.projectId,
      type: data.type,
      key: data.key,
      name: data.name,
      order: data.order,
      isFinal: data.isFinal ?? false,
      isBlockedState: data.isBlockedState ?? false,
      allowedNextStatusKeys: data.allowedNextStatusKeys,
      metadata: data.metadata,
    };

    if (data.id) {
      const existing = await this.prisma.statusDefinition.findUnique({
        where: { id: data.id },
      });

      if (!existing) {
        throw new NotFoundException(`Status ${data.id} not found`);
      }

      // Check permission to update
      if (existing.projectId && currentUserId) {
        await this.checkProjectPermission(existing.projectId, currentUserId, [
          'owner',
          'maintainer',
        ]);
      } else if (currentUserId) {
        await this.checkGlobalAdmin(currentUserId);
      }

      return this.prisma.statusDefinition.update({
        where: { id: data.id },
        data: statusData,
      });
    }

    // Try to find existing by unique constraint (幂等)
    const existing = await this.prisma.statusDefinition.findUnique({
      where: {
        projectId_type_key: {
          projectId: data.projectId || null,
          type: data.type,
          key: data.key,
        },
      },
    });

    if (existing) {
      return this.prisma.statusDefinition.update({
        where: { id: existing.id },
        data: statusData,
      });
    }

    return this.prisma.statusDefinition.create({
      data: statusData,
    });
  }

  async deleteStatus(statusId: string, currentUserId?: string) {
    const status = await this.prisma.statusDefinition.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      throw new NotFoundException(`Status ${statusId} not found`);
    }

    // Check permission
    if (status.projectId && currentUserId) {
      await this.checkProjectPermission(status.projectId, currentUserId, [
        'owner',
        'maintainer',
      ]);
    } else if (currentUserId) {
      await this.checkGlobalAdmin(currentUserId);
    }

    try {
      await this.prisma.statusDefinition.delete({
        where: { id: statusId },
      });
    } catch (e) {
      if (this.isPrismaRecordNotFound(e)) {
        throw new NotFoundException(`Status ${statusId} not found`);
      }
      throw e;
    }
  }

  // Project Roles
  async getProjectRoles(projectId?: string) {
    const where: any = {};
    if (projectId !== undefined) {
      where.projectId = projectId;
    }

    return this.prisma.projectRoleDefinition.findMany({
      where,
      orderBy: { key: 'asc' },
    });
  }

  async createOrUpdateProjectRole(data: any, currentUserId?: string) {
    // Validate required fields
    if (!data.key || !data.name) {
      throw new BadRequestException('Project role key and name are required');
    }

    // Check permissions
    if (data.projectId && currentUserId) {
      await this.checkProjectPermission(data.projectId, currentUserId, [
        'owner',
        'maintainer',
      ]);
    } else if (currentUserId) {
      await this.checkGlobalAdmin(currentUserId);
    }

    const roleData: any = {
      projectId: data.projectId,
      key: data.key,
      name: data.name,
      description: data.description,
      defaultAssigneeIds: data.defaultAssigneeIds,
      metadata: data.metadata,
    };

    if (data.id) {
      const existing = await this.prisma.projectRoleDefinition.findUnique({
        where: { id: data.id },
      });

      if (!existing) {
        throw new NotFoundException(`Project role ${data.id} not found`);
      }

      // Check permission to update
      if (existing.projectId && currentUserId) {
        await this.checkProjectPermission(existing.projectId, currentUserId, [
          'owner',
          'maintainer',
        ]);
      } else if (currentUserId) {
        await this.checkGlobalAdmin(currentUserId);
      }

      return this.prisma.projectRoleDefinition.update({
        where: { id: data.id },
        data: roleData,
      });
    }

    // Try to find existing by unique constraint (幂等)
    const existing = await this.prisma.projectRoleDefinition.findUnique({
      where: {
        projectId_key: {
          projectId: data.projectId || null,
          key: data.key,
        },
      },
    });

    if (existing) {
      return this.prisma.projectRoleDefinition.update({
        where: { id: existing.id },
        data: roleData,
      });
    }

    return this.prisma.projectRoleDefinition.create({
      data: roleData,
    });
  }

  async deleteProjectRole(roleId: string, currentUserId?: string) {
    const role = await this.prisma.projectRoleDefinition.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Project role ${roleId} not found`);
    }

    // Check permission
    if (role.projectId && currentUserId) {
      await this.checkProjectPermission(role.projectId, currentUserId, [
        'owner',
        'maintainer',
      ]);
    } else if (currentUserId) {
      await this.checkGlobalAdmin(currentUserId);
    }

    try {
      await this.prisma.projectRoleDefinition.delete({
        where: { id: roleId },
      });
    } catch (e) {
      if (this.isPrismaRecordNotFound(e)) {
        throw new NotFoundException(`Project role ${roleId} not found`);
      }
      throw e;
    }
  }

  // Project Templates
  async getProjectTemplates(q?: string) {
    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.projectTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async createOrUpdateProjectTemplate(data: any, userId?: string) {
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Template name is required');
    }

    // Templates are global, require admin or owner role
    if (userId) {
      await this.checkGlobalAdmin(userId);
    }

    const templateData: any = {
      name: data.name.trim(),
      description: data.description,
      baseProjectType: data.baseProjectType,
      defaultTags: data.defaultTags,
      defaultStatuses: data.defaultStatuses,
      defaultIterations: data.defaultIterations,
      defaultTasks: data.defaultTasks,
      createdBy: userId,
      metadata: data.metadata,
    };

    if (data.id) {
      const existing = await this.prisma.projectTemplate.findUnique({
        where: { id: data.id },
      });

      if (!existing) {
        throw new NotFoundException(`Project template ${data.id} not found`);
      }

      return this.prisma.projectTemplate.update({
        where: { id: data.id },
        data: templateData,
      });
    }

    // Check for existing template with same name (幂等)
    const existing = await this.prisma.projectTemplate.findFirst({
      where: {
        name: data.name.trim(),
      },
    });

    if (existing) {
      return this.prisma.projectTemplate.update({
        where: { id: existing.id },
        data: templateData,
      });
    }

    return this.prisma.projectTemplate.create({
      data: templateData,
    });
  }

  // Helper methods for permission checking
  private async checkGlobalAdmin(userId: string): Promise<void> {
    const role = await this.prisma.roleAssignment.findFirst({
      where: {
        userId,
        scopeType: 'global',
        role: 'admin',
      },
    });

    if (!role) {
      throw new ForbiddenException('Global admin role required');
    }
  }

  private async checkProjectPermission(
    projectId: string,
    userId: string,
    allowedRoles: string[],
  ): Promise<void> {
    // Check global admin first
    const globalAdmin = await this.prisma.roleAssignment.findFirst({
      where: {
        userId,
        scopeType: 'global',
        role: 'admin',
      },
    });

    if (globalAdmin) {
      return;
    }

    // Check project member role
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions for this project');
    }
  }
}
