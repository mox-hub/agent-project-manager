import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  Prisma,
  AIWorkflowDefinition,
  AIWorkflowStep,
  AIWorkflowRun,
} from '@prisma/client';

export interface ExecuteWorkflowInput {
  workflowKey: string;
  projectId?: string;
  taskId?: string;
  triggerType?: string;
  input?: Record<string, unknown>;
}

export interface WorkflowExecutionResult {
  success: boolean;
  workflowRunId: string;
  output?: any;
  error?: string;
}

@Injectable()
export class WorkflowEngineService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get workflow definition by key
   */
  async getWorkflowByKey(key: string): Promise<AIWorkflowDefinition | null> {
    return this.prisma.aIWorkflowDefinition.findUnique({
      where: { key },
    });
  }

  /**
   * Start workflow execution
   */
  async startExecution(input: ExecuteWorkflowInput): Promise<AIWorkflowRun> {
    const workflow = await this.getWorkflowByKey(input.workflowKey);
    if (!workflow) {
      throw new Error(`Workflow ${input.workflowKey} not found or disabled`);
    }

    // Create workflow run
    const run = await this.prisma.aIWorkflowRun.create({
      data: {
        workflowId: workflow.id,
        projectId: input.projectId || null,
        taskId: input.taskId || null,
        status: 'running',
        triggerType: input.triggerType || 'manual',
        input: (input.input as any) || {},
        startedAt: new Date(),
      },
    });

    return run;
  }

  /**
   * Update workflow run status
   */
  async updateRunStatus(
    runId: string,
    status: 'succeeded' | 'failed' | 'cancelled',
    output?: any,
    error?: string,
  ): Promise<void> {
    const data: any = {
      status,
      output: output || null,
      finishedAt: new Date(),
    };

    await this.prisma.aIWorkflowRun.update({
      where: { id: runId },
      data,
    });
  }

  /**
   * Get workflow run history
   */
  async getRunHistory(params?: {
    workflowKey?: string;
    projectId?: string;
    taskId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { page = 1, pageSize = 50 } = params || {};
    const where: any = {};

    if (!params) {
      const [runs, total] = await this.prisma.$transaction([
        this.prisma.aIWorkflowRun.findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: { startedAt: 'desc' },
        }),
        this.prisma.aIWorkflowRun.count({ where }),
      ]);

      return {
        data: runs,
        meta: { page, pageSize, total },
      };
    }

    if (params.workflowKey) {
      const workflow = await this.getWorkflowByKey(params.workflowKey);
      if (workflow) {
        where.workflowId = workflow.id;
      }
    }

    if (params.projectId) {
      where.projectId = params.projectId;
    }

    if (params.taskId) {
      where.taskId = params.taskId;
    }

    if (params.status) {
      where.status = params.status;
    }

    const [runs, total] = await this.prisma.$transaction([
      this.prisma.aIWorkflowRun.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.aIWorkflowRun.count({ where }),
    ]);

    return {
      data: runs,
      meta: { page, pageSize, total },
    };
  }

  /**
   * Cancel running workflow
   */
  async cancelRun(runId: string): Promise<void> {
    const run = await this.prisma.aIWorkflowRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      throw new Error(`Workflow run ${runId} not found`);
    }

    if (run.status !== 'running') {
      throw new Error(`Workflow run ${runId} is not running`);
    }

    await this.updateRunStatus(
      runId,
      'cancelled',
      undefined,
      'Cancelled by user',
    );
  }

  /**
   * Get workflow steps for a workflow
   */
  async getWorkflowSteps(workflowId: string) {
    return this.prisma.aIWorkflowStep.findMany({
      where: { workflowId },
      orderBy: { order: 'asc' },
    });
  }
}
