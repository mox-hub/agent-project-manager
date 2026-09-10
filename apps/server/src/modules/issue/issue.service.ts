import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueQueryDto } from './dto/issue-query.dto';
import { CreateIssueDependencyDto } from './dto/create-issue-dependency.dto';
import { AssignIssueAgentDto } from './dto/assign-issue-agent.dto';
import { CreateIssueExecutionDto } from './dto/create-issue-execution.dto';
import { ConfirmIssueExecutionDto } from './dto/confirm-issue-execution.dto';
import { parseFilterQuery } from '../../common/utils/filter-query.util';
import { resolveTagIds } from '../../common/utils/tag-resolve.util';
import {
  BUILTIN_CUSTOM_FIELD_KEYS,
  toCustomFieldsInput,
  withBuiltinCompat,
} from '../../common/utils/issue-custom-fields.util';
import { validateCustomFields } from '../issue-type/issue-type.service';
import { IssueIdService } from './services/issue-id.service';
import { IssueTypeService } from '../issue-type/issue-type.service';
import { ExecutionService } from '../execution/execution.service';
import { ActivityChange, ActivityService } from '../activity/activity.service';

const TASK_FILTER_KEYS = [
  'status',
  'assigneeId',
  'iterationId',
  'tag',
] as const;

@Injectable()
export class IssueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly issueIdService: IssueIdService,
    private readonly activityService: ActivityService,
    private readonly issueTypeService: IssueTypeService,
    private readonly executionService: ExecutionService,
  ) {}

  /** 类型桥接：旧 type 字符串 → IssueType.id（缺省回落内置 task） */
  private async resolveTypeId(typeKey?: string): Promise<string | null> {
    return this.issueTypeService.resolveIdByKey(typeKey || 'task');
  }

  /**
   * 任务可见性条件: 项目成员, 或未绑定项目时的 reporter / assignee。
   * 用作 findFirst 的 where.OR 列表。
   */
  private visibilityOr(userId: string): Prisma.IssueWhereInput[] {
    return [
      {
        project: {
          members: {
            some: { userId },
          },
        },
      },
      {
        assigneeId: userId,
        projectId: null,
      },
      {
        reporterId: userId,
        projectId: null,
      },
    ];
  }

  /** 任务/Bug 统一落动态：entityType 依据任务类型区分，便于分实体追踪 */
  private recordTaskActivity(
    task: {
      id: string;
      type?: string | null;
      projectId?: string | null;
    },
    input: {
      actorId?: string | null;
      type: string;
      summary?: string | null;
      content?: string | null;
      changes?: ActivityChange[] | null;
      source?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return this.activityService.record({
      entityType: task.type === 'bug' ? 'bug' : 'task',
      entityId: task.id,
      projectId: task.projectId ?? null,
      ...input,
    });
  }

  /**
   * 解析任务上下文中的项目: 显式传入则使用; 未传时优先从父任务继承
   * （右键创建子任务等场景只带 parentIssueId）, 否则为无项目任务（projectId = null）。
   * INBOX 不再是项目实体, 无项目任务直接以 projectId = null 落库。
   */
  private async resolveProjectContext(
    createIssueDto: CreateIssueDto,
  ): Promise<string | null> {
    if (createIssueDto.projectId) {
      return createIssueDto.projectId;
    }
    if (createIssueDto.parentIssueId) {
      const parent = await this.prisma.issue.findUnique({
        where: { id: createIssueDto.parentIssueId },
        select: { projectId: true },
      });
      if (parent?.projectId) {
        return parent.projectId;
      }
    }
    return null;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private async ensureProjectMember(projectId: string | null, userId: string) {
    if (!projectId) {
      throw new BadRequestException('Task is not associated with a project');
    }
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return member;
  }

  private async ensureProjectApprover(projectId: string, userId: string) {
    const member = await this.ensureProjectMember(projectId, userId);

    if (!['owner', 'maintainer'].includes(member.role)) {
      throw new ForbiddenException(
        'Only owner or maintainer can approve AI actions',
      );
    }

    return member;
  }

  /**
   * 可指派 AI 主体 = 本工作区注册的 Member(type=ai_agent)。
   * 不再要求 MemberProjectBinding，也不要求任务已归属项目：
   * issue（含收件箱任务）可指派给软件中所有注册的 AI 员工，
   * 派发时 provider/role 按成员默认 → 全局角色模板降级解析。
   */
  private async ensureAssignableAgent(memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        type: 'ai_agent',
        status: { not: 'inactive' },
      },
    });

    if (!member) {
      throw new NotFoundException(
        `AI member ${memberId} not found or unavailable`,
      );
    }

    return member;
  }

  /** aiAgent 归因统一取自 Member 表（aiAgentId 即 Member.id） */
  private async enrichTaskWithAgent<T extends { aiAgentId?: string | null }>(
    task: T,
  ): Promise<
    T & {
      aiAgent?: {
        id: string;
        name: string;
        type: string;
        status: string;
      } | null;
    }
  > {
    if (!task.aiAgentId) {
      return { ...task, aiAgent: null };
    }

    const member = await this.prisma.member.findUnique({
      where: { id: task.aiAgentId },
      select: {
        id: true,
        displayName: true,
        type: true,
        status: true,
      },
    });

    return {
      ...task,
      aiAgent: member
        ? {
            id: member.id,
            name: member.displayName,
            type: member.type,
            status: member.status,
          }
        : null,
    };
  }

  private async enrichTasksWithAgents<T extends { aiAgentId?: string | null }>(
    tasks: T[],
  ): Promise<
    Array<
      T & {
        aiAgent?: {
          id: string;
          name: string;
          type: string;
          status: string;
        } | null;
      }
    >
  > {
    const agentIds = Array.from(
      new Set(tasks.map((task) => task.aiAgentId).filter(Boolean)),
    ) as string[];

    if (agentIds.length === 0) {
      return tasks.map((task) => ({ ...task, aiAgent: null }));
    }

    const members = await this.prisma.member.findMany({
      where: { id: { in: agentIds } },
      select: {
        id: true,
        displayName: true,
        type: true,
        status: true,
      },
    });

    const agentMap = new Map<string, (typeof members)[number]>(
      members.map((member) => [member.id, member]),
    );

    return tasks.map((task) => ({
      ...task,
      aiAgent: task.aiAgentId
        ? (() => {
            const member = agentMap.get(task.aiAgentId!);
            return member
              ? {
                  id: member.id,
                  name: member.displayName,
                  type: member.type,
                  status: member.status,
                }
              : null;
          })()
        : null,
    }));
  }

  private async buildTaskExecutionContext(issueId: string) {
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            workflowStatus: true,
            riskLevel: true,
            aiContext: true,
          },
        },
        iteration: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        issueTags: {
          include: {
            tag: true,
          },
        },
        dependencies: {
          include: {
            dependsOnIssue: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${issueId} not found`);
    }

    const recentActivities = await this.prisma.issueActivity.findMany({
      where: { issueId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        summary: true,
        timestamp: true,
        source: true,
      },
    });

    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeType: task.assigneeType,
        aiAgentId: task.aiAgentId,
        tags: task.issueTags.map((item) => item.tag.name),
        dependencies: task.dependencies.map((item) => ({
          id: item.dependsOnIssue.id,
          title: item.dependsOnIssue.title,
          status: item.dependsOnIssue.status,
        })),
      },
      project: task.project
        ? {
            id: task.project.id,
            name: task.project.name,
            description: task.project.description,
            status: task.project.status,
            workflowStatus: task.project.workflowStatus,
            riskLevel: task.project.riskLevel,
            aiContext: task.project.aiContext,
          }
        : null,
      iteration: task.iteration,
      recentActivities,
    };
  }

  async create(createIssueDto: CreateIssueDto, userId: string) {
    // Resolve effective project: 显式传入优先, 其次从父任务继承, 否则为无项目任务
    const projectId = await this.resolveProjectContext(createIssueDto);

    // Verify project exists and user has access（无项目任务跳过项目校验）
    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          members: {
            some: {
              userId,
            },
          },
        },
      });

      if (!project) {
        throw new NotFoundException(`Project ${projectId} not found`);
      }
    }

    // Verify parent task if provided
    if (createIssueDto.parentIssueId) {
      const parentIssue = await this.prisma.issue.findFirst({
        where: {
          id: createIssueDto.parentIssueId,
          projectId,
        },
      });

      if (!parentIssue) {
        throw new NotFoundException('Parent task not found');
      }
    }

    // Get default status if not provided
    // First try project-specific status, then global status
    let status = createIssueDto.status;
    if (!status) {
      // Try project-specific status first
      let defaultStatus = await this.prisma.statusDefinition.findFirst({
        where: {
          type: 'task',
          projectId,
        },
        orderBy: { order: 'asc' },
      });

      // Fallback to global status
      if (!defaultStatus) {
        defaultStatus = await this.prisma.statusDefinition.findFirst({
          where: {
            type: 'task',
            projectId: null,
          },
          orderBy: { order: 'asc' },
        });
      }

      status = defaultStatus?.key || 'todo';
    } else {
      // Validate status exists (project-specific or global)
      const statusDef = await this.prisma.statusDefinition.findFirst({
        where: {
          type: 'task',
          key: status,
          OR: [{ projectId }, { projectId: null }],
        },
      });

      if (!statusDef) {
        throw new BadRequestException(`Invalid status: ${status}`);
      }
    }

    // 生成短 ID: 两段式全局序号, 与项目无关
    const shortId = await this.issueIdService.nextShortId();

    // V3 口径：建任务时指定 aiAgentId 必须是工作区内可指派的 AI 成员
    if (createIssueDto.aiAgentId) {
      await this.ensureAssignableAgent(createIssueDto.aiAgentId);
    }

    // 工单类型（4d 二期）：typeId 事实源 + fieldSchema 校验 customFields；
    // 旧顶层 bug 字段（severity 等）合并进 customFields 存储
    const effectiveTypeId =
      createIssueDto.typeId ??
      (await this.resolveTypeId(createIssueDto.type || 'task'));
    const typeDef = effectiveTypeId
      ? await this.prisma.issueType.findUnique({
          where: { id: effectiveTypeId },
          select: { fieldSchema: true },
        })
      : null;
    const mergedCustomFields = toCustomFieldsInput(undefined, createIssueDto);
    const validatedCustomFields = validateCustomFields(
      typeDef?.fieldSchema as never,
      mergedCustomFields,
      'create',
    );

    // Create task
    const task = await this.prisma.issue.create({
      data: {
        projectId,
        title: createIssueDto.title,
        description: createIssueDto.description,
        status,
        priority: createIssueDto.priority || 'medium',
        assigneeId: createIssueDto.assigneeId,
        assigneeType:
          createIssueDto.assigneeType ||
          (createIssueDto.aiAgentId ? 'ai_agent' : 'user'),
        aiAgentId: createIssueDto.aiAgentId,
        reporterId: createIssueDto.reporterId || userId,
        iterationId: createIssueDto.iterationId,
        parentIssueId: createIssueDto.parentIssueId,
        startDate: createIssueDto.startDate
          ? new Date(createIssueDto.startDate)
          : null,
        dueDate: createIssueDto.dueDate
          ? new Date(createIssueDto.dueDate)
          : null,
        estimate: createIssueDto.estimate,
        // 工单类型：typeId 为事实源；旧 type 字符串按 IssueType.key 桥接（缺省回落内置 task）
        type: createIssueDto.type || 'task',
        typeId: effectiveTypeId,
        // 短 ID
        shortId,
        // 自定义字段（内置 bug 六字段已迁入）
        customFields: validatedCustomFields as
          Prisma.InputJsonValue | undefined,
        // 里程碑关联
        milestoneId: createIssueDto.milestoneId,
        // 待办事项
        todoItems: createIssueDto.todoItems
          ? (createIssueDto.todoItems as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        issueTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Add tags if provided（元素可为 tag id 或名字, 统一解析）
    if (createIssueDto.tags && createIssueDto.tags.length > 0) {
      const tagIds = await resolveTagIds(this.prisma, {
        projectId,
        entries: createIssueDto.tags,
        userId,
        resourceType: 'task',
      });
      await Promise.all(
        tagIds.map((tagId) =>
          this.prisma.issueTag.create({
            data: {
              issueId: task.id,
              tagId,
              projectId,
            },
          }),
        ),
      );
    }

    // Create activity record (无项目时 projectId 为 null)
    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'created',
      summary: `Task created`,
      source: 'user',
      changes: [{ field: 'status', newValue: task.status }],
    });

    // Publish event
    this.messageBus.publish('task.created', {
      issueId: task.id,
      projectId: task.projectId,
      userId,
      task,
    });

    return this.findOne(task.id, userId);
  }

  async findAll(projectId: string, query: IssueQueryDto, userId: string) {
    // Verify project access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const { filters, q, page, pageSize } = query;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;
    const parsedFilters = parseFilterQuery(filters, TASK_FILTER_KEYS);
    const statuses = parsedFilters.status;
    const assigneeIds = parsedFilters.assigneeId;
    const iterationIds = parsedFilters.iterationId;
    const tags = parsedFilters.tag;

    const where: any = {
      projectId,
    };

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = { in: assigneeIds };
    }

    if (iterationIds && iterationIds.length > 0) {
      where.iterationId = { in: iterationIds };
    }

    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }

    if (tags && tags.length > 0) {
      where.issueTags = {
        some: {
          tagId: { in: tags },
        },
      };
    }

    // 子任务过滤：通过 parentIssueId 查询子任务
    if (query.parentIssueId) {
      where.parentIssueId = query.parentIssueId;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          issueTags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              subIssues: true,
              dependencies: true,
            },
          },
        },
      }),
      this.prisma.issue.count({ where }),
    ]);

    // 手动加载里程碑信息
    const milestoneIds = tasks
      .filter((t) => t.milestoneId)
      .map((t) => t.milestoneId!);
    const milestones =
      milestoneIds.length > 0
        ? await this.prisma.milestone.findMany({
            where: { id: { in: milestoneIds } },
            select: { id: true, name: true, status: true },
          })
        : [];
    const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

    const tasksWithMilestones = tasks.map((task) => ({
      ...withBuiltinCompat(task),
      milestone: task.milestoneId
        ? milestoneMap.get(task.milestoneId) || null
        : null,
    }));

    return {
      data: await this.enrichTasksWithAgents(
        tasksWithMilestones.map(withBuiltinCompat),
      ),
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  /**
   * 通过 shortId 查找任务
   */
  async findByShortId(shortId: string, userId: string) {
    // 1. 先通过 shortId 找到任务
    const task = await this.prisma.issue.findFirst({
      where: { shortId },
    });

    if (!task) {
      throw new NotFoundException(`Task with shortId ${shortId} not found`);
    }

    // 2. 校验用户权限
    const hasAccess = await this.hasTaskAccess(task.id, userId);
    if (!hasAccess) {
      throw new NotFoundException(`Task ${shortId} not found`);
    }

    // 3. 返回完整任务详情
    return this.findOne(task.id, userId);
  }

  /**
   * 校验用户是否有任务访问权限
   */
  private async hasTaskAccess(
    issueId: string,
    userId: string,
  ): Promise<boolean> {
    const task = await this.prisma.issue.findFirst({
      where: {
        id: issueId,
        OR: this.visibilityOr(userId),
      },
      select: { id: true },
    });
    return !!task;
  }

  async findOne(id: string, userId: string) {
    // 任务可能没有 projectId (未绑定项目 / inbox), 此时改用 reporterId/assigneeId 校验权限
    const task = await this.prisma.issue.findFirst({
      where: {
        id,
        OR: this.visibilityOr(userId),
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        parentIssue: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        subIssues: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        issueTags: {
          include: {
            tag: true,
          },
        },
        dependencies: {
          include: {
            dependsOnIssue: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        blockedBy: {
          include: {
            issue: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        iteration: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    // 手动加载里程碑信息
    let milestone = null;
    if (task.milestoneId) {
      milestone = await this.prisma.milestone.findUnique({
        where: { id: task.milestoneId },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });
    }

    // 加载 AI Agent 信息
    const enrichedTask = await this.enrichTaskWithAgent(task);

    return {
      ...withBuiltinCompat(enrichedTask),
      milestone,
    };
  }

  async findBugs(projectId: string, query: IssueQueryDto, _userId: string) {
    const { filters, q, page, pageSize } = query;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;

    const parsedFilters = parseFilterQuery(filters, TASK_FILTER_KEYS);
    const statuses = parsedFilters.status;
    const assigneeIds = parsedFilters.assigneeId;
    const iterationIds = parsedFilters.iterationId;

    const where: any = {
      projectId,
      type: 'bug',
    };

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = { in: assigneeIds };
    }

    if (iterationIds && iterationIds.length > 0) {
      where.iterationId = { in: iterationIds };
    }

    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          issueTags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              subIssues: true,
              dependencies: true,
            },
          },
          milestoneTasks: {
            include: {
              milestone: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.issue.count({ where }),
    ]);

    return {
      data: await this.enrichTasksWithAgents(tasks),
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async findAllBugs(query: IssueQueryDto, userId: string) {
    return this.findAllTasksByType(query, userId, 'bug');
  }
  async findAllTasks(
    query: IssueQueryDto & { type?: 'task' | 'bug' | 'all' },
    userId: string,
  ) {
    return this.findAllTasksByType(query, userId, query.type ?? 'all');
  }

  private async findAllTasksByType(
    query: IssueQueryDto,
    userId: string,
    type: 'task' | 'bug' | 'all',
  ) {
    const { filters, q, page, pageSize } = query;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;
    const parsedFilters = parseFilterQuery(filters, TASK_FILTER_KEYS);
    const statuses = parsedFilters.status;
    const assigneeIds = parsedFilters.assigneeId;

    // 可见范围 (visibility OR):
    //   - 用户是成员的项目中的任务（关系过滤走 EXISTS 子查询；
    //     大量项目时若拼 projectId IN 列表会触发 Prisma 引擎大 IN 分批去重失效，
    //     实测 >1000 个项目即出现行重复 / record.rs panic）
    //   - 未绑定项目 (projectId = null) 中用户为 reporter/assignee 的任务
    const visibilityOr: any[] = [
      { project: { members: { some: { userId } } } },
      { projectId: null, reporterId: userId },
      { projectId: null, assigneeId: userId },
    ];

    const where: any = {};

    if (type !== 'all') {
      where.type = type;
    }

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = { in: assigneeIds };
    }

    // 子任务过滤：通过 parentIssueId 查询子任务
    if (query.parentIssueId) {
      where.parentIssueId = query.parentIssueId;
    }

    if (q) {
      // 搜索关键字时合并可见性到同一个 OR 下, 让 prisma 自动处理并列条件
      where.OR = [
        ...visibilityOr,
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    } else {
      where.OR = visibilityOr;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          issueTags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              subIssues: true,
              dependencies: true,
            },
          },
        },
      }),
      this.prisma.issue.count({ where }),
    ]);

    // 手动加载里程碑信息
    const milestoneIds = tasks
      .filter((t) => t.milestoneId)
      .map((t) => t.milestoneId!);
    const milestones =
      milestoneIds.length > 0
        ? await this.prisma.milestone.findMany({
            where: { id: { in: milestoneIds } },
            select: { id: true, name: true, status: true },
          })
        : [];
    const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

    const tasksWithMilestones = tasks.map((task) => ({
      ...withBuiltinCompat(task),
      milestone: task.milestoneId
        ? milestoneMap.get(task.milestoneId) || null
        : null,
    }));

    return {
      data: tasksWithMilestones,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  /**
   * 跨项目列出当前用户有权限访问的所有 task + bug (含 type/bug)
   * 优先按 projectId 过滤, 没传时返回所有用户能看到的 task
   * 用于文档/段落关联面板: 即使文档没绑定 project 也能拿到可选任务清单
   */
  async findAccessibleTasks(
    query: IssueQueryDto & {
      projectId?: string;
      type?: 'task' | 'bug' | 'all';
    },
    userId: string,
  ) {
    const { filters, q, page, pageSize, projectId, type = 'all' } = query;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;
    const parsedFilters = parseFilterQuery(filters, TASK_FILTER_KEYS);
    const statuses = parsedFilters.status;
    const assigneeIds = parsedFilters.assigneeId;

    // 用户有权限的 projects（同样出于大 IN 引擎 bug 规避，用关系过滤代替 id 列表）
    const accessibleProjectCount = await this.prisma.project.count({
      where: { members: { some: { userId } } },
    });

    if (accessibleProjectCount === 0 && !projectId) {
      return {
        data: [],
        meta: { page: 1, pageSize: pageSizeNum, total: 0, totalPages: 0 },
      };
    }

    const projectFilter = projectId
      ? { id: projectId }
      : { members: { some: { userId } } };

    // type 过滤
    let typeFilter: any = undefined;
    if (type === 'task') {
      typeFilter = { equals: 'task' };
    } else if (type === 'bug') {
      typeFilter = { equals: 'bug' };
    } else {
      // all: 不限制 type (task + bug + 其它)
      typeFilter = undefined;
    }

    const where: any = {
      project: projectFilter,
    };
    if (typeFilter) {
      where.type = typeFilter;
    }
    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }
    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = { in: assigneeIds };
    }
    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          project: { select: { id: true, name: true } },
          issueTags: { include: { tag: true } },
          _count: { select: { subIssues: true, dependencies: true } },
        },
      }),
      this.prisma.issue.count({ where }),
    ]);

    // 手动加载里程碑信息
    const milestoneIds = tasks
      .filter((t) => t.milestoneId)
      .map((t) => t.milestoneId!);
    const milestones =
      milestoneIds.length > 0
        ? await this.prisma.milestone.findMany({
            where: { id: { in: milestoneIds } },
            select: { id: true, name: true, status: true },
          })
        : [];
    const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

    const tasksWithMilestones = tasks.map((task) => ({
      ...withBuiltinCompat(task),
      milestone: task.milestoneId
        ? milestoneMap.get(task.milestoneId) || null
        : null,
    }));

    return {
      data: tasksWithMilestones,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async update(id: string, updateIssueDto: UpdateIssueDto, userId: string) {
    const task = await this.prisma.issue.findFirst({
      where: {
        id,
        OR: this.visibilityOr(userId),
      },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    // 无项目时: 仅 reporter / assignee 可修改
    if (!task.projectId) {
      const isOwner = task.reporterId === userId || task.assigneeId === userId;
      if (!isOwner) {
        throw new ForbiddenException('Insufficient permissions');
      }
    } else if (task.project?.members.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const oldStatus = task.status;
    const updateData: any = { ...updateIssueDto };

    // 受管字段不透传 prisma：projectId / parentIssueId 需联动校验, tags 经 IssueTag 关联表重建,
    // force 是关单放行标记, 内置 bug 六字段与 customFields 走 customFields 合并存储
    delete updateData.projectId;
    delete updateData.parentIssueId;
    delete updateData.tags;
    delete updateData.force;
    for (const key of BUILTIN_CUSTOM_FIELD_KEYS) {
      delete updateData[key];
    }

    // 类型适配：typeId 为事实源；只传 type 字符串时桥接为 typeId，冗余 type 同步为 key
    let effectiveType: {
      id: string;
      key: string;
      fieldSchema: unknown;
    } | null = null;
    if (
      updateIssueDto.typeId !== undefined ||
      updateIssueDto.type !== undefined
    ) {
      const issueType = updateIssueDto.typeId
        ? await this.prisma.issueType.findUnique({
            where: { id: updateIssueDto.typeId },
          })
        : await this.prisma.issueType.findUnique({
            where: { key: updateIssueDto.type ?? 'task' },
          });
      if (!issueType) {
        throw new BadRequestException('工单类型不存在');
      }
      updateData.typeId = issueType.id;
      updateData.type = issueType.key;
      effectiveType = issueType;
    }

    // 4d 二期：顶层旧字段 + customFields 合并存储（针对现状类型定义校验；
    // 未显式改类型时以任务当前 typeId 的定义为准）
    if (
      updateIssueDto.customFields !== undefined ||
      BUILTIN_CUSTOM_FIELD_KEYS.some(
        (k) => (updateIssueDto as Record<string, unknown>)[k] !== undefined,
      )
    ) {
      const typeDef = effectiveType
        ? effectiveType
        : task.typeId
          ? await this.prisma.issueType.findUnique({
              where: { id: task.typeId },
              select: { id: true, key: true, fieldSchema: true },
            })
          : null;
      const merged = toCustomFieldsInput(
        task.customFields as Record<string, unknown> | null,
        updateIssueDto,
      );
      const validated = validateCustomFields(
        (typeDef?.fieldSchema ?? null) as never,
        merged,
        'update',
      );
      if (validated !== undefined) {
        updateData.customFields = validated as Prisma.InputJsonValue;
      }
    }

    // 项目变更（详情页「项目」胶囊移动任务）：校验目标项目成员身份,
    // 同步 IssueTag 归属, 清空不属于目标项目的里程碑 / 迭代。
    // shortId 不随项目变化（两段式全局序号, 生命周期 = 任务生命周期）。
    let targetProjectId = task.projectId;
    if (
      updateIssueDto.projectId !== undefined &&
      updateIssueDto.projectId !== task.projectId
    ) {
      targetProjectId = updateIssueDto.projectId;
      updateData.projectId = targetProjectId;
      if (targetProjectId) {
        const targetProject = await this.prisma.project.findFirst({
          where: { id: targetProjectId, members: { some: { userId } } },
        });
        if (!targetProject) {
          throw new NotFoundException(`Project ${targetProjectId} not found`);
        }
      }
      // 跨项目迁移时清空归属不符的里程碑 / 迭代
      if (task.milestoneId) {
        const milestone = await this.prisma.milestone.findFirst({
          where: { id: task.milestoneId, projectId: targetProjectId },
          select: { id: true },
        });
        if (!milestone) updateData.milestoneId = null;
      }
      if (task.iterationId) {
        // Iteration.projectId 非空：移出项目时迭代必然失配
        const iteration =
          targetProjectId === null
            ? null
            : await this.prisma.iteration.findFirst({
                where: { id: task.iterationId, projectId: targetProjectId },
                select: { id: true },
              });
        if (!iteration) updateData.iterationId = null;
      }
    }

    // 父任务变更：校验同项目归属, 禁止自引用与成环
    if (updateIssueDto.parentIssueId !== undefined) {
      if (updateIssueDto.parentIssueId === null) {
        updateData.parentIssueId = null;
      } else if (updateIssueDto.parentIssueId === id) {
        throw new BadRequestException('任务不能以自己作为父任务');
      } else {
        const parent = await this.prisma.issue.findFirst({
          where: {
            id: updateIssueDto.parentIssueId,
            projectId: targetProjectId,
          },
        });
        if (!parent) {
          throw new NotFoundException('Parent task not found');
        }
        // 沿父链上溯, 若当前任务出现在祖先链上则会成环
        let cursorId: string | null = parent.parentIssueId;
        const seen = new Set<string>([id]);
        while (cursorId && !seen.has(cursorId)) {
          seen.add(cursorId);
          const row = await this.prisma.issue.findUnique({
            where: { id: cursorId },
            select: { parentIssueId: true },
          });
          cursorId = row?.parentIssueId ?? null;
        }
        if (cursorId === id) {
          throw new BadRequestException('不允许形成父任务循环');
        }
        updateData.parentIssueId = parent.id;
      }
    }

    if (
      updateIssueDto.assigneeType === 'ai_agent' &&
      !(updateIssueDto.aiAgentId || task.aiAgentId)
    ) {
      throw new BadRequestException(
        'aiAgentId is required when assigneeType is ai_agent',
      );
    }

    // 4d 关单软强制：置为终态时校验未完成执行项（force=true 显式放行），
    // draft 执行项随单自动废弃（superseded）
    if (
      updateIssueDto.status !== undefined &&
      updateIssueDto.status !== oldStatus
    ) {
      const statusDef = await this.prisma.statusDefinition.findFirst({
        where: {
          type: 'task',
          key: updateIssueDto.status,
          OR: [{ projectId: task.projectId }, { projectId: null }],
        },
      });
      if (statusDef?.isFinal) {
        const blocking = await this.prisma.execution.findMany({
          where: {
            issueId: id,
            status: {
              in: ['planned', 'in_progress', 'pending_approval', 'blocked'],
            },
          },
          select: { id: true, title: true, goal: true },
        });
        if (blocking.length > 0 && !updateIssueDto.force) {
          throw new BadRequestException(
            `还有 ${blocking.length} 个未完成执行项，无法关闭该工单：` +
              blocking.map((e) => e.title ?? e.goal).join('、') +
              '。确认放弃请携带 force=true 重试。',
          );
        }
        await this.prisma.execution.updateMany({
          where: { issueId: id, status: 'draft' },
          data: { status: 'superseded' },
        });
      }
    }

    if (updateIssueDto.startDate !== undefined) {
      updateData.startDate = updateIssueDto.startDate
        ? new Date(updateIssueDto.startDate)
        : null;
    }

    if (updateIssueDto.dueDate !== undefined) {
      updateData.dueDate = updateIssueDto.dueDate
        ? new Date(updateIssueDto.dueDate)
        : null;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    // assigneeId 外键是 User.id；误传 Member.id 会打穿外键约束成 500，这里前置校验给出可读错误
    if (updateData.assigneeId) {
      const assigneeUser = await this.prisma.user.findUnique({
        where: { id: updateData.assigneeId },
        select: { id: true },
      });
      if (!assigneeUser) {
        throw new BadRequestException(
          `assigneeId ${updateData.assigneeId} 不存在（该字段只接受登录账号 User.id；按成员指派请走 /task-assignees 接口）`,
        );
      }
    }

    // AI Agent Assignment
    if (updateIssueDto.aiAgentId !== undefined && updateIssueDto.aiAgentId) {
      await this.ensureAssignableAgent(updateIssueDto.aiAgentId);
      updateData.assigneeType = 'ai_agent';
    }

    if (
      updateIssueDto.assigneeType === 'user' &&
      updateIssueDto.aiAgentId === undefined
    ) {
      updateData.aiAgentId = null;
    }

    // When the task is linked to an external provider (e.g. Linear),
    // mark it as having local changes so the next sync can push them upstream.
    const hasMeaningfulLocalChange =
      task.externalProvider &&
      task.externalIssueId &&
      (updateData.title !== undefined ||
        updateData.description !== undefined ||
        updateData.status !== undefined ||
        updateData.priority !== undefined ||
        updateData.dueDate !== undefined ||
        updateData.startDate !== undefined ||
        updateData.assigneeId !== undefined ||
        updateData.estimate !== undefined);
    if (hasMeaningfulLocalChange && updateData.syncStatus === undefined) {
      updateData.syncStatus = 'pending';
    }
    if (hasMeaningfulLocalChange) {
      updateData.localUpdatedAt = new Date();
    }

    // V3 验收门禁：任务标 done 前，所有验收契约必须处于 passed/waived。
    // 无契约的任务不拦（存量兼容）；未决或被驳回的契约会阻断完成。
    if (updateData.status === 'done' && oldStatus !== 'done') {
      const blocking = await this.prisma.acceptance.findMany({
        where: {
          issueId: id,
          status: { notIn: ['passed', 'waived'] },
        },
        select: { id: true, title: true, status: true },
      });
      if (blocking.length > 0) {
        throw new UnprocessableEntityException({
          code: 'TASK_DONE_BLOCKED',
          message: `存在 ${blocking.length} 个未通过验收的契约，需先接收（passed）或豁免（waived）`,
          acceptances: blocking,
        });
      }
    }

    const updatedTask = await this.prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        issueTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Update tags if provided（元素可为 tag id 或名字, 先统一解析）
    let resolvedTagIds: string[] | null = null;
    let previousTagIds: string[] | null = null;
    if (updateIssueDto.tags !== undefined) {
      resolvedTagIds = await resolveTagIds(this.prisma, {
        projectId: targetProjectId,
        entries: updateIssueDto.tags,
        userId,
        resourceType: 'task',
      });
      // Remove existing tags（先留存旧集合供动态 diff）
      previousTagIds = (
        await this.prisma.issueTag.findMany({
          where: { issueId: id },
          select: { tagId: true },
        })
      ).map((tt) => tt.tagId);
      await this.prisma.issueTag.deleteMany({
        where: { issueId: id },
      });

      // Add new tags
      if (resolvedTagIds.length > 0) {
        await Promise.all(
          resolvedTagIds.map((tagId) =>
            this.prisma.issueTag.create({
              data: {
                issueId: id,
                tagId,
                projectId: targetProjectId,
              },
            }),
          ),
        );
      }
    }

    // 全字段 diff 落动态：任何被实际修改的字段都会进入操作记录
    const normalize = (value: unknown): string | null => {
      if (value === undefined || value === null || value === '') return null;
      if (value instanceof Date) return value.toISOString();
      return String(value);
    };
    const DIFF_FIELDS = [
      'title',
      'description',
      'priority',
      'status',
      'assigneeId',
      'projectId',
      'milestoneId',
      'iterationId',
      'startDate',
      'dueDate',
      'estimate',
      'customFields', // 4d 二期：severity 等已并入 customFields，作为整体 diff
    ] as const;
    const changes: ActivityChange[] = DIFF_FIELDS.flatMap((field) => {
      if (updateData[field] === undefined) return [];
      const oldValue = normalize((task as Record<string, unknown>)[field]);
      const newValue = normalize(updateData[field]);
      return oldValue === newValue ? [] : [{ field, oldValue, newValue }];
    });

    if (changes.length > 0) {
      const statusChange = changes.find((c) => c.field === 'status');
      const assigneeChange = changes.find((c) => c.field === 'assigneeId');
      await this.recordTaskActivity(task, {
        actorId: userId,
        type: statusChange
          ? 'status_changed'
          : assigneeChange
            ? 'assigned'
            : 'field_changed',
        summary: statusChange
          ? `Status changed from ${statusChange.oldValue ?? 'empty'} to ${statusChange.newValue ?? 'empty'}`
          : assigneeChange
            ? 'Changed assignee'
            : `Updated ${changes.map((c) => c.field).join(', ')}`,
        source: 'user',
        changes,
      });
    }

    // 标签变化单独记录（以解析后的 tag id 对比）
    if (resolvedTagIds !== null && previousTagIds !== null) {
      const oldTagIds = previousTagIds;
      const added = resolvedTagIds.filter(
        (tagId) => !oldTagIds.includes(tagId),
      );
      const removed = oldTagIds.filter(
        (tagId) => !resolvedTagIds!.includes(tagId),
      );
      if (added.length > 0 || removed.length > 0) {
        await this.recordTaskActivity(task, {
          actorId: userId,
          type: 'field_changed',
          summary: 'Changed labels',
          source: 'user',
          changes: [
            ...added.map((tagId) => ({ field: 'labels', newValue: tagId })),
            ...removed.map((tagId) => ({ field: 'labels', oldValue: tagId })),
          ],
        });
      }
    }

    // Publish event（statusChanged 供通知订阅者判断状态流转；changedFields 供订阅推送过滤优先级/截止日期）
    this.messageBus.publish('task.updated', {
      issueId: id,
      projectId: task.projectId,
      userId,
      task: updatedTask,
      statusChanged:
        updateData.status !== undefined && updateData.status !== oldStatus,
      oldStatus,
      newStatus: updateData.status,
      changedFields: Object.keys(updateIssueDto),
    });

    return this.findOne(id, userId);
  }

  async delete(id: string, userId: string) {
    const task = await this.prisma.issue.findFirst({
      where: {
        id,
        OR: this.visibilityOr(userId),
      },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId,
                role: { in: ['owner', 'maintainer'] },
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    // 无项目时: 仅 reporter 可删除
    if (!task.projectId) {
      if (task.reporterId !== userId) {
        throw new ForbiddenException('Insufficient permissions');
      }
    } else if (task.project?.members.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.issue.delete({
      where: { id },
    });

    this.messageBus.publish('task.deleted', {
      issueId: id,
      taskTitle: task.title,
      projectId: task.projectId,
      userId,
    });
  }

  async assignAgent(issueId: string, dto: AssignIssueAgentDto, userId: string) {
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${issueId} not found`);
    }

    // 项目任务要求项目成员；收件箱任务与 update() 同口径：仅 reporter/assignee 可指派
    if (task.projectId) {
      await this.ensureProjectMember(task.projectId, userId);
    } else if (task.reporterId !== userId && task.assigneeId !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }
    const member = await this.ensureAssignableAgent(dto.agentId);

    // 指派真相源是 IssueAssignee 多对多，主负责人三字段同步之；
    // 旧主负责人行须同步移除（负责人显示取 assignedAt 升序首行，不移除会继续显示旧负责人）
    let prevPrimaryMemberId: string | null = null;
    const prevRows = await this.prisma.issueAssignee.findMany({
      where: { issueId },
    });
    if (prevRows.length > 0) {
      const prevMembers = await this.prisma.member.findMany({
        where: { id: { in: prevRows.map((r) => r.memberId) } },
        select: { id: true, userId: true, type: true },
      });
      const memberById = new Map(prevMembers.map((m) => [m.id, m]));
      const prevPrimary = prevRows.find((r) => {
        if (task.aiAgentId) return r.memberId === task.aiAgentId;
        const m = memberById.get(r.memberId);
        return !!m && m.type !== 'ai_agent' && m.userId === task.assigneeId;
      });
      prevPrimaryMemberId = prevPrimary?.memberId ?? null;
    }

    await this.prisma.$transaction([
      this.prisma.issueAssignee.upsert({
        where: { issueId_memberId: { issueId, memberId: dto.agentId } },
        create: { issueId, memberId: dto.agentId },
        update: {},
      }),
      ...(prevPrimaryMemberId && prevPrimaryMemberId !== dto.agentId
        ? [
            this.prisma.issueAssignee.delete({
              where: {
                issueId_memberId: {
                  issueId,
                  memberId: prevPrimaryMemberId,
                },
              },
            }),
          ]
        : []),
      this.prisma.issue.update({
        where: { id: issueId },
        data: {
          assigneeType: 'ai_agent',
          aiAgentId: dto.agentId,
          assigneeId: member.userId ?? null,
        },
      }),
    ]);

    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'assigned',
      summary: `Assigned AI agent "${member.displayName}"`,
      source: 'user',
      changes: [
        { field: 'aiAgentId', oldValue: task.aiAgentId, newValue: dto.agentId },
      ],
      metadata: { assigneeType: 'ai_agent' },
    });

    this.messageBus.publish('task.agent.assigned', {
      projectId: task.projectId,
      issueId,
      agentId: dto.agentId,
      userId,
    });

    return this.findOne(issueId, userId);
  }

  async getExecutions(issueId: string, userId: string) {
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${issueId} not found`);
    }

    await this.ensureProjectMember(task.projectId, userId);

    return this.prisma.execution.findMany({
      where: { issueId },
      orderBy: { createdAt: 'desc' },
      include: {
        approvals: {
          orderBy: { requestedAt: 'desc' },
        },
      },
    });
  }

  async createExecution(
    issueId: string,
    dto: CreateIssueExecutionDto,
    userId: string,
  ) {
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        id: true,
        projectId: true,
        title: true,
        aiAgentId: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${issueId} not found`);
    }

    await this.ensureProjectMember(task.projectId, userId);

    // 4d: subjectType=human 走统一执行项创建（人工执行，初始 draft，走验收门禁）
    if (dto.subjectType === 'human') {
      if (!dto.title || !dto.subjectId) {
        throw new BadRequestException(
          '人工执行项需要 title 与 subjectId（Member.id）',
        );
      }
      return this.executionService.createIssueExecution(issueId, {
        title: dto.title,
        description: dto.description,
        subjectType: 'human',
        subjectId: dto.subjectId,
        estimate: dto.estimate,
        order: dto.order,
        collaborators: dto.collaborators,
        createdBy: userId,
      });
    }

    if (!task.aiAgentId) {
      throw new BadRequestException(
        'Task must have an assigned AI agent before creating an execution',
      );
    }

    const member = await this.ensureAssignableAgent(task.aiAgentId);
    const contextPack =
      dto.contextPack ?? (await this.buildTaskExecutionContext(issueId));
    const requiresApproval = dto.requiresApproval ?? true;
    const actionType = dto.actionType || 'task.write';

    const execution = await this.prisma.execution.create({
      data: {
        projectId: task.projectId!,
        issueId,
        subjectType: 'platform_ai_member',
        subjectId: task.aiAgentId!,
        identitySource: 'internal',
        role: member.defaultExecutionRole ?? 'general',
        goal: dto.goal || `执行任务「${task.title}」的 AI 计划`,
        status: requiresApproval ? 'pending_approval' : 'in_progress',
        input: this.toJsonValue(dto.input ?? {}),
        output: this.toJsonValue({
          plan: dto.plan ?? {
            expectedOutput: '输出结构化任务执行计划与回写建议',
            tools: ['task.read', 'task.write'],
          },
          contextPack,
          requiresApproval,
          requestedBy: userId,
          actorType: member.type,
        }),
        metadata: this.toJsonValue({
          source: 'task.execution',
        }),
      },
      include: {
        approvals: true,
      },
    });

    let approvalRequest = null;

    if (requiresApproval) {
      approvalRequest = await this.prisma.approvalRequest.create({
        data: {
          executionRunId: execution.id,
          projectId: task.projectId!,
          issueId,
          actionType,
          riskLevel: 'write',
          requestedAction: `执行任务「${task.title}」的 AI 操作`,
          reason:
            dto.approvalReason || 'AI 任务执行包含写操作，等待人工确认后继续',
          metadata: this.toJsonValue({
            requestedBy: userId,
            goal: dto.goal,
            input: dto.input,
            plan: dto.plan,
          }),
        },
      });
    }

    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'ai_execution',
      summary: `Created AI execution run for "${member.displayName}"`,
      source: 'ai',
      metadata: {
        executionRunId: execution.id,
        requiresApproval,
        actionType,
      },
    });

    this.messageBus.publish('task.execution.created', {
      projectId: task.projectId,
      issueId,
      executionRunId: execution.id,
      approvalRequestId: approvalRequest?.id,
      userId,
    });

    return {
      execution: await this.prisma.execution.findUnique({
        where: { id: execution.id },
        include: {
          approvals: true,
        },
      }),
      approvalRequest,
      contextPack,
    };
  }

  async confirmExecution(
    issueId: string,
    executionId: string,
    dto: ConfirmIssueExecutionDto,
    userId: string,
  ) {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        approvals: {
          where: { status: 'pending' },
          orderBy: { requestedAt: 'desc' },
        },
      },
    });

    if (!execution || execution.issueId !== issueId) {
      throw new NotFoundException(
        `Execution ${executionId} not found for task ${issueId}`,
      );
    }

    if (!execution.projectId) {
      throw new BadRequestException('Execution is missing project scope');
    }

    await this.ensureProjectApprover(execution.projectId, userId);

    const pendingApproval = execution.approvals[0];
    if (!pendingApproval) {
      throw new BadRequestException(
        'Execution has no pending approval request',
      );
    }

    const approvalStatus =
      dto.decision === 'approved' ? 'approved' : 'rejected';
    const executionStatus =
      dto.decision === 'approved' ? 'approved' : 'rejected';

    const [approvalRequest] = await this.prisma.$transaction([
      this.prisma.approvalRequest.update({
        where: { id: pendingApproval.id },
        data: {
          status: approvalStatus,
          approvedBy: dto.decision === 'approved' ? userId : null,
          rejectedBy: dto.decision === 'rejected' ? userId : null,
          resolvedAt: new Date(),
          resolutionNote: dto.comment ?? null,
        },
      }),
      this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: executionStatus,
          output:
            dto.decision === 'approved'
              ? this.toJsonValue({
                  approval: 'granted',
                  comment: dto.comment || null,
                })
              : undefined,
          errorDetail:
            dto.decision === 'rejected'
              ? { message: dto.comment || 'Execution rejected by reviewer' }
              : Prisma.JsonNull,
        },
      }),
    ]);

    await this.recordTaskActivity(
      { id: issueId, projectId: execution.projectId },
      {
        actorId: userId,
        type: 'ai_execution',
        summary:
          dto.decision === 'approved'
            ? 'Approved AI execution request'
            : 'Rejected AI execution request',
        source: 'user',
        metadata: {
          executionRunId: executionId,
          approvalRequestId: pendingApproval.id,
          decision: dto.decision,
          comment: dto.comment || null,
        },
      },
    );

    this.messageBus.publish('task.execution.confirmed', {
      projectId: execution.projectId,
      issueId,
      executionRunId: executionId,
      approvalRequestId: pendingApproval.id,
      decision: dto.decision,
      userId,
    });

    return {
      execution: await this.prisma.execution.findUnique({
        where: { id: executionId },
        include: {
          approvals: true,
        },
      }),
      approvalRequest,
    };
  }

  async addDependency(
    issueId: string,
    dto: CreateIssueDependencyDto,
    userId: string,
  ) {
    if (dto.dependsOnIssueId === issueId) {
      throw new BadRequestException('Task cannot depend on itself');
    }

    // Ensure user has access to the base task
    const task = await this.prisma.issue.findFirst({
      where: {
        id: issueId,
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${issueId} not found`);
    }

    // Ensure dependency task exists in same project
    const dependsOnIssue = await this.prisma.issue.findFirst({
      where: {
        id: dto.dependsOnIssueId,
        projectId: task.projectId,
      },
    });

    if (!dependsOnIssue) {
      throw new NotFoundException(
        `Dependency task ${dto.dependsOnIssueId} not found in project`,
      );
    }

    // Avoid duplicate dependencies
    const existing = await this.prisma.issueDependency.findFirst({
      where: {
        issueId,
        dependsOnIssueId: dto.dependsOnIssueId,
      },
    });

    if (existing) {
      return existing;
    }

    const type: 'blocks' | 'relates' = dto.type || 'blocks';

    const dependency = await this.prisma.issueDependency.create({
      data: {
        projectId: task.projectId,
        issueId,
        dependsOnIssueId: dto.dependsOnIssueId,
        type,
      },
    });

    // Activity record
    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'field_changed',
      summary: `Added dependency on "${dependsOnIssue.title}"`,
      source: 'user',
      changes: [{ field: 'dependencies', newValue: dependsOnIssue.id }],
      metadata: {
        action: 'add',
        dependencyId: dependency.id,
        dependsOnIssueId: dependsOnIssue.id,
        dependsOnTaskTitle: dependsOnIssue.title,
      },
    });

    // Event
    this.messageBus.publish('task.dependency.created', {
      projectId: task.projectId,
      issueId,
      dependsOnIssueId: dependsOnIssue.id,
      type,
      userId,
    });

    return dependency;
  }

  async removeDependency(
    issueId: string,
    dependencyId: string,
    userId: string,
  ) {
    const dependency = await this.prisma.issueDependency.findUnique({
      where: { id: dependencyId },
      include: {
        issue: true,
        dependsOnIssue: true,
      },
    });

    if (!dependency || dependency.issueId !== issueId) {
      throw new NotFoundException(
        `Dependency ${dependencyId} not found for task ${issueId}`,
      );
    }

    // Ensure user has access to the project
    if (dependency.projectId) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: dependency.projectId,
            userId,
          },
        },
      });

      if (!member) {
        throw new ForbiddenException('Insufficient permissions');
      }
    } else {
      // 无项目关联的依赖, 仅允许 reporter 操作
      const task = await this.prisma.issue.findUnique({
        where: { id: issueId },
        select: { reporterId: true },
      });
      if (!task || task.reporterId !== userId) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    await this.prisma.issueDependency.delete({
      where: { id: dependencyId },
    });

    await this.recordTaskActivity(
      { id: issueId, projectId: dependency.projectId },
      {
        actorId: userId,
        type: 'field_changed',
        summary: `Removed dependency on "${dependency.dependsOnIssue.title}"`,
        source: 'user',
        changes: [
          { field: 'dependencies', oldValue: dependency.dependsOnIssueId },
        ],
        metadata: {
          action: 'remove',
          dependencyId,
          dependsOnIssueId: dependency.dependsOnIssueId,
          dependsOnTaskTitle: dependency.dependsOnIssue.title,
        },
      },
    );

    this.messageBus.publish('task.dependency.deleted', {
      projectId: dependency.projectId,
      issueId,
      dependsOnIssueId: dependency.dependsOnIssueId,
      type: dependency.type,
      userId,
    });
  }

  async getActivities(issueId: string, userId: string) {
    const task = await this.prisma.issue.findFirst({
      where: {
        id: issueId,
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${issueId} not found`);
    }

    return this.prisma.issueActivity.findMany({
      where: { issueId },
      orderBy: { timestamp: 'desc' },
      include: {
        // Note: actorId references User, but we don't have a relation defined
        // For now, we'll just return the actorId
      },
    });
  }

  async importTasks(tasks: any[], userId: string) {
    if (!tasks || tasks.length === 0) {
      throw new BadRequestException('No tasks to import');
    }

    // Use the first task's projectId (all tasks should be in the same project)
    const projectId = tasks[0].projectId;
    if (!projectId) {
      throw new BadRequestException('projectId is required for import');
    }

    // Verify project exists and user has access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Get default status
    let defaultStatus = await this.prisma.statusDefinition.findFirst({
      where: { type: 'task', projectId },
      orderBy: { order: 'asc' },
    });

    if (!defaultStatus) {
      defaultStatus = await this.prisma.statusDefinition.findFirst({
        where: { type: 'task', projectId: null },
        orderBy: { order: 'asc' },
      });
    }

    const status = defaultStatus?.key || 'todo';

    // Create tasks
    const createdTasks = await Promise.all(
      tasks.map((task) =>
        this.prisma.issue.create({
          data: {
            projectId,
            title: task.title,
            description: task.description,
            status: task.status || status,
            priority: task.priority || 'medium',
            assigneeId: task.assigneeId,
            reporterId: task.reporterId || userId,
            iterationId: task.iterationId,
            startDate: task.startDate ? new Date(task.startDate) : null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            estimate: task.estimate,
          },
        }),
      ),
    );

    return {
      imported: createdTasks.length,
      tasks: createdTasks,
    };
  }

  async exportTasks(projectId: string, userId: string, format: string) {
    // Verify project exists and user has access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const tasks = await this.prisma.issue.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, username: true, displayName: true },
        },
        reporter: {
          select: { id: true, username: true, displayName: true },
        },
        issueTags: {
          include: { tag: true },
        },
      },
    });

    if (format === 'json') {
      return tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        assigneeName: task.assignee?.displayName || task.assignee?.username,
        reporterId: task.reporterId,
        reporterName: task.reporter?.displayName || task.reporter?.username,
        iterationId: task.iterationId,
        startDate: task.startDate,
        dueDate: task.dueDate,
        estimate: task.estimate,
        tags: task.issueTags.map((tt) => tt.tag.name),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));
    }

    return tasks;
  }

  convertToCSV(tasks: any[]): string {
    const headers = [
      'id',
      'title',
      'description',
      'status',
      'priority',
      'assigneeId',
      'assigneeName',
      'reporterId',
      'reporterName',
      'iterationId',
      'startDate',
      'dueDate',
      'estimate',
      'tags',
      'createdAt',
      'updatedAt',
    ];

    const rows = tasks.map((task) => [
      task.id,
      `"${(task.title || '').replace(/"/g, '""')}"`,
      `"${(task.description || '').replace(/"/g, '""')}"`,
      task.status,
      task.priority,
      task.assigneeId || '',
      task.assignee?.displayName || task.assignee?.username || '',
      task.reporterId || '',
      task.reporter?.displayName || task.reporter?.username || '',
      task.iterationId || '',
      task.startDate
        ? new Date(task.startDate).toISOString().split('T')[0]
        : '',
      task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      task.estimate || '',
      (task.issueTags || []).map((tt: any) => tt.tag.name).join(', '),
      task.createdAt ? new Date(task.createdAt).toISOString() : '',
      task.updatedAt ? new Date(task.updatedAt).toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
