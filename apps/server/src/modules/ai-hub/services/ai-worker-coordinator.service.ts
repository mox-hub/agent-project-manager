import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { TaskService } from '@/modules/task/task.service';
import { CliDispatchService } from '@/modules/cli-dispatch/dispatch.service';
import type { DispatchResult } from '@/modules/cli-dispatch/dispatch.service';
import type { Prisma } from '@prisma/client';

/**
 * AI Worker Coordinator — bridges Task module and Runtime module.
 *
 * Responsibilities:
 * - Verify AI agent registration (via AgentIdentityBinding)
 * - Assign a task to an AI agent (claim + create runtime dispatch)
 * - Handle execution results flowing back from Runtime → Task
 * - List available AI agents for a project
 * - Subscribe to runtime.execution.result events for auto task updates
 */
@Injectable()
export class AiWorkerCoordinatorService {
  private readonly logger = new Logger(AiWorkerCoordinatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly taskService: TaskService,
    private readonly cliDispatch: CliDispatchService,
  ) {
    this.subscribeToRuntimeResults();
  }

  /**
   * Assign a task to a registered AI agent:
   * 1. Verify agent identity binding exists
   * 2. Claim task for AI
   * 3. Create a runtime dispatch with execution context
   */
  async assignTaskToAI(
    taskId: string,
    agentSubjectId: string,
    projectId: string,
    userId: string,
  ): Promise<{
    taskId: string;
    executionRunId: string;
    runtimeId: string;
    status: string;
  }> {
    // 1. Verify agent identity binding exists
    const binding = await this.prisma.agentIdentityBinding.findFirst({
      where: {
        projectId,
        subjectId: agentSubjectId,
        status: 'active',
      },
    });

    if (!binding) {
      throw new NotFoundException(
        `No active agent binding found for ${agentSubjectId} in project ${projectId}`,
      );
    }

    // 2. Claim task for AI via TaskService
    await this.taskService.claimForAi(
      taskId,
      { aiAgentId: agentSubjectId },
      userId,
    );

    // 3. Delegate to CliDispatchService — this creates ExecutionRun and spawns CLI
    let dispatchResult: DispatchResult;
    try {
      dispatchResult = await this.cliDispatch.dispatchTaskToCli(
        taskId,
        userId,
        {
          agentBindingId: binding.id,
          providerId: binding.providerId as 'claude-code' | 'codex' | 'zcode',
        },
      );
    } catch (err) {
      this.logger.error(
        `CLI dispatch failed for task ${taskId}: ${(err as Error).message}`,
      );
      // Still update task status to reflect failure
      await this.prisma.task.update({
        where: { id: taskId },
        data: { aiExecutionStatus: 'failed' },
      });
      throw err;
    }

    // 4. Update task execution status
    await this.prisma.task.update({
      where: { id: taskId },
      data: { aiExecutionStatus: 'running' },
    });

    // 5. Publish dispatch event
    this.messageBus.publish('task.ai.dispatched', {
      taskId,
      projectId,
      agentSubjectId,
      executionRunId: dispatchResult.executionRunId,
      runtimeId: binding.providerId,
    });

    this.logger.log(
      `Task ${taskId} dispatched to AI agent ${agentSubjectId} (execution: ${dispatchResult.executionRunId})`,
    );

    return {
      taskId,
      executionRunId: dispatchResult.executionRunId,
      runtimeId: binding.providerId,
      status: 'dispatched',
    };
  }

