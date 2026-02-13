import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class MetadataService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createOrUpdateTag(data: any, userId?: string) {
    const tagData: any = {
      name: data.name,
      color: data.color,
      description: data.description,
      resourceTypes: data.resourceTypes,
      projectId: data.projectId,
      createdBy: userId,
      metadata: data.metadata,
    };

    if (data.id) {
      return this.prisma.tag.update({
        where: { id: data.id },
        data: tagData,
      });
    }

    return this.prisma.tag.create({
      data: tagData,
    });
  }

  async deleteTag(tagId: string) {
    try {
      await this.prisma.tag.delete({
        where: { id: tagId },
      });
      return { success: true };
    } catch {
      throw new NotFoundException(`Tag ${tagId} not found`);
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

  async createOrUpdateStatus(data: any) {
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
      return this.prisma.statusDefinition.update({
        where: { id: data.id },
        data: statusData,
      });
    }

    // Try to find existing by unique constraint
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

  async deleteStatus(statusId: string) {
    try {
      await this.prisma.statusDefinition.delete({
        where: { id: statusId },
      });
      return { success: true };
    } catch {
      throw new NotFoundException(`Status ${statusId} not found`);
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

  async createOrUpdateProjectRole(data: any) {
    const roleData: any = {
      projectId: data.projectId,
      key: data.key,
      name: data.name,
      description: data.description,
      defaultAssigneeIds: data.defaultAssigneeIds,
      metadata: data.metadata,
    };

    if (data.id) {
      return this.prisma.projectRoleDefinition.update({
        where: { id: data.id },
        data: roleData,
      });
    }

    // Try to find existing by unique constraint
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

  async deleteProjectRole(roleId: string) {
    try {
      await this.prisma.projectRoleDefinition.delete({
        where: { id: roleId },
      });
      return { success: true };
    } catch {
      throw new NotFoundException(`Project role ${roleId} not found`);
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
    const templateData: any = {
      name: data.name,
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
      return this.prisma.projectTemplate.update({
        where: { id: data.id },
        data: templateData,
      });
    }

    return this.prisma.projectTemplate.create({
      data: templateData,
    });
  }
}
