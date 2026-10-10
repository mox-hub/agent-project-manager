import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';

/**
 * 内置全局状态种子（task 七态 / project 五态）：桌面版模板库由 db push 生成、
 * 不含种子数据，首装状态页会完全空白（2026-10-03 桌面真机实测）。蓝本取自
 * 2026-10-01 状态真实化批在 dev 库落地的种子行（含流转白名单）。
 */
const DEFAULT_STATUS_DEFINITIONS: Array<{
  type: string;
  key: string;
  name: string;
  group: string;
  color: string;
  icon: string;
  description: string;
  order: number;
  isFinal: boolean;
  isBlockedState: boolean;
  allowedNextStatusKeys: string[];
}> = [
  {
    type: 'task',
    key: 'backlog',
    name: '待规划',
    group: 'backlog',
    color: '#6b7280',
    icon: 'CircleDashed',
    description: '已记录但尚未规划，暂不投入。',
    order: 5,
    isFinal: false,
    isBlockedState: false,
    allowedNextStatusKeys: ['todo', 'in_progress', 'canceled'],
  },
  {
    type: 'task',
    key: 'todo',
    name: '待办',
    group: 'unstarted',
    color: '#6b7280',
    icon: 'Circle',
    description: '即将开始，可以认领。',
    order: 10,
    isFinal: false,
    isBlockedState: false,
    allowedNextStatusKeys: ['in_progress', 'canceled'],
  },
  {
    type: 'task',
    key: 'in_progress',
    name: '进行中',
    group: 'started',
    color: '#3b82f6',
    icon: 'Loader2',
    description: '正在执行。',
    order: 20,
    isFinal: false,
    isBlockedState: false,
    allowedNextStatusKeys: ['in_review', 'blocked', 'done', 'canceled'],
  },
  {
    type: 'task',
    key: 'in_review',
    name: '待评审',
    group: 'started',
    color: '#f59e0b',
    icon: 'CircleAlertBig',
    description: '已提交评审，等待验收结论。',
    order: 30,
    isFinal: false,
    isBlockedState: false,
    allowedNextStatusKeys: ['in_progress', 'done', 'canceled'],
  },
  {
    type: 'task',
    key: 'blocked',
    name: '已阻塞',
    group: 'started',
    color: '#ef4444',
    icon: 'Ban',
    description: '被外部依赖阻塞，暂无法推进。',
    order: 40,
    isFinal: false,
    isBlockedState: true,
    allowedNextStatusKeys: ['in_progress', 'canceled'],
  },
  {
    type: 'task',
    key: 'done',
    name: '已完成',
    group: 'completed',
    color: '#22c55e',
    icon: 'CircleCheckBig',
    description: '工作完成并通过验收。',
    order: 40,
    isFinal: true,
    isBlockedState: false,
    allowedNextStatusKeys: ['in_progress', 'canceled'],
  },
  {
    type: 'task',
    key: 'canceled',
    name: '已取消',
    group: 'canceled',
    color: '#6b7280',
    icon: 'CircleXBig',
    description: '决定不做。',
    order: 60,
    isFinal: true,
    isBlockedState: false,
    allowedNextStatusKeys: ['todo', 'in_progress'],
  },
  {
    type: 'project',
    key: 'backlog',
    name: '待规划',
    group: 'backlog',
    color: '#6b7280',
    icon: 'CircleDashed',
    description: '已提出但未排期。',
    order: 10,
    isFinal: false,
    isBlockedState: false,
    allowedNextStatusKeys: ['planned', 'in_progress', 'canceled'],
  },
  {
    type: 'project',
    key: 'planned',
    name: '计划中',
    group: 'unstarted',
    color: '#f59e0b',
    icon: 'CalendarClock',
    description: '已排期，尚未启动。',
    order: 20,
    isFinal: false,
    isBlockedState: false,
    allowedNextStatusKeys: ['in_progress', 'canceled'],
  },
  {
    type: 'project',
    key: 'in_progress',
    name: '进行中',
    group: 'started',
    color: '#3b82f6',
    icon: 'Loader2',
    description: '项目正在推进。',
    order: 30,
    isFinal: false,
    isBlockedState: false,
    allowedNextStatusKeys: ['completed', 'canceled'],
  },
  {
    type: 'project',
    key: 'completed',
    name: '已完成',
    group: 'completed',
    color: '#22c55e',
    icon: 'CircleCheckBig',
    description: '项目交付完成。',
    order: 40,
    isFinal: true,
    isBlockedState: false,
    allowedNextStatusKeys: ['in_progress'],
  },
  {
    type: 'project',
    key: 'canceled',
    name: '已取消',
    group: 'canceled',
    color: '#6b7280',
    icon: 'CircleXBig',
    description: '项目终止。',
    order: 50,
    isFinal: true,
    isBlockedState: false,
    allowedNextStatusKeys: ['planned', 'in_progress'],
  },
];

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

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
    // 标签单一归属：按功能域直接在库层过滤
    if (resourceType) {
      where.resourceType = resourceType;
    }

    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        // 使用数量 = 工单引用 + 文档引用（标签列表「使用数量」列）
        _count: { select: { issueTags: true, documents: true } },
      },
    });

    return tags.map(({ _count, ...tag }) => ({
      ...tag,
      usageCount: _count.issueTags + _count.documents,
    }));
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
      resourceType: data.resourceType ?? 'task',
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

    const created = await this.prisma.tag.create({
      data: tagData,
    });

    this.messageBus.publish('tag.created', {
      tagId: created.id,
      name: created.name,
      projectId: data.projectId || null,
      userId: currentUserId,
    });
    return created;
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

    this.messageBus.publish('tag.deleted', {
      tagId,
      name: tag.name,
      projectId: tag.projectId,
    });
  }

  // Status Definitions
  async getStatuses(projectId?: string, type?: string) {
    // 空表补种（首启/新工作区库）：仅全局语境（未指定 projectId）触发，
    // 项目级状态查询为空是合法状态不补种。幂等：表内有任意行即跳过。
    if (projectId === undefined) {
      const total = await this.prisma.statusDefinition.count();
      if (total === 0) {
        await this.seedDefaultStatuses();
      }
    }

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

  /**
   * 补种内置全局状态（projectId=null）：DEFAULT_STATUS_DEFINITIONS 全量直插，
   * SQLite createMany 不支持 skipDuplicates，并发首启靠同键重插风险极低 +
   * 业务侧无唯一约束（重复行可在状态页手删），不做额外兜底。
   */
  private async seedDefaultStatuses(): Promise<void> {
    await this.prisma.statusDefinition.createMany({
      data: DEFAULT_STATUS_DEFINITIONS.map((s) => ({ ...s, projectId: null })),
    });
    this.logger.log(
      `已补种 ${DEFAULT_STATUS_DEFINITIONS.length} 条内置全局状态（空表首启自动补齐）`,
    );
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

    // 字段语义：undefined = 不更新（部分更新安全，如拖拽排序只传 order）；
    // null/'' = 显式清空。创建分支字段齐备，行为不变。
    const statusData: any = {
      projectId: data.projectId ?? null,
      type: data.type,
      key: data.key,
      name: data.name,
      order: data.order,
    };
    if (data.group !== undefined) statusData.group = data.group;
    if (data.color !== undefined) statusData.color = data.color;
    if (data.icon !== undefined) statusData.icon = data.icon;
    if (data.description !== undefined)
      statusData.description = data.description;
    if (data.isFinal !== undefined) statusData.isFinal = data.isFinal;
    if (data.isBlockedState !== undefined) {
      statusData.isBlockedState = data.isBlockedState;
    }
    if (data.allowedNextStatusKeys !== undefined) {
      statusData.allowedNextStatusKeys = data.allowedNextStatusKeys;
    }
    if (data.metadata !== undefined) statusData.metadata = data.metadata;

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
