import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import { CreateAcceptanceDto, UpdateAcceptanceDto } from './dto/acceptance.dto';

@Injectable()
export class AcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executionService: ExecutionService,
  ) {}

  /**
   * 创建验收契约
   */
  async create(dto: CreateAcceptanceDto, userId?: string) {
    // 验证 Task 存在
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task ${dto.taskId} not found`);
    }

    const projectId = task.projectId;
    if (!projectId) {
      throw new BadRequestException('Task must be associated with a project');
    }

    // 创建 Acceptance
    const acceptance = await this.prisma.acceptance.create({
      data: {
        taskId: dto.taskId,
        type: dto.type || 'mixed',
        priority: dto.priority || 'medium',
        title: dto.title || `验收 - ${task.title}`,
        description: dto.description,
        createdBy: userId,
        status: 'draft',
      },
      include: {
        task: {
          select: { id: true, title: true },
        },
        criteria: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // 如果提供了验收标准，一并创建
    if (dto.criteria && dto.criteria.length > 0) {
      await this.prisma.acceptanceCriteria.createMany({
        data: dto.criteria.map((c, index) => ({
          acceptanceId: acceptance.id,
          criteriaType: c.criteriaType,
          category: c.category,
          content: c.content,
          source: c.source || 'manual',
          weight: c.weight || 1,
          severity: c.severity || 'medium',
          order: c.order ?? index,
        })),
      });
    }

    // 如果需要自动创建 ExecutionRun
    if (dto.autoCreateExecution) {
      await this.executionService.createExecutionRun({
        projectId,
        taskId: dto.taskId,
        subjectType: 'human',
        subjectId: userId || 'system',
        identitySource: 'api',
        goal: `Acceptance: ${acceptance.title}`,
        createdBy: userId,
        // V3: 建立与 Acceptance 的关联
        acceptanceId: acceptance.id,
      });
    }

    // 重新查询以包含所有关系
    return this.findOne(acceptance.id);
  }

  /**
   * 获取单个验收契约
   */
  async findOne(id: string) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id },
      include: {
        task: {
          select: { id: true, title: true, status: true },
        },
        criteria: {
          orderBy: { order: 'asc' },
          include: {
            evidences: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            totalCost: true,
            totalTokens: true,
            createdAt: true,
            completedAt: true,
          },
        },
        auditReport: {
          include: {
            checklist: {
              select: { id: true, name: true, techStack: true },
            },
          },
        },
      },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${id} not found`);
    }

    return acceptance;
  }

  /**
   * 查询验收契约列表
   */
  async findAll(params: {
    taskId?: string;
    projectId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { taskId, projectId, status, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (taskId) where.taskId = taskId;
    if (status) where.status = status;

    if (projectId) {
      where.task = { projectId };
    }

    const [data, total] = await Promise.all([
      this.prisma.acceptance.findMany({
        where,
        include: {
          task: {
            select: { id: true, title: true, projectId: true },
          },
          _count: {
            select: { criteria: true, executions: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.acceptance.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 更新验收契约
   */
  async update(id: string, dto: UpdateAcceptanceDto) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${id} not found`);
    }

    // 如果要完成验收
    if (dto.status === 'passed' || dto.status === 'failed') {
      dto as any; // 允许额外字段
      const updateData: any = { ...dto };
      updateData.completedAt = new Date();
      return this.prisma.acceptance.update({
        where: { id },
        data: updateData,
      });
    }

    return this.prisma.acceptance.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除验收契约
   */
  async delete(id: string) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${id} not found`);
    }

    await this.prisma.acceptance.delete({
      where: { id },
    });
  }

  /**
   * 获取任务的所有验收契约
   */
  async findByTask(taskId: string) {
    return this.prisma.acceptance.findMany({
      where: { taskId },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        auditReport: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 汇总验收成本
   */
  async rollupCost(acceptanceId: string) {
    const executions = await this.prisma.executionRun.findMany({
      where: { acceptanceId },
      select: {
        totalCost: true,
        totalTokens: true,
      },
    });

    const totalCost = executions.reduce(
      (sum, e) => sum + (e.totalCost || 0),
      0,
    );
    const totalTokens = executions.reduce(
      (sum, e) => sum + (e.totalTokens || 0),
      0,
    );

    return this.prisma.acceptance.update({
      where: { id: acceptanceId },
      data: { totalCost, totalTokens },
    });
  }
}
