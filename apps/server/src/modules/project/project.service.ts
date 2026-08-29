import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Prisma } from '@prisma/client';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { ActivityService } from '../activity/activity.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { parseFilterQuery } from '../../common/utils/filter-query.util';

const PROJECT_FILTER_KEYS = [
  'status',
  'type',
  'memberId',
  'priority',
  'workflowStatus',
  'riskLevel',
  'ownerId',
] as const;

export interface DashboardSummaryTaskItem {
  id: string;
  title: string;
  priority: string;
  assignee: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  dueDate: string | null;
}

export interface DashboardSummaryColumn {
  id: 'todo' | 'in_progress' | 'in_review' | 'done';
  title: string;
  count: number;
  tasks: DashboardSummaryTaskItem[];
}

type DashboardMetricStatus =
  | 'on_track'
  | 'stable'
  | 'high'
  | 'action_needed'
  | 'pending';

type DashboardMetricSource =
  | 'health_snapshot'
  | 'task_aggregation'
  | 'doc_links'
  | 'ai_context'
  | 'pending_integration';

export interface DashboardHealthDetailMetric {
  key: string;
  label: string;
  score: number;
  weight: number;
  status: DashboardMetricStatus;
  trend?: number;
  source: DashboardMetricSource;
  available: boolean;
}

export interface DashboardDistributionItem {
  key: string;
  label: string;
  value: number;
}