  /**
   * Handle execution result from runtime — update the corresponding Task
   */
  async handleExecutionResult(
    executionRunId: string,
    result: {
      status: 'completed' | 'failed';
      summary?: string;
      artifacts?: unknown[];
      evidence?: unknown[];
      error?: string;
    },
  ) {
    // Find dispatch by executionRunId to get taskId
    const dispatchRecords = await this.prisma.appConfig.findMany({
      where: { scope: 'runtime.dispatch' },
    });

    const dispatchRecord = dispatchRecords.find(
      (r) => (r.value as any).executionRunId === executionRunId,
    );

    if (!dispatchRecord) {
      this.logger.warn(
        `No dispatch found for execution ${executionRunId}, skipping task update`,
      );
      return;
    }

    const dispatch = dispatchRecord.value as any;
    const taskId = dispatch.taskId as string;
    const projectId = dispatch.projectId as string;

    // Find a system user or the agent binding to use as actor
    const binding = await this.prisma.agentIdentityBinding.findFirst({
      where: { projectId, subjectId: dispatch.subjectId },
    });

    const actorId = binding?.createdBy ?? 'system';

    await this.taskService.submitAiExecutionResult(
      taskId,
      {
        aiExecutionResult: {
          summary: result.summary,
          artifacts: result.artifacts ?? [],
          evidence: result.evidence ?? [],
          error: result.error,
        },
        aiExecutionStatus: result.status,
        error: result.error,
      },
      actorId,
    );

    this.logger.log(
      `Execution ${executionRunId} result (${result.status}) applied to task ${taskId}`,
    );
  }

  /**
   * List available AI agents for a project (active identity bindings)
   */
  async getAvailableAgents(projectId: string) {
    const bindings = await this.prisma.agentIdentityBinding.findMany({
      where: {
        projectId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with runtime status where possible
    const agents = await Promise.all(
      bindings.map(async (binding) => {
        const runtimeOnline = await this.isRuntimeOnline(binding.providerId);
        return {
          id: binding.id,
          subjectType: binding.subjectType,
          subjectId: binding.subjectId,
          providerId: binding.providerId,
          identitySource: binding.identitySource,
          mappedRole: binding.mappedRole,
          runtimeOnline,
        };
      }),
    );

    return agents;
  }

  /**
   * Build a complete task execution context pack for AI consumption
   */
  async buildTaskExecutionContext(taskId: string, projectId: string) {
    const [task, aiContext] = await Promise.all([
      this.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: {
            select: { id: true, username: true, displayName: true },
          },
          reporter: {
            select: { id: true, username: true, displayName: true },
          },
          taskTags: { include: { tag: true } },
          dependencies: {
            include: {
              dependsOnTask: {
                select: { id: true, title: true, status: true },
              },
            },
          },
          subTasks: {
            select: { id: true, title: true, status: true },
          },
        },
      }),
      this.prisma.projectAIContext.findUnique({
        where: { projectId },
      }),
    ]);

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.taskTags.map((tt) => tt.tag.name),
        dependencies: task.dependencies.map((d) => ({
          id: d.dependsOnTask.id,
          title: d.dependsOnTask.title,
          status: d.dependsOnTask.status,
        })),
        subTasks: task.subTasks,
      },
      projectContext: aiContext
        ? {
            techStack: aiContext.techStack,
            languages: aiContext.languages,
            frameworks: aiContext.frameworks,
            complexityLevel: aiContext.complexityLevel,
            lifecyclePhase: aiContext.lifecyclePhase,
            healthScore: aiContext.healthScore,
            riskIndicators: aiContext.riskIndicators,
          }
        : null,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Private helpers ───────────────────────────────────────────

  private subscribeToRuntimeResults() {
    this.messageBus.subscribe('runtime.execution.result', (event: any) => {
      if (event.executionRunId) {
        this.handleExecutionResult(event.executionRunId, {
          status: event.status,
          summary: event.summary,
          artifacts: event.artifacts,
          evidence: event.evidence,
          error: event.error,
        }).catch((err: Error) => {
          this.logger.error(
            `Failed to handle runtime result for ${event.executionRunId}: ${err.message}`,
          );
        });
      }
    });
  }

  private async isRuntimeOnline(runtimeId: string): Promise<boolean> {
    try {
      const registration = await this.prisma.appConfig.findFirst({
        where: {
          key: `runtime:registration:${runtimeId}`,
          scope: 'runtime.registration',
        },
      });

      if (!registration) return false;

      const record = registration.value as any;
      if (record.status !== 'online') return false;

      // Consider offline if last heartbeat was > 90s ago
      const lastHeartbeat = new Date(record.lastHeartbeatAt).getTime();
      const now = Date.now();
      return now - lastHeartbeat < 90_000;
    } catch {
      return false;
    }
  }
}
