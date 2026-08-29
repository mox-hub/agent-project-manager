import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { Prisma } from '@prisma/client';
import { inferCompletionType } from '@/modules/cli-dispatch/adapters/test-report.schema';

export interface CreateExecutionRunDto {
  projectId: string;
  taskId?: string;
  subjectType: 'human' | 'platform_ai_member' | 'external_agent';
  subjectId: string;
  identitySource: 'internal' | 'mcp' | 'cli' | 'api' | 'plugin';
  goal: string;
  role?: string;
  level?: string;
  input?: Record<string, unknown>;
  contextSnapshotId?: string;
  createdBy?: string;
  // V3: 扩展字段
  metadata?: Record<string, unknown>;
  acceptanceId?: string;
}

export interface UpdateExecutionRunDto {
  status?: string;
  output?: Record<string, unknown>;
  errorDetail?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  terminatedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface AddExecutionStepDto {
  stepType: string;
  sequence: number;
  name?: string;
  input?: Record<string, unknown>;
  status?: string;
}

@Injectable()
export class ExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly messageBus: MessageBusService,
  ) {
    this.logger.setContext('ExecutionService');
  }

  async createExecutionRun(dto: CreateExecutionRunDto) {
    // V3: 派发自动关联验收契约——未显式传入 acceptanceId 时，取任务活契约，无则创建
    let acceptanceId = dto.acceptanceId ?? null;
    if (dto.taskId && !acceptanceId) {
      acceptanceId = await this.ensureActiveAcceptance(
        dto.taskId,
        dto.createdBy,
      );
    }

    const run = await this.prisma.executionRun.create({
      data: {
        projectId: dto.projectId,
        taskId: dto.taskId,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        identitySource: dto.identitySource,
        goal: dto.goal,
        role: dto.role,
        level: dto.level,
        input: dto.input as Prisma.InputJsonValue,
        contextSnapshotId: dto.contextSnapshotId,
        status: 'planned',
        createdBy: dto.createdBy,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        acceptanceId,
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });

    this.logger.log(`ExecutionRun created: ${run.id}`, {
      projectId: dto.projectId,
      taskId: dto.taskId,
      subjectType: dto.subjectType,
    });

    this.messageBus.publish('execution.run.created', {
      executionRunId: run.id,
      projectId: dto.projectId,
      taskId: dto.taskId,
      subjectType: dto.subjectType,
    });

    return run;
  }

  /**
   * 取任务的活契约（status 非终态）；不存在则创建并同步推断 completionType。
   * 直接操作 prisma 以避免与 AcceptanceService 的循环依赖。
   */
  private async ensureActiveAcceptance(
    taskId: string,
    createdBy?: string,
  ): Promise<string | null> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        type: true,
        taskTags: { include: { tag: { select: { name: true } } } },
      },
    });
    if (!task) return null; // 任务不存在的报错由上层调用方负责

    const active = await this.prisma.acceptance.findFirst({
      where: { taskId, status: { notIn: ['passed', 'failed', 'waived'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (active) return active.id;

    const completionType = inferCompletionType({
      type: task.type,
      tags: task.taskTags.map((tt) => tt.tag.name),
    });

    const created = await this.prisma.acceptance.create({
      data: {
        taskId,
        title: `验收 - ${task.title}`,
        status: 'draft',
        completionType,
        createdBy,
      },
      select: { id: true },
    });
    this.logger.log(
      `Auto-created acceptance ${created.id} for task ${taskId} (completionType=${completionType})`,
    );
    return created.id;
  }

  async getExecutionRun(id: string, userId: string) {
    const run = await this.prisma.executionRun.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, members: true } },
        task: { select: { id: true, title: true } },
        steps: { orderBy: { sequence: 'asc' } },
        artifacts: true,
        approvals: { orderBy: { requestedAt: 'desc' } },
        context: true,
      },
    });

    if (!run) {
      throw new NotFoundException('ExecutionRun not found');
    }

    const isMember = run.project.members.some((m) => m.userId === userId);
    const isCreator = run.createdBy === userId;

    if (!isMember && !isCreator) {
      throw new ForbiddenException('Access denied');
    }

    return run;
  }

  async listExecutionRuns(
    projectId: string,
    params: {
      taskId?: string;
      subjectType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.ExecutionRunWhereInput = { projectId };
    if (params.taskId) where.taskId = params.taskId;
    if (params.subjectType) where.subjectType = params.subjectType;
    if (params.status) where.status = params.status;

    const limit = Number(params.limit ?? 20);
    const offset = Number(params.offset ?? 0);

    const [runs, total] = await Promise.all([
      this.prisma.executionRun.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.executionRun.count({ where }),
    ]);

    return { runs, total };
  }

  async updateExecutionRun(id: string, dto: UpdateExecutionRunDto) {
    const run = await this.prisma.executionRun.findUnique({ where: { id } });
    if (!run) {
      throw new NotFoundException('ExecutionRun not found');
    }

    const previousStatus = run.status;
    const updated = await this.prisma.executionRun.update({
      where: { id },
      data: {
        status: dto.status ?? undefined,
        output: dto.output as Prisma.InputJsonValue | undefined,
        errorDetail: dto.errorDetail as Prisma.InputJsonValue | undefined,
        startedAt: dto.startedAt,
        completedAt: dto.completedAt,
        terminatedAt: dto.terminatedAt,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    this.logger.log(
      `ExecutionRun ${id} status: ${previousStatus} -> ${dto.status}`,
    );

    this.messageBus.publish('execution.run.updated', {
      executionRunId: id,
      previousStatus,
      newStatus: dto.status,
    });

    return updated;
  }

  async startExecution(id: string) {
    return this.updateExecutionRun(id, {
      status: 'in_progress',
      startedAt: new Date(),
    });
  }

  async completeExecution(
    id: string,
    output: Record<string, unknown>,
    artifacts?: Array<{
      artifactType: string;
      name: string;
      content?: string;
      storageRef?: string;
    }>,
  ) {
    const run = await this.updateExecutionRun(id, {
      status: 'completed',
      output,
      completedAt: new Date(),
    });

    if (artifacts?.length) {
      await this.prisma.executionArtifact.createMany({
        data: artifacts.map((a) => ({
          executionRunId: id,
          artifactType: a.artifactType,
          name: a.name,
          content: a.content,
          storageRef: a.storageRef,
        })),
      });
    }

    // V3: 成本归因 - 汇总 AIUsageLog 成本到 ExecutionRun
    await this.rollupCost(id);

    return run;
  }

  /**
   * V3: 汇总 ExecutionRun 的成本
   * 从 AIUsageLog 汇总 token 和 cost 到 ExecutionRun
   */
  async rollupCost(executionRunId: string) {
    const usageLogs = await this.prisma.aIUsageLog.findMany({
      where: { executionRunId },
    });

    if (usageLogs.length === 0) {
      return;
    }

    const totalTokens = usageLogs.reduce(
      (sum, log) => sum + log.totalTokens,
      0,
    );
    const totalCost = usageLogs.reduce(
      (sum, log) => sum + (log.estimatedCost || 0),
      0,
    );

    // 按模型分组
    const byModel: Record<string, { tokens: number; cost: number }> = {};
    for (const log of usageLogs) {
      if (!byModel[log.modelName]) {
        byModel[log.modelName] = { tokens: 0, cost: 0 };
      }
      byModel[log.modelName].tokens += log.totalTokens;
      byModel[log.modelName].cost += log.estimatedCost || 0;
    }

    await this.prisma.executionRun.update({
      where: { id: executionRunId },
      data: {
        totalTokens,
        totalCost,
        costBreakdown: { byModel } as Prisma.InputJsonValue,
      },
    });

    // Roll-up 到 Acceptance
    const run = await this.prisma.executionRun.findUnique({
      where: { id: executionRunId },
      select: { acceptanceId: true },
    });

    if (run?.acceptanceId) {
      await this.rollupAcceptanceCost(run.acceptanceId);
    }
  }

  /**
   * V3: 汇总 Acceptance 的成本
   * 从多个 ExecutionRun 汇总成本到 Acceptance
   */
  private async rollupAcceptanceCost(acceptanceId: string) {
    const executions = await this.prisma.executionRun.findMany({
      where: { acceptanceId },
      select: { totalCost: true, totalTokens: true },
    });

    const totalCost = executions.reduce(
      (sum, run) => sum + (run.totalCost || 0),
      0,
    );
    const totalTokens = executions.reduce(
      (sum, run) => sum + (run.totalTokens || 0),
      0,
    );

    await this.prisma.acceptance.update({
      where: { id: acceptanceId },
      data: { totalCost, totalTokens },
    });
  }

  async failExecution(id: string, errorDetail: Record<string, unknown>) {
    return this.updateExecutionRun(id, {
      status: 'failed',
      errorDetail,
      completedAt: new Date(),
    });
  }

  async addExecutionStep(executionRunId: string, dto: AddExecutionStepDto) {
    const step = await this.prisma.executionStep.create({
      data: {
        executionRunId,
        stepType: dto.stepType,
        sequence: dto.sequence,
        name: dto.name,
        input: dto.input as Prisma.InputJsonValue,
        status: dto.status ?? 'pending',
      },
    });

    this.messageBus.publish('execution.step.created', {
      executionRunId,
      stepId: step.id,
      sequence: dto.sequence,
    });

    return step;
  }

  async updateStepStatus(
    stepId: string,
    status: string,
    output?: Record<string, unknown>,
  ) {
    const step = await this.prisma.executionStep.update({
      where: { id: stepId },
      data: {
        status,
        output: output as Prisma.InputJsonValue,
        startedAt: status === 'running' ? new Date() : undefined,
        completedAt: ['completed', 'failed', 'skipped'].includes(status)
          ? new Date()
          : undefined,
      },
    });

    this.messageBus.publish('execution.step.updated', {
      stepId,
      status,
      executionRunId: step.executionRunId,
    });

    return step;
  }

  async getExecutionArtifacts(executionRunId: string) {
    return this.prisma.executionArtifact.findMany({
      where: { executionRunId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createArtifact(
    executionRunId: string,
    data: {
      stepId?: string;
      artifactType: string;
      name: string;
      content?: string;
      storageRef?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.prisma.executionArtifact.create({
      data: {
        executionRunId,
        stepId: data.stepId,
        artifactType: data.artifactType,
        name: data.name,
        content: data.content,
        storageRef: data.storageRef,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async getActiveExecutions(projectId: string) {
    return this.prisma.executionRun.findMany({
      where: {
        projectId,
        status: { in: ['planned', 'in_progress', 'pending_approval'] },
      },
      include: {
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelExecution(id: string, reason?: string) {
    return this.updateExecutionRun(id, {
      status: 'blocked',
      terminatedAt: new Date(),
      metadata: { cancellationReason: reason },
    });
  }
}