export interface DashboardAnalyticsPoint {
  date: string;
  healthScore: number;
  deliveryScore: number;
  completionRate: number;
}

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly activityService: ActivityService,
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
        projectCode:
          createProjectDto.projectCode ||
          this.generateProjectCode(createProjectDto.name),
        icon: createProjectDto.icon,
        color: createProjectDto.color,
        type: createProjectDto.type,
        visibility: createProjectDto.visibility,
        status: 'active',
        priority: createProjectDto.priority || 'medium',
        workflowStatus: createProjectDto.workflowStatus || 'planned',
        healthStatus:
          createProjectDto.healthStatus || this.mapHealthStatusByScore(50),
        riskLevel: createProjectDto.riskLevel || 'medium',
        progress: createProjectDto.progress ?? 0,
        ownerId: createProjectDto.ownerId || userId,
        startDate: createProjectDto.startDate
          ? new Date(createProjectDto.startDate)
          : null,
        targetDate: createProjectDto.targetDate
          ? new Date(createProjectDto.targetDate)
          : null,
        category: createProjectDto.category,
        estimatePoints: createProjectDto.estimatePoints,
        blockedReason: createProjectDto.blockedReason,
        lastActivityAt: new Date(),
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
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
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

    await this.activityService.record({
      entityType: 'project',
      entityId: project.id,
      projectId: project.id,
      actorId: userId,
      type: 'created',
      summary: `Project created`,
      source: 'user',
    });

    return project;
  }

  async findAll(query: ProjectQueryDto, userId: string) {
    const { q, filters, page = 1, pageSize = 20 } = query;
    const parsedFilters = parseFilterQuery(filters, PROJECT_FILTER_KEYS);
    const statuses = parsedFilters.status;
    const types = parsedFilters.type;
    const memberIds = parsedFilters.memberId;
    const priorities = parsedFilters.priority;
    const workflowStatuses = parsedFilters.workflowStatus;
    const riskLevels = parsedFilters.riskLevel;
    const ownerIds = parsedFilters.ownerId;

    // Ensure numeric pagination values (query params arrive as strings)
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;

    const where: any = {};

    // Search by name/description
    if (q) {
      where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
    }

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (types && types.length > 0) {
      where.type = { in: types };
    }

    if (priorities && priorities.length > 0) {
      where.priority = { in: priorities };
    }

    if (workflowStatuses && workflowStatuses.length > 0) {
      where.workflowStatus = { in: workflowStatuses };
    }

    if (riskLevels && riskLevels.length > 0) {
      where.riskLevel = { in: riskLevels };
    }

    if (ownerIds && ownerIds.length > 0) {
      where.ownerId = { in: ownerIds };
    }

    // Filter by member participation
    if (memberIds && memberIds.length > 0) {
      where.members = {
        some: {
          userId: { in: memberIds },
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
        orderBy: [{ lastActivityAt: 'desc' }, { updatedAt: 'desc' }],
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
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
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

    // TeamProject 是无 Prisma 关联的裸联表，二次查询拼装每项目所属团队
    const projectIds = projects.map((p) => p.id);
    const teamLinks = projectIds.length
      ? await this.prisma.teamProject.findMany({
          where: { projectId: { in: projectIds } },
          select: { projectId: true, teamId: true },
        })
      : [];
    const teamIds = [...new Set(teamLinks.map((link) => link.teamId))];
    const teamRows = teamIds.length
      ? await this.prisma.team.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, name: true, color: true },
        })
      : [];
    const teamById = new Map(teamRows.map((team) => [team.id, team]));
    const teamsByProject = new Map<
      string,
      Array<{ id: string; name: string; color: string | null }>
    >();
    for (const link of teamLinks) {
      const team = teamById.get(link.teamId);
      if (!team) continue;
      const list = teamsByProject.get(link.projectId) ?? [];
      list.push(team);
      teamsByProject.set(link.projectId, list);
    }

    const totalPages = Math.ceil(total / pageSizeNum);
    return {
      items: projects.map((project) => ({
        ...project,
        teams: teamsByProject.get(project.id) ?? [],
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages,
    } as {
      items: Array<
        (typeof projects)[number] & {
          teams: Array<{ id: string; name: string; color: string | null }>;
        }
      >;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
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
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
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

    // TeamProject 是无 Prisma 关联的裸联表，二次查询拼装所属团队（与 findAll 同款）
    const teamLinks = await this.prisma.teamProject.findMany({
      where: { projectId: id },
      select: { teamId: true },
    });
    const teamIds = [...new Set(teamLinks.map((link) => link.teamId))];
    const teamRows = teamIds.length
      ? await this.prisma.team.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, name: true, color: true },
        })
      : [];

    return { ...project, teams: teamRows };
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

    // Field lock: when the project is sourced from an external task provider (e.g. Linear),
    // a strict whitelist of base fields cannot be edited locally.
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
    });
    if (existingProject?.fieldsLockedExternally) {
      const lockedByProvider = new Set<string>([
        'name',
        'description',
        'icon',
        'color',
        'workflowStatus',
        'priority',
        'healthStatus',
        'targetDate',
        'startDate',
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dto = updateProjectDto as any;
      const conflicting = Object.keys(dto).filter(
        (k) => lockedByProvider.has(k) && dto[k] !== undefined,
      );
      if (conflicting.length > 0) {
        throw new ConflictException(
          `Project is synced from ${existingProject.externalProvider ?? existingProject.source ?? 'external source'}; ` +
            `field(s) [${conflicting.join(', ')}] cannot be modified locally.`,
        );
      }
    }

    // Update localUpdatedAt-equivalent for locked projects so that next sync detects drift.
    const baseUpdate = this.toProjectUpdateData(updateProjectDto);
    if (existingProject?.fieldsLockedExternally) {
      (baseUpdate as any).lastActivityAt = new Date();
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: baseUpdate,
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
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
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

    // 全字段 diff 落动态
    if (existingProject) {
      const normalize = (value: unknown): string | null => {
        if (value === undefined || value === null || value === '') return null;
        if (value instanceof Date) return value.toISOString();
        return String(value);
      };
      const DIFF_FIELDS = [
        'name',
        'description',
        'priority',
        'workflowStatus',
        'status',
        'healthStatus',
        'riskLevel',
        'progress',
        'ownerId',
        'startDate',
        'targetDate',
        'icon',
        'color',
        'category',
        'estimatePoints',
        'blockedReason',
      ] as const;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newData = baseUpdate as Record<string, any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldData = existingProject as Record<string, any>;
      const changes = DIFF_FIELDS.flatMap((field) => {
        if (newData[field] === undefined) return [];
        const oldValue = normalize(oldData[field]);
        const newValue = normalize(newData[field]);
        return oldValue === newValue ? [] : [{ field, oldValue, newValue }];
      });
      if (changes.length > 0) {
        const statusChange = changes.find(
          (c) => c.field === 'status' || c.field === 'workflowStatus',
        );
        await this.activityService.record({
          entityType: 'project',
          entityId: id,
          projectId: id,
          actorId: userId,
          type: statusChange ? 'status_changed' : 'field_changed',
          summary: statusChange
            ? `Status changed from ${statusChange.oldValue ?? 'empty'} to ${statusChange.newValue ?? 'empty'}`
            : `Updated ${changes.map((c) => c.field).join(', ')}`,
          source: 'user',
          changes,
        });
      }
    }

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
      data: { status: 'archived', lastActivityAt: new Date() },
    });

    await this.activityService.record({
      entityType: 'project',
      entityId: id,
      projectId: id,
      actorId: userId,
      type: 'status_changed',
      summary: `Status changed from active to archived`,
      source: 'user',
      changes: [{ field: 'status', oldValue: 'active', newValue: 'archived' }],
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
      data: { status: 'active', lastActivityAt: new Date() },
    });

    await this.activityService.record({
      entityType: 'project',
      entityId: id,
      projectId: id,
      actorId: userId,
      type: 'status_changed',
      summary: `Status changed from archived to active`,
      source: 'user',
      changes: [{ field: 'status', oldValue: 'archived', newValue: 'active' }],
    });

    this.messageBus.publish('project.updated', {
      projectId: project.id,
      userId,
      project,
    });

    return project;
  }

  async getDashboardSummary(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
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
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      tasks,
      healthSnapshots,
      aiContext,
      iterations,
      milestones,
      activities,
      externalLinks,
      docLinks,
      apiDocLinks,
      repositories,
    ] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assigneeId: true,
          assignee: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.projectHealthSnapshot.findMany({
        where: {
          projectId,
          date: {
            gte: thirtyDaysAgo.toISOString().split('T')[0],
          },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.projectAIContext.findUnique({
        where: { projectId },
      }),
      this.prisma.iteration.findMany({
        where: { projectId },
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      }),
      this.prisma.milestone.findMany({
        where: { projectId },
        orderBy: { targetDate: 'asc' },
        select: {
          id: true,
          name: true,
          status: true,
          targetDate: true,
        },
      }),
      this.prisma.taskActivity.findMany({
        where: { projectId },
        orderBy: { timestamp: 'desc' },
        take: 20,
      }),
      this.prisma.externalProjectLink.findMany({
        where: { projectId },
      }),
      this.prisma.projectDocLink.findMany({
        where: { projectId },
      }),
      this.prisma.projectApiDocLink.findMany({
        where: { projectId },
      }),
      this.prisma.repository.findMany({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const doneKeywords = ['done', 'complete', 'completed', 'closed'];
    const progressKeywords = [
      'progress',
      'doing',
      'active',
      'develop',
      'implement',
    ];
    const reviewKeywords = ['review', 'qa', 'test', 'verify'];

    const normalizeTaskStatus = (
      status: string,
    ): DashboardSummaryColumn['id'] => {
      const normalized = status.toLowerCase();
      if (doneKeywords.some((keyword) => normalized.includes(keyword))) {
        return 'done';
      }
      if (reviewKeywords.some((keyword) => normalized.includes(keyword))) {
        return 'in_review';
      }
      if (progressKeywords.some((keyword) => normalized.includes(keyword))) {
        return 'in_progress';
      }
      return 'todo';
    };

    const tasksByColumn = {
      todo: [] as typeof tasks,
      in_progress: [] as typeof tasks,
      in_review: [] as typeof tasks,
      done: [] as typeof tasks,
    };

    tasks.forEach((task) => {
      const columnId = normalizeTaskStatus(task.status || 'todo');
      tasksByColumn[columnId].push(task);
    });

    const overdueCount = tasks.filter((task) => {
      if (!task.dueDate) return false;
      const isDone = normalizeTaskStatus(task.status || 'todo') === 'done';
      return !isDone && new Date(task.dueDate) < now;
    }).length;

    const mapPreviewTask = (
      task: (typeof tasks)[number],
    ): DashboardSummaryTaskItem => ({
      id: task.id,
      title: task.title,
      priority: task.priority || 'medium',
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            displayName: task.assignee.displayName,
            avatarUrl: task.assignee.avatarUrl || null,
          }
        : null,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    });

    const boardPreview: DashboardSummaryColumn[] = [
      {
        id: 'todo',
        title: 'To Do',
        count: tasksByColumn.todo.length,
        tasks: tasksByColumn.todo.slice(0, 3).map(mapPreviewTask),
      },
      {
        id: 'in_progress',
        title: 'In Progress',
        count: tasksByColumn.in_progress.length,
        tasks: tasksByColumn.in_progress.slice(0, 3).map(mapPreviewTask),
      },
      {
        id: 'in_review',
        title: 'In Review',
        count: tasksByColumn.in_review.length,
        tasks: tasksByColumn.in_review.slice(0, 3).map(mapPreviewTask),
      },
      {
        id: 'done',
        title: 'Done',
        count: tasksByColumn.done.length,
        tasks: tasksByColumn.done.slice(0, 3).map(mapPreviewTask),
      },
    ];

    const latestHealth = healthSnapshots[healthSnapshots.length - 1];
    const previousHealth =
      healthSnapshots[healthSnapshots.length - 2] || latestHealth;
    const healthTrend30d =
      latestHealth && previousHealth
        ? latestHealth.healthScore - previousHealth.healthScore
        : 0;
    const currentHealthScore =
      latestHealth?.healthScore ?? project.healthScore ?? 0;
    const lastEvaluatedAt = latestHealth?.computedAt
      ? latestHealth.computedAt.toISOString()
      : null;
    const breakdown = this.normalizeHealthBreakdown(latestHealth?.breakdown);
    const completionRate =
      tasks.length > 0 ? tasksByColumn.done.length / tasks.length : null;
    const overdueRatio = tasks.length > 0 ? overdueCount / tasks.length : null;
    const docsTotal = docLinks.length + apiDocLinks.length;
    const docsIndexedTotal =
      docLinks.filter((doc) => doc.aiIndexed).length +
      apiDocLinks.filter((doc) => doc.aiIndexed).length;
    const docsCoverage = docsTotal > 0 ? docsIndexedTotal / docsTotal : null;
    const blockedTaskRatio = breakdown.blockedTaskRatio ?? null;
    const ciSuccessRate = breakdown.ciSuccessRate ?? null;
    const iterationCompletionRate =
      breakdown.iterationCompletionRate ?? completionRate;

    const healthDetails: DashboardHealthDetailMetric[] = [
      this.toHealthDetailMetric({
        key: 'code_quality',
        label: 'Code Quality',
        value: ciSuccessRate,
        weight: 0.25,
        source:
          ciSuccessRate === null ? 'pending_integration' : 'health_snapshot',
        fallbackStatus: 'pending',
      }),
      this.toHealthDetailMetric({
        key: 'ci_success',
        label: 'CI Success',
        value: ciSuccessRate,
        weight: 0.2,
        source:
          ciSuccessRate === null ? 'pending_integration' : 'health_snapshot',
        fallbackStatus: 'pending',
      }),
      this.toHealthDetailMetric({
        key: 'sprint_velocity',
        label: 'Sprint Velocity',
        value: iterationCompletionRate,
        weight: 0.2,
        source:
          iterationCompletionRate === null
            ? 'pending_integration'
            : 'task_aggregation',
        fallbackStatus: 'pending',
      }),
      this.toHealthDetailMetric({
        key: 'documentation_coverage',
        label: 'Documentation Coverage',
        value: docsCoverage,
        weight: 0.15,
        source: docsCoverage === null ? 'pending_integration' : 'doc_links',
        fallbackStatus: 'pending',
      }),
      this.toHealthDetailMetric({
        key: 'risk_control',
        label: 'Risk Control',
        value:
          overdueRatio === null && blockedTaskRatio === null
            ? null
            : 1 - Math.max(overdueRatio ?? 0, blockedTaskRatio ?? 0),
        weight: 0.2,
        source:
          overdueRatio === null && blockedTaskRatio === null
            ? 'pending_integration'
            : 'task_aggregation',
        fallbackStatus: 'pending',
      }),
    ];

    const aiRiskIndicators = this.normalizeRiskIndicators(
      aiContext?.riskIndicators,
    );
    const aiRiskDistribution: DashboardDistributionItem[] = [
      {
        key: 'overdue_risk',
        label: 'Overdue Risk',
        value: Math.round(
          this.normalizePercent(aiRiskIndicators.overdueTaskRatio) * 100,
        ),
      },
      {
        key: 'blocked_risk',
        label: 'Blocked Risk',
        value: Math.round(
          this.normalizePercent(
            tasks.length > 0
              ? aiRiskIndicators.blockedTaskCount / tasks.length
              : 0,
          ) * 100,
        ),
      },
      {
        key: 'ci_failure_risk',
        label: 'CI Failure Risk',
        value: Math.round(
          this.normalizePercent(aiRiskIndicators.ciFailureRate) * 100,
        ),
      },
    ];
    const aiComplexityDistribution: DashboardDistributionItem[] = [
      {
        key: 'complexity',
        label: 'Complexity',
        value: this.mapComplexityToScore(aiContext?.complexityLevel),
      },
      {
        key: 'lifecycle_risk',
        label: 'Lifecycle Risk',
        value: this.mapLifecycleToRisk(aiContext?.lifecyclePhase),
      },
      {
        key: 'velocity_signal',
        label: 'Velocity Signal',
        value: this.mapVelocityTrendToScore(aiRiskIndicators.velocityTrend),
      },
    ];

    const memberTaskCount = new Map<
      string,
      {
        memberId: string;
        memberName: string;
        avatarUrl: string | null;
        taskCount: number;
      }
    >();

    project.members.forEach((member) => {
      memberTaskCount.set(member.user.id, {
        memberId: member.user.id,
        memberName: member.user.displayName || member.user.username,
        avatarUrl: member.user.avatarUrl || null,
        taskCount: 0,
      });
    });

    tasks.forEach((task) => {
      if (!task.assigneeId) return;
      const current = memberTaskCount.get(task.assigneeId);
      if (!current) return;
      current.taskCount += 1;
    });

    const totalAssigned = Array.from(memberTaskCount.values()).reduce(
      (acc, item) => acc + item.taskCount,
      0,
    );

    const teamWorkload = Array.from(memberTaskCount.values()).map((member) => {
      const percentage =
        totalAssigned > 0
          ? Math.round((member.taskCount / totalAssigned) * 100)
          : 0;
      const status =
        percentage >= 60 ? 'high' : percentage <= 20 ? 'low' : 'normal';
      return {
        ...member,
        percentage,
        status,
      };
    });

    const activityFeed = activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      summary: activity.summary || 'Activity updated',
      source: activity.source || 'system',
      timestamp: activity.timestamp.toISOString(),
      taskId: activity.taskId,
    }));

    const healthHistory = healthSnapshots.map((snapshot) => {
      const snapshotBreakdown = this.normalizeHealthBreakdown(
        snapshot.breakdown,
      );
      const snapshotDelivery =
        snapshotBreakdown.iterationCompletionRate ??
        snapshotBreakdown.commitActivity ??
        completionRate ??
        0;
      return {
        date: snapshot.date,
        healthScore: snapshot.healthScore,
        deliveryScore: Math.round(
          this.normalizePercent(snapshotDelivery) * 100,
        ),
        completionRate: Math.round(
          this.normalizePercent(snapshotDelivery) * 100,
        ),
      } satisfies DashboardAnalyticsPoint;
    });

    const analyticsTimeline =
      healthHistory.length > 0
        ? healthHistory
        : [
            {
              date: now.toISOString().split('T')[0],
              healthScore: currentHealthScore,
              deliveryScore: Math.round(
                this.normalizePercent(completionRate) * 100,
              ),
              completionRate: Math.round(
                this.normalizePercent(completionRate) * 100,
              ),
            },
          ];

    return {
      projectMeta: {
        id: project.id,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        priority: project.priority,
        visibility: project.visibility,
        healthStatus: project.healthStatus,
        riskLevel: project.riskLevel,
        color: project.color,
        icon: project.icon,
        startDate: project.startDate ? project.startDate.toISOString() : null,
        targetDate: project.targetDate
          ? project.targetDate.toISOString()
          : null,
        owner: project.owner,
        members: project.members.map((member) => ({
          user: member.user,
          role: member.role,
        })),
      },
      taskStats: {
        total: tasks.length,
        todo: tasksByColumn.todo.length,
        inProgress: tasksByColumn.in_progress.length,
        inReview: tasksByColumn.in_review.length,
        done: tasksByColumn.done.length,
        overdue: overdueCount,
      },
      boardPreview,
      health: {
        currentScore: currentHealthScore,
        trend30d: healthTrend30d,
        latestBreakdown: latestHealth?.breakdown || null,
        details: healthDetails,
        lastEvaluatedAt,
      },
      ai: {
        score: aiContext?.healthScore ?? project.healthScore ?? 0,
        complexity: aiContext?.complexityLevel || null,
        lifecycle: aiContext?.lifecyclePhase || null,
        teamSize: aiContext?.teamSizeCategory || null,
        summary: aiContext?.autoSummary || null,
        lastComputedAt: aiContext?.lastComputedAt
          ? aiContext.lastComputedAt.toISOString()
          : null,
        details: {
          riskBreakdown: aiRiskDistribution,
          complexityBreakdown: aiComplexityDistribution,
        },
      },
      teamWorkload,
      analytics: {
        deliveryTimeline: analyticsTimeline,
        workloadDistribution: teamWorkload.map((member) => ({
          key: member.memberId,
          label: member.memberName,
          value: member.percentage,
        })),
        aiRiskDistribution,
        aiComplexityDistribution,
      },
      activityFeed,
      milestones: milestones.map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        status: milestone.status,
        targetDate: milestone.targetDate
          ? milestone.targetDate.toISOString()
          : null,
      })),
      iterations: iterations.map((iteration) => ({
        id: iteration.id,
        name: iteration.name,
        status: iteration.status,
        startDate: iteration.startDate.toISOString(),
        endDate: iteration.endDate.toISOString(),
      })),
      integrations: {
        repositories: repositories.map((repo) => ({
          id: repo.id,
          name: repo.name,
          provider: repo.provider,
          remoteUrl: repo.remoteUrl,
          validationStatus: repo.validationStatus || 'unknown',
        })),
        externalLinksCount: externalLinks.length,
        docLinksCount: docLinks.length,
        apiDocLinksCount: apiDocLinks.length,
      },
    };
  }

  // External Project Links
  async getExternalLinks(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);
    return this.prisma.externalProjectLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addExternalLink(
    projectId: string,
    userId: string,
    data: {
      provider: string;
      externalProjectId: string;
      externalProjectUrl: string;
      syncConfig?: Prisma.JsonObject;
    },
  ) {
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

  async updateExternalLink(
    projectId: string,
    userId: string,
    linkId: string,
    data: {
      provider?: string;
      externalProjectId?: string;
      externalProjectUrl?: string;
      syncConfig?: Prisma.JsonObject;
      syncStatus?: string;
    },
  ) {
    await this.checkProjectMaintainer(projectId, userId);
    return this.prisma.externalProjectLink.update({
      where: { id: linkId },
      data: {
        ...(data.provider && { provider: data.provider }),
        ...(data.externalProjectId && {
          externalProjectId: data.externalProjectId,
        }),
        ...(data.externalProjectUrl && {
          externalProjectUrl: data.externalProjectUrl,
        }),
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
  }

  // Document Links
  async getDocLinks(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);
    return this.prisma.projectDocLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDocLink(
    projectId: string,
    userId: string,
    data: {
      label: string;
      url: string;
      type: string;
      description?: string;
      aiIndexed?: boolean;
    },
  ) {
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

  async updateDocLink(
    projectId: string,
    userId: string,
    linkId: string,
    data: Partial<{
      label: string;
      url: string;
      type: string;
      description: string;
      aiIndexed: boolean;
    }>,
  ) {
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
  }

  // API Doc Links
  async getApiDocLinks(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);
    return this.prisma.projectApiDocLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addApiDocLink(
    projectId: string,
    userId: string,
    data: {
      label: string;
      url: string;
      type: string;
      description?: string;
      aiIndexed?: boolean;
    },
  ) {
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

  async updateApiDocLink(
    projectId: string,
    userId: string,
    linkId: string,
    data: Partial<{
      label: string;
      url: string;
      type: string;
      description: string;
      aiIndexed: boolean;
    }>,
  ) {
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
  }

  // Health Snapshots
  async getHealthSnapshots(
    projectId: string,
    userId: string,
    days: number = 30,
  ) {
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
    const overdueTasks = project.tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date(),
    ).length;

    const healthScore =
      totalTasks > 0
        ? Math.round(
            50 +
              (activeTasks / totalTasks) * 30 -
              (overdueTasks / totalTasks) * 20,
          )
        : 50;

    // Get tech stack from repository analysis (simplified - would integrate with Git module)
    const techStack: string[] = [];
    const languages: string[] = [];

    // Determine team size category
    const memberCount = project._count.members || 0;
    const teamSizeCategory =
      memberCount === 1
        ? 'solo'
        : memberCount <= 5
          ? 'small'
          : memberCount <= 20
            ? 'medium'
            : 'large';

    // Determine lifecycle phase based on project age
    const projectAge =
      (new Date().getTime() - new Date(project.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    const lifecyclePhase =
      projectAge < 30
        ? 'inception'
        : projectAge < 180
          ? 'development'
          : 'maintenance';

    // Simple complexity based on task count
    const complexityLevel =
      totalTasks < 10
        ? 'low'
        : totalTasks < 50
          ? 'medium'
          : totalTasks < 100
            ? 'high'
            : 'critical';

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
      data: {
        healthScore,
        healthStatus: this.mapHealthStatusByScore(healthScore),
        lastActivityAt: new Date(),
      },
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

  private toProjectUpdateData(
    dto: UpdateProjectDto,
  ): Prisma.ProjectUpdateInput {
    const { startDate, targetDate, completedAt, ...rest } = dto;

    const data: Prisma.ProjectUpdateInput = {
      ...rest,
      lastActivityAt: new Date(),
    };

    if (startDate !== undefined) {
      data.startDate = startDate ? new Date(startDate) : null;
    }
    if (targetDate !== undefined) {
      data.targetDate = targetDate ? new Date(targetDate) : null;
    }
    if (completedAt !== undefined) {
      data.completedAt = completedAt ? new Date(completedAt) : null;
    }

    return data;
  }

  private normalizePercent(value: number | null | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }
    if (value > 1) {
      return Math.max(0, Math.min(1, value / 100));
    }
    return Math.max(0, Math.min(1, value));
  }

  private normalizeHealthBreakdown(
    breakdown: Prisma.JsonValue | null | undefined,
  ): {
    iterationCompletionRate?: number;
    overdueTaskRatio?: number;
    ciSuccessRate?: number;
    commitActivity?: number;
    blockedTaskRatio?: number;
  } {
    if (
      !breakdown ||
      typeof breakdown !== 'object' ||
      Array.isArray(breakdown)
    ) {
      return {};
    }

    const data = breakdown as Record<string, unknown>;
    return {
      iterationCompletionRate:
        typeof data.iterationCompletionRate === 'number'
          ? data.iterationCompletionRate
          : undefined,
      overdueTaskRatio:
        typeof data.overdueTaskRatio === 'number'
          ? data.overdueTaskRatio
          : undefined,
      ciSuccessRate:
        typeof data.ciSuccessRate === 'number' ? data.ciSuccessRate : undefined,
      commitActivity:
        typeof data.commitActivity === 'number'
          ? data.commitActivity
          : undefined,
      blockedTaskRatio:
        typeof data.blockedTaskRatio === 'number'
          ? data.blockedTaskRatio
          : undefined,
    };
  }

  private normalizeRiskIndicators(
    riskIndicators: Prisma.JsonValue | null | undefined,
  ): {
    overdueTaskRatio: number;
    blockedTaskCount: number;
    velocityTrend: 'up' | 'stable' | 'down';
    ciFailureRate: number;
  } {
    if (
      !riskIndicators ||
      typeof riskIndicators !== 'object' ||
      Array.isArray(riskIndicators)
    ) {
      return {
        overdueTaskRatio: 0,
        blockedTaskCount: 0,
        velocityTrend: 'stable',
        ciFailureRate: 0,
      };
    }

    const data = riskIndicators as Record<string, unknown>;
    return {
      overdueTaskRatio:
        typeof data.overdueTaskRatio === 'number' ? data.overdueTaskRatio : 0,
      blockedTaskCount:
        typeof data.blockedTaskCount === 'number' ? data.blockedTaskCount : 0,
      velocityTrend:
        data.velocityTrend === 'up' || data.velocityTrend === 'down'
          ? data.velocityTrend
          : 'stable',
      ciFailureRate:
        typeof data.ciFailureRate === 'number' ? data.ciFailureRate : 0,
    };
  }

  private getMetricStatus(score: number): DashboardMetricStatus {
    if (score >= 85) return 'on_track';
    if (score >= 70) return 'stable';
    if (score >= 50) return 'high';
    return 'action_needed';
  }

  private toHealthDetailMetric(input: {
    key: string;
    label: string;
    value: number | null | undefined;
    weight: number;
    source: DashboardMetricSource;
    fallbackStatus: DashboardMetricStatus;
  }): DashboardHealthDetailMetric {
    if (input.value === null || input.value === undefined) {
      return {
        key: input.key,
        label: input.label,
        score: 0,
        weight: input.weight,
        status: input.fallbackStatus,
        source: input.source,
        available: false,
      };
    }

    const score = Math.round(this.normalizePercent(input.value) * 100);
    return {
      key: input.key,
      label: input.label,
      score,
      weight: input.weight,
      status: this.getMetricStatus(score),
      source: input.source,
      available: true,
    };
  }

  private mapComplexityToScore(value?: string | null): number {
    if (value === 'critical') return 100;
    if (value === 'high') return 80;
    if (value === 'medium') return 60;
    if (value === 'low') return 30;
    return 50;
  }

  private mapLifecycleToRisk(value?: string | null): number {
    if (value === 'inception') return 70;
    if (value === 'development') return 55;
    if (value === 'maintenance') return 40;
    if (value === 'sunset') return 65;
    return 50;
  }

  private mapVelocityTrendToScore(value: 'up' | 'stable' | 'down'): number {
    if (value === 'up') return 20;
    if (value === 'down') return 85;
    return 45;
  }

  private mapHealthStatusByScore(score: number): string {
    if (score >= 80) return 'on_track';
    if (score >= 50) return 'at_risk';
    return 'off_track';
  }

  private generateProjectCode(name: string): string {
    const prefix =
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'PRJ';
    const suffix = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${suffix}`;
  }
}
