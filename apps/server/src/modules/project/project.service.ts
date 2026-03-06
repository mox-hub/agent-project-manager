import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Prisma } from '@prisma/client';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    // If templateId is provided, load template and apply defaults
    let templateData: any = null;
    if (createProjectDto.templateId) {
      templateData = await this.prisma.projectTemplate.findUnique({
        where: { id: createProjectDto.templateId },
      });
    }

    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        type: createProjectDto.type,
        visibility: createProjectDto.visibility,
        status: 'active',
        config: createProjectDto.config || templateData?.defaultStatuses || {},
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Publish event
    this.messageBus.publish('project.created', {
      projectId: project.id,
      userId,
      project,
    });

    return project;
  }

  async findAll(query: ProjectQueryDto, userId: string) {
    const { q, status, type, memberId, page = 1, pageSize = 20 } = query;

    // Ensure numeric pagination values (query params arrive as strings)
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;

    const where: any = {};

    // Search by name/description
    if (q) {
      where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // Filter by member participation
    if (memberId) {
      where.members = {
        some: {
          userId: memberId,
        },
      };
    } else {
      // Default: show projects user is a member of
      where.members = {
        some: {
          userId,
        },
      };
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              tasks: true,
              iterations: true,
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            iterations: true,
            milestones: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string) {
    // Check if user has permission (owner or maintainer)
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    if (!member || !['owner', 'maintainer'].includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Publish event
    this.messageBus.publish('project.updated', {
      projectId: project.id,
      userId,
      project,
    });

    return project;
  }

  async archive(id: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    if (!member || member.role !== 'owner') {
      throw new ForbiddenException('Only owner can archive project');
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: { status: 'archived' },
    });

    this.messageBus.publish('project.updated', {
      projectId: project.id,
      userId,
      project,
    });

    return project;
  }

  async restore(id: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    if (!member || member.role !== 'owner') {
      throw new ForbiddenException('Only owner can restore project');
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: { status: 'active' },
    });

    this.messageBus.publish('project.updated', {
      projectId: project.id,
      userId,
      project,
    });

    return project;
  }

  // External Project Links
  async getExternalLinks(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);
    return this.prisma.externalProjectLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addExternalLink(projectId: string, userId: string, data: {
    provider: string;
    externalProjectId: string;
    externalProjectUrl: string;
    syncConfig?: Prisma.JsonObject;
  }) {
    await this.checkProjectMaintainer(projectId, userId);
    return this.prisma.externalProjectLink.create({
      data: {
        projectId,
        provider: data.provider,
        externalProjectId: data.externalProjectId,
        externalProjectUrl: data.externalProjectUrl,
        syncConfig: data.syncConfig || {},
        syncStatus: 'active',
      },
    });
  }

  async updateExternalLink(projectId: string, userId: string, linkId: string, data: {
    provider?: string;
    externalProjectId?: string;
    externalProjectUrl?: string;
    syncConfig?: Prisma.JsonObject;
    syncStatus?: string;
  }) {
    await this.checkProjectMaintainer(projectId, userId);
    return this.prisma.externalProjectLink.update({
      where: { id: linkId },
      data: {
        ...(data.provider && { provider: data.provider }),
        ...(data.externalProjectId && { externalProjectId: data.externalProjectId }),
        ...(data.externalProjectUrl && { externalProjectUrl: data.externalProjectUrl }),
        ...(data.syncConfig && { syncConfig: data.syncConfig }),
        ...(data.syncStatus && { syncStatus: data.syncStatus }),
      },
    });
  }

  async deleteExternalLink(projectId: string, userId: string, linkId: string) {
    await this.checkProjectMaintainer(projectId, userId);
    await this.prisma.externalProjectLink.delete({
      where: { id: linkId },
    });
    return { success: true };
  }

  // Document Links
  async getDocLinks(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);
    return this.prisma.projectDocLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDocLink(projectId: string, userId: string, data: {
    label: string;
    url: string;
    type: string;
    description?: string;
    aiIndexed?: boolean;
  }) {
    await this.checkProjectMaintainer(projectId, userId);
    return this.prisma.projectDocLink.create({
      data: {
        projectId,
        label: data.label,
        url: data.url,
        type: data.type,
        description: data.description,
        aiIndexed: data.aiIndexed || false,
      },
    });
  }

  async updateDocLink(projectId: string, userId: string, linkId: string, data: Partial<{
    label: string;
    url: string;
    type: string;
    description: string;
    aiIndexed: boolean;
  }>) {
    await this.checkProjectMaintainer(projectId, userId);
    return this.prisma.projectDocLink.update({
      where: { id: linkId },
      data,
    });
  }

  async deleteDocLink(projectId: string, userId: string, linkId: string) {
    await this.checkProjectMaintainer(projectId, userId);
    await this.prisma.projectDocLink.delete({
      where: { id: linkId },
    });
    return { success: true };
  }

  // API Doc Links
  async getApiDocLinks(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);
    return this.prisma.projectApiDocLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addApiDocLink(projectId: string, userId: string, data: {
    label: string;
    url: string;
    type: string;
    description?: string;
    aiIndexed?: boolean;
  }) {
    await this.checkProjectMaintainer(projectId, userId);
    return this.prisma.projectApiDocLink.create({
      data: {
        projectId,
        label: data.label,
        url: data.url,
        type: data.type,
        description: data.description,
        aiIndexed: data.aiIndexed || false,
      },
    });
  }

  async updateApiDocLink(projectId: string, userId: string, linkId: string, data: Partial<{
    label: string;
    url: string;
    type: string;
    description: string;
    aiIndexed: boolean;
  }>) {
    await this.checkProjectMaintainer(projectId, userId);
    return this.prisma.projectApiDocLink.update({
      where: { id: linkId },
      data,
    });
  }

  async deleteApiDocLink(projectId: string, userId: string, linkId: string) {
    await this.checkProjectMaintainer(projectId, userId);
    await this.prisma.projectApiDocLink.delete({
      where: { id: linkId },
    });
    return { success: true };
  }

  // Health Snapshots
  async getHealthSnapshots(projectId: string, userId: string, days: number = 30) {
    await this.checkProjectAccess(projectId, userId);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.projectHealthSnapshot.findMany({
      where: {
        projectId,
        date: {
          gte: startDate.toISOString().split('T')[0],
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  // AI Context
  async getAIContext(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);
    return this.prisma.projectAIContext.findUnique({
      where: { projectId },
    });
  }

  async refreshAIContext(projectId: string, userId: string) {
    await this.checkProjectMaintainer(projectId, userId);

    // Get project data
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: { select: { members: true, tasks: true } },
        tasks: {
          where: { status: { not: 'done' } },
          select: { status: true, dueDate: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Calculate health score (simplified)
    const totalTasks = project._count.tasks || 0;
    const activeTasks = project.tasks.length;
    const overdueTasks = project.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;

    const healthScore = totalTasks > 0
      ? Math.round(50 + (activeTasks / totalTasks) * 30 - (overdueTasks / totalTasks) * 20)
      : 50;

    // Get tech stack from repository analysis (simplified - would integrate with Git module)
    const techStack: string[] = [];
    const languages: string[] = [];

    // Determine team size category
    const memberCount = project._count.members || 0;
    const teamSizeCategory = memberCount === 1 ? 'solo' : memberCount <= 5 ? 'small' : memberCount <= 20 ? 'medium' : 'large';

    // Determine lifecycle phase based on project age
    const projectAge = (new Date().getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const lifecyclePhase = projectAge < 30 ? 'inception' : projectAge < 180 ? 'development' : 'maintenance';

    // Simple complexity based on task count
    const complexityLevel = totalTasks < 10 ? 'low' : totalTasks < 50 ? 'medium' : totalTasks < 100 ? 'high' : 'critical';

    // Generate auto summary
    const autoSummary = `Project "${project.name}" has ${totalTasks} tasks (${activeTasks} active). Team size: ${memberCount} members. Current phase: ${lifecyclePhase}.`;

    // Upsert AI context
    const aiContext = await this.prisma.projectAIContext.upsert({
      where: { projectId },
      create: {
        projectId,
        techStack,
        languages,
        domainTags: [],
        teamSizeCategory,
        lifecyclePhase,
        complexityLevel,
        riskIndicators: {
          overdueTaskRatio: totalTasks > 0 ? overdueTasks / totalTasks : 0,
          blockedTaskCount: 0,
          velocityTrend: 'stable',
          ciFailureRate: 0,
        },
        healthScore,
        autoSummary,
        lastComputedAt: new Date(),
      },
      update: {
        techStack,
        languages,
        teamSizeCategory,
        lifecyclePhase,
        complexityLevel,
        riskIndicators: {
          overdueTaskRatio: totalTasks > 0 ? overdueTasks / totalTasks : 0,
          blockedTaskCount: 0,
          velocityTrend: 'stable',
          ciFailureRate: 0,
        },
        healthScore,
        autoSummary,
        lastComputedAt: new Date(),
      },
    });

    // Create a health snapshot
    await this.prisma.projectHealthSnapshot.create({
      data: {
        projectId,
        date: new Date().toISOString().split('T')[0],
        healthScore,
        breakdown: {
          iterationCompletionRate: 0.8,
          overdueTaskRatio: totalTasks > 0 ? overdueTasks / totalTasks : 0,
          ciSuccessRate: 1,
          commitActivity: 0.7,
          blockedTaskRatio: 0,
        },
        computedAt: new Date(),
      },
    });

    // Update project health score
    await this.prisma.project.update({
      where: { id: projectId },
      data: { healthScore },
    });

    return aiContext;
  }

  // Helper methods
  private async checkProjectAccess(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private async checkProjectMaintainer(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member || !['owner', 'maintainer'].includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
