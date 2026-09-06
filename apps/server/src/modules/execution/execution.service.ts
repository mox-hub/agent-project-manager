import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ProposalService } from '@/modules/decision/proposal.service';
import { ApprovalService } from './approval.service';
import { Prisma } from '@prisma/client';
import { inferCompletionType } from '@/modules/cli-dispatch/adapters/test-report.schema';

export interface CreateExecutionRunDto {
  projectId: string;
  issueId?: string;
  subjectType: 'human' | 'platform_ai_member' | 'external_agent';
  subjectId: string;
  identitySource: 'internal' | 'mcp' | 'cli' | 'api' | 'plugin';
  goal: string;
  // 执行项独立标题/描述（4d）：缺省回落 goal
  title?: string;
  description?: string;
  role?: string;
  level?: string;
  estimate?: number;
  actualSpent?: number;
  order?: number;
  input?: Record<string, unknown>;
  contextSnapshotId?: string;
  createdBy?: string;
  status?: string; // 缺省 planned；人工执行项入口传 draft
  // V3: 扩展字段
  metadata?: Record<string, unknown>;
  acceptanceId?: string;
}

export interface UpdateExecutionRunDto {
  status?: string;
  output?: Record<string, unknown>;
  input?: Record<string, unknown>;
  errorDetail?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  terminatedAt?: Date;
  title?: string;
  description?: string;
  estimate?: number;
  actualSpent?: number;
  order?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 执行项状态机（4d）：禁止跳步。
 * 人工执行进入 completed 前必须经 pending_approval（提交时自动创建审批单）；
 * AI 执行沿用既有派发审批流（dispatch 时已建审批单）。
 */
const EXECUTION_TRANSITIONS: Record<string, string[]> = {
  draft: ['planned', 'in_progress', 'pending_approval', 'superseded'],
  planned: ['in_progress', 'pending_approval', 'blocked', 'superseded'],
  in_progress: [
    'pending_approval',
    'completed',
    'failed',
    'blocked',
    'superseded',
  ],
  pending_approval: [
    'completed',
    'failed',
    'blocked',
    'in_progress',
    'superseded',
  ],
  blocked: ['in_progress', 'planned', 'failed', 'superseded'],
  failed: ['in_progress', 'pending_approval', 'superseded'],
  completed: [],
  superseded: [],
};

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
    private readonly proposalService: ProposalService,
    private readonly approvalService: ApprovalService,
  ) {
    this.logger.setContext('ExecutionService');
  }

  async createExecutionRun(dto: CreateExecutionRunDto) {
    // V3: 派发自动关联验收契约——未显式传入 acceptanceId 时，取任务活契约，无则创建
    let acceptanceId = dto.acceptanceId ?? null;
    if (dto.issueId && !acceptanceId) {
      acceptanceId = await this.ensureActiveAcceptance(
        dto.issueId,
        dto.createdBy,
      );
    }

    const run = await this.prisma.execution.create({
      data: {
        projectId: dto.projectId,
        issueId: dto.issueId,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        identitySource: dto.identitySource,
        goal: dto.goal,
        title: dto.title ?? dto.goal,
        description: dto.description,
        role: dto.role,
        level: dto.level,
        estimate: dto.estimate,
        actualSpent: dto.actualSpent,
        order: dto.order,
        input: dto.input as Prisma.InputJsonValue,
        contextSnapshotId: dto.contextSnapshotId,
        status: dto.status ?? 'planned',
        createdBy: dto.createdBy,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        acceptanceId,
      },
      include: {
        project: { select: { id: true, name: true } },
        issue: { select: { id: true, title: true } },
      },
    });

    this.logger.log(`ExecutionRun created: ${run.id}`, {
      projectId: dto.projectId,
      issueId: dto.issueId,
      subjectType: dto.subjectType,
    });

    this.messageBus.publish('execution.run.created', {
      executionRunId: run.id,
      projectId: dto.projectId,
      issueId: dto.issueId,
      subjectType: dto.subjectType,
    });

    return run;
  }

  /**
   * 取任务的活契约（status 非终态）；不存在则创建并同步推断 completionType。
   * 直接操作 prisma 以避免与 AcceptanceService 的循环依赖。
   */
  private async ensureActiveAcceptance(
    issueId: string,
    createdBy?: string,
  ): Promise<string | null> {
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        id: true,
        title: true,
        type: true,
        issueTags: { include: { tag: { select: { name: true } } } },
      },
    });
    if (!task) return null; // 任务不存在的报错由上层调用方负责

    const active = await this.prisma.acceptance.findFirst({
      where: { issueId, status: { notIn: ['passed', 'failed', 'waived'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (active) return active.id;

    const completionType = inferCompletionType({
      type: task.type,
      tags: task.issueTags.map((tt) => tt.tag.name),
    });

    const created = await this.prisma.acceptance.create({
      data: {
        issueId,
        title: `验收 - ${task.title}`,
        status: 'draft',
        completionType,
        createdBy,
      },
      select: { id: true },
    });
    this.logger.log(
      `Auto-created acceptance ${created.id} for task ${issueId} (completionType=${completionType})`,
    );
    return created.id;
  }

  async getExecutionRun(id: string, userId: string) {
    const run = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, members: true } },
        issue: { select: { id: true, title: true } },
        steps: { orderBy: { sequence: 'asc' } },
        artifacts: true,
        approvals: { orderBy: { requestedAt: 'desc' } },
        context: true,
        bindings: { orderBy: { createdAt: 'asc' } },
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

    return this.attachSubjectNames([run]).then((rows) => rows[0]);
  }

  /**
   * 运行事件流水（守护进程路径）：SystemEvent 按 category+时间窗查再 JS 侧按 run 过滤
   * （SQLite 无 JSON path 查询）；token 流式事件不落库，天然不在此列。
   */
  async getExecutionRunEvents(id: string, userId: string) {
    const run = await this.getExecutionRun(id, userId); // 复用成员/创建者校验

    const windowEnd = run.completedAt ?? run.terminatedAt;
    const rows = await this.prisma.systemEvent.findMany({
      where: {
        category: 'runtime.execution.event',
        createdAt: {
          gte: run.createdAt,
          ...(windowEnd
            ? { lte: new Date(windowEnd.getTime() + 5 * 60_000) }
            : {}),
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });

    const events = rows
      .filter(
        (row) =>
          (row.context as Record<string, unknown> | null)?.executionRunId ===
            id &&
          // 兼容历史落库的 token 块（现已不落库），避免淹没事件列表
          (row.context as Record<string, unknown>).eventType !==
            'execution.token',
      )
      .slice(-500)
      .map((row) => {
        const ctx = row.context as Record<string, unknown>;
        return {
          id: row.id,
          level: row.level,
          eventType: ctx.eventType as string,
          status: ctx.status as string | undefined,
          summary: ctx.summary as string | undefined,
          stepId: ctx.stepId as string | undefined,
          errorCode: ctx.errorCode as string | undefined,
          timestamp: ctx.timestamp as string | undefined,
          createdAt: row.createdAt,
        };
      });

    return { events };
  }

  /** subjectId 无 Prisma 关系，批量补 Member displayName 供列表/详情展示 */
  private async attachSubjectNames<
    T extends { subjectType: string; subjectId: string },
  >(runs: T[]): Promise<(T & { subjectName: string | null })[]> {
    const memberIds = runs
      .filter((r) => r.subjectType === 'platform_ai_member')
      .map((r) => r.subjectId);
    if (memberIds.length === 0) {
      return runs.map((r) => ({ ...r, subjectName: null }));
    }
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, displayName: true },
    });
    const nameById = new Map(members.map((m) => [m.id, m.displayName]));
    return runs.map((r) => ({
      ...r,
      subjectName: nameById.get(r.subjectId) ?? null,
    }));
  }

  async listExecutionRuns(
    userId: string,
    params: {
      projectId?: string;
      issueId?: string;
      subjectType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.ExecutionWhereInput = {};
    if (params.projectId) {
      where.projectId = params.projectId;
    } else {
      // 缺省跨项目：仅返回用户为成员的项目（与 getExecutionRun 权限模型一致）
      const memberships = await this.prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      where.projectId = { in: memberships.map((m) => m.projectId) };
    }
    if (params.issueId) where.issueId = params.issueId;
    if (params.subjectType) where.subjectType = params.subjectType;
    if (params.status) where.status = params.status;

    const limit = Number(params.limit ?? 20);
    const offset = Number(params.offset ?? 0);

    const [runs, total] = await Promise.all([
      this.prisma.execution.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          issue: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.execution.count({ where }),
    ]);

    return { runs: await this.attachSubjectNames(runs), total };
  }

  async updateExecutionRun(id: string, dto: UpdateExecutionRunDto) {
    const run = await this.prisma.execution.findUnique({ where: { id } });
    if (!run) {
      throw new NotFoundException('ExecutionRun not found');
    }

    // 状态机校验：禁止跳步
    if (dto.status && dto.status !== run.status) {
      const allowed = EXECUTION_TRANSITIONS[run.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `执行项状态不允许从 ${run.status} 流转到 ${dto.status}（允许：${allowed.join(', ') || '无'}）`,
        );
      }

      // 人工执行门禁：进入 completed 必须先经 pending_approval 审批
      if (
        dto.status === 'completed' &&
        run.subjectType === 'human' &&
        run.status !== 'pending_approval'
      ) {
        throw new BadRequestException(
          '人工执行需先提交验收审批（status → pending_approval），通过后方可完成',
        );
      }
    }

    // 人工执行提交验收：进入 pending_approval 时自动创建审批单（幂等：已有待审单则跳过）
    if (dto.status === 'pending_approval' && run.subjectType === 'human') {
      const pending = await this.prisma.approvalRequest.findFirst({
        where: { executionRunId: id, status: 'pending' },
        select: { id: true },
      });
      if (!pending) {
        await this.approvalService.createApprovalRequest(
          {
            executionRunId: id,
            projectId: run.projectId,
            issueId: run.issueId ?? undefined,
            requestedAction: run.title ?? run.goal,
            actionType: 'execution_completion',
            riskLevel: 'medium',
            reason: '人工执行提交验收',
          },
          run.createdBy ?? undefined,
        );
      }
    }

    const previousStatus = run.status;
    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        status: dto.status ?? undefined,
        output: dto.output as Prisma.InputJsonValue | undefined,
        input: dto.input as Prisma.InputJsonValue | undefined,
        errorDetail: dto.errorDetail as Prisma.InputJsonValue | undefined,
        startedAt: dto.startedAt,
        completedAt: dto.completedAt,
        terminatedAt: dto.terminatedAt,
        title: dto.title,
        description: dto.description,
        estimate: dto.estimate,
        actualSpent: dto.actualSpent,
        order: dto.order,
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

    // 旁路触发项目周花费阈值检查（内部自捕获异常，不阻断完成主流程）
    if (run?.projectId) {
      void this.proposalService.checkSpendOnRunComplete(run.projectId);
    }

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

    await this.prisma.execution.update({
      where: { id: executionRunId },
      data: {
        totalTokens,
        totalCost,
        costBreakdown: { byModel } as Prisma.InputJsonValue,
      },
    });

    // Roll-up 到 Acceptance
    const run = await this.prisma.execution.findUnique({
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
    const executions = await this.prisma.execution.findMany({
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
    return this.prisma.execution.findMany({
      where: {
        projectId,
        status: { in: ['planned', 'in_progress', 'pending_approval'] },
      },
      include: {
        issue: { select: { id: true, title: true } },
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

  /**
   * 4d：issue 维度执行项列表（按 order 升序）。
   */
  async listIssueExecutions(issueId: string) {
    return this.prisma.execution.findMany({
      where: { issueId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        issue: { select: { id: true, title: true } },
        approvals: { where: { status: 'pending' }, select: { id: true } },
      },
    });
  }

  /**
   * 4d：在 issue 下创建执行项（人工/AI 统一入口）。
   * - subjectType=human：subjectId 为 Member.id（V3 身份口径），初始 draft；
   *   多人协作以 metadata.collaborators 留档，不建关系表。
   * - subjectType=platform_ai_member：初始 planned，走既有派发审批流。
   * - 绑定 issue 时自动挂接活验收契约（ensureActiveAcceptance）。
   */
  async createIssueExecution(
    issueId: string,
    dto: {
      title: string;
      description?: string;
      subjectType: 'human' | 'platform_ai_member';
      subjectId: string;
      estimate?: number;
      order?: number;
      collaborators?: string[];
      createdBy?: string;
    },
  ) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true, projectId: true },
    });
    if (!issue) {
      throw new NotFoundException(`Issue ${issueId} not found`);
    }
    if (!issue.projectId) {
      throw new BadRequestException('无项目任务暂不支持创建执行项');
    }
    if (dto.subjectType === 'human') {
      const binding = await this.prisma.memberProjectBinding.findFirst({
        where: { memberId: dto.subjectId, projectId: issue.projectId },
        select: { id: true },
      });
      if (!binding) {
        throw new BadRequestException(
          '执行人必须是该项目成员（MemberProjectBinding）',
        );
      }
    }

    return this.createExecutionRun({
      projectId: issue.projectId,
      issueId,
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      identitySource: 'internal',
      goal: dto.title,
      title: dto.title,
      description: dto.description,
      estimate: dto.estimate,
      order: dto.order,
      createdBy: dto.createdBy,
      status: dto.subjectType === 'human' ? 'draft' : 'planned',
      metadata: dto.collaborators?.length
        ? { collaborators: dto.collaborators }
        : undefined,
    });
  }
}
