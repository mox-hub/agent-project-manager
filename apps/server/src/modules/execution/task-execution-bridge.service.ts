import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ExecutionService } from './execution.service';

/**
 * TaskExecutionBridge - v1/v2 双写兼容层
 *
 * 职责：
 * 1. Task 创建时自动创建 ExecutionRun（v2）
 * 2. Task.aiExecutionStatus 变更时同步 ExecutionRun.status
 * 3. ExecutionRun 状态变更时回写 Task.aiExecutionStatus
 * 4. 提供统一的任务执行视图
 */
@Injectable()
export class TaskExecutionBridge {
  private readonly context = 'TaskExecutionBridge';

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly executionService: ExecutionService,
  ) {}

  /**
   * 创建任务时，同时创建 ExecutionRun
   */
  async onTaskCreated(taskId: string, projectId: string, userId?: string) {
    try {
      const execution = await this.executionService.createExecutionRun({
        projectId,
        taskId,
        subjectType: 'human',
        subjectId: userId ?? 'system',
        identitySource: 'api',
        goal: `Task execution: ${taskId}`,
        createdBy: userId,
      });

      // 回写 Task.aiExecutionSpec
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          aiExecutionSpec: {
            executionRunId: execution.id,
            createdAt: new Date().toISOString(),
          } as any,
        },
      });

      return execution;
    } catch (error) {
      console.error(
        `[${this.context}] Failed to create ExecutionRun for Task ${taskId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * ExecutionRun 状态变更时，同步更新 Task.aiExecutionStatus
   */
  async syncExecutionStatusToTask(executionRunId: string) {
    try {
      const run = await this.prisma.executionRun.findUnique({
        where: { id: executionRunId },
        select: { taskId: true, status: true },
      });

      if (!run?.taskId) return;

      // Map v2 status to v1 status
      const v1Status = this.mapV2StatusToV1(run.status);

      await this.prisma.task.update({
        where: { id: run.taskId },
        data: { aiExecutionStatus: v1Status },
      });
    } catch (error) {
      console.error(
        `[${this.context}] Failed to sync status for ExecutionRun ${executionRunId}:`,
        error,
      );
    }
  }

  /**
   * Task.aiExecutionStatus 变更时，同步更新 ExecutionRun
   */
  async syncTaskStatusToExecution(taskId: string, newStatus: string) {
    try {
      const run = await this.prisma.executionRun.findFirst({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
      });

      if (!run) return;

      // Map v1 status to v2 status
      const v2Status = this.mapV1StatusToV2(newStatus);

      if (v2Status && v2Status !== run.status) {
        await this.executionService.updateExecutionRun(run.id, {
          status: v2Status,
        });
      }
    } catch (error) {
      console.error(
        `[${this.context}] Failed to sync Task ${taskId} status to ExecutionRun:`,
        error,
      );
    }
  }

  /**
   * 获取任务的完整执行视图（合并 v1 + v2）
   */
  async getTaskExecutionView(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        aiExecutionStatus: true,
        aiExecutionSpec: true,
        aiExecutionResult: true,
      },
    });

    if (!task) return null;

    let executionRun = null;
    const spec = task.aiExecutionSpec as any;
    if (spec?.executionRunId) {
      executionRun = await this.prisma.executionRun.findUnique({
        where: { id: spec.executionRunId },
        include: {
          steps: { orderBy: { sequence: 'asc' } },
          artifacts: true,
          approvals: { orderBy: { requestedAt: 'desc' } },
        },
      });
    }

    return {
      task: {
        id: task.id,
        title: task.title,
        aiExecutionStatus: task.aiExecutionStatus,
      },
      executionRun,
      unifiedStatus: this.getUnifiedStatus(
        task.aiExecutionStatus,
        executionRun?.status,
      ),
    };
  }

  /**
   * 将 Task.aiExecutionResult 与 ExecutionRun.output 合并
   */
  async mergeExecutionResults(
    taskId: string,
    additionalResult?: Record<string, unknown>,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { aiExecutionResult: true },
    });

    const run = await this.prisma.executionRun.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      select: { output: true },
    });

    const mergedResult = {
      v1: task?.aiExecutionResult ?? {},
      v2: run?.output ?? {},
      ...additionalResult,
      mergedAt: new Date().toISOString(),
    };

    await this.prisma.task.update({
      where: { id: taskId },
      data: { aiExecutionResult: mergedResult as any },
    });

    return mergedResult;
  }

  /**
   * 检查任务是否正在执行中
   */
  async isTaskExecuting(taskId: string): Promise<boolean> {
    const run = await this.prisma.executionRun.findFirst({
      where: {
        taskId,
        status: { in: ['planned', 'in_progress', 'pending_approval'] },
      },
    });
    return !!run;
  }

  /**
   * 获取任务当前执行的 ExecutionRun
   */
  async getActiveExecution(taskId: string) {
    return this.prisma.executionRun.findFirst({
      where: {
        taskId,
        status: { in: ['planned', 'in_progress', 'pending_approval'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        steps: { orderBy: { sequence: 'asc' } },
        approvals: { orderBy: { requestedAt: 'desc' } },
      },
    });
  }

  // ==================== 状态映射 ====================

  private mapV2StatusToV1(v2Status: string): string {
    const mapping: Record<string, string> = {
      draft: 'pending',
      planned: 'pending',
      in_progress: 'running',
      pending_approval: 'running',
      completed: 'completed',
      failed: 'failed',
      blocked: 'failed',
      superseded: 'failed',
    };
    return mapping[v2Status] ?? 'pending';
  }

  private mapV1StatusToV2(v1Status: string): string | undefined {
    const mapping: Record<string, string> = {
      pending: 'planned',
      running: 'in_progress',
      completed: 'completed',
      failed: 'failed',
    };
    return mapping[v1Status];
  }

  private getUnifiedStatus(
    v1Status?: string | null,
    v2Status?: string | null,
  ): string {
    if (v2Status) {
      return v2Status;
    }
    return v1Status ?? 'none';
  }
}
