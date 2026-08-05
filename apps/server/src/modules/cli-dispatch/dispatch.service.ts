/**
 * CLI Dispatch Service
 * 任务派发桥：Task → ExecutionRun → CLI
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import { CliExecutorService, ExecutionContext } from './cli-executor.service';
import { CliProviderRegistry } from './cli-provider.registry';
import { AiWorkerCoordinatorService } from '@/modules/ai-hub/services/ai-worker-coordinator.service';
import { ContextBuilderService } from '@/modules/ai-hub/services/context-builder.service';

export interface DispatchOptions {
  agentBindingId?: string;
  providerId?: 'claude-code' | 'codex' | 'zcode';
  model?: string;
  allowedTools?: string[];
  timeout?: number;
}

export interface DispatchResult {
  executionRunId: string;
  cliSessionId?: string;
  status: 'dispatched' | 'pending_approval' | 'error';
  error?: string;
}

@Injectable()
export class CliDispatchService {
  private readonly logger = new Logger(CliDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly executionService: ExecutionService,
    private readonly executor: CliExecutorService,
    private readonly registry: CliProviderRegistry,
    private readonly coordinator: AiWorkerCoordinatorService,
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  /**
   * Dispatch a task to CLI for AI agent execution
   */
  async dispatchTaskToCli(
    taskId: string,
    userId: string,
    options: DispatchOptions = {},
  ): Promise<DispatchResult> {
    const { providerId, model, allowedTools, timeout, agentBindingId } = options;

    // 1. Fetch task and validate
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (!task.projectId) {
      throw new BadRequestException('Task must belong to a project');
    }

    const projectId = task.projectId;

    // 2. Get workspace root
    const workspaceRoot = await this.getWorkspaceRoot(projectId);
    if (!workspaceRoot) {
      throw new BadRequestException(
        `No workspace root configured for project ${projectId}`,
      );
    }

    // 3. Resolve provider and binding
    let resolvedProviderId = providerId;
    let binding = null;

    if (agentBindingId) {
      binding = await this.prisma.agentIdentityBinding.findUnique({
        where: { id: agentBindingId },
      });

      if (!binding) {
        throw new NotFoundException(`Agent binding ${agentBindingId} not found`);
      }

      // Provider from binding takes precedence
      if (binding.providerId && !providerId) {
        resolvedProviderId = binding.providerId as 'claude-code' | 'codex' | 'zcode';
      }
    }

    // 4. Default to claude-code if no provider specified
    if (!resolvedProviderId) {
      resolvedProviderId = 'claude-code';
    }

    // 5. Check provider availability
    if (!this.registry.isAvailable(resolvedProviderId)) {
      throw new BadRequestException(
        `Provider ${resolvedProviderId} is not available on this machine`,
      );
    }

    // 6. Build execution context using ContextBuilder
    const context = await this.contextBuilder.buildTaskExecutionContext(taskId, projectId);

    // 7. Create ExecutionRun
    const executionRunId = `exec_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const executionRun = await this.executionService.createExecutionRun({
      projectId,
      taskId,
      subjectType: (binding?.subjectType as 'human' | 'platform_ai_member' | 'external_agent') || 'external_agent',
      subjectId: binding?.subjectId || userId,
      identitySource: 'cli',
      goal: task.title,
      role: binding?.mappedRole || undefined,
      level: binding?.mappedLevel || undefined,
      input: {
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
        },
        context,
        model,
        allowedTools,
      },
      createdBy: userId,
    });

    this.logger.log(
      `ExecutionRun created: ${executionRun.id} for task ${taskId}`,
    );

    // 8. Create CliSession
    const runtime = await this.getOrCreateServerRuntime();
    const cliSession = await this.prisma.cliSession.create({
      data: {
        runtimeId: runtime.id,
        providerId: resolvedProviderId,
        workspaceRoot,
        status: 'active',
        metadata: {
          executionRunId: executionRun.id,
          taskId,
          projectId,
        },
      },
    });

    // 9. Create CliExecutionBinding
    await this.prisma.cliExecutionBinding.create({
      data: {
        executionRunId: executionRun.id,
        cliSessionId: cliSession.id,
        runtimeId: runtime.id,
        providerId: resolvedProviderId,
        workspaceRoot,
        status: 'active',
      },
    });

    // 10. Build CLI input
    const prompt = this.buildPrompt(task, context);
    const cliInput = {
      workspaceRoot,
      prompt,
      model,
      allowedTools,
      timeout: timeout || 600000, // Default 10 minutes
    };

    // 11. Execute asynchronously
    this.executor.execute(
      {
        executionRunId: executionRun.id,
        projectId,
        taskId,
        providerId: resolvedProviderId,
        userId,
      },
      cliInput,
      {
        onComplete: async (result) => {
          // Update cli session status
          await this.prisma.cliSession.update({
            where: { id: cliSession.id },
            data: {
              status: result.status === 'completed' ? 'idle' : 'error',
              lastActiveAt: new Date(),
            },
          });

          this.logger.log(
            `CLI execution ${result.status} for ${executionRun.id}`,
          );
        },
        onError: async (error) => {
          await this.prisma.cliSession.update({
            where: { id: cliSession.id },
            data: {
              status: 'error',
              lastActiveAt: new Date(),
              metadata: { lastError: error.message },
            },
          });
        },
      },
    );

    // 12. Publish dispatch event
    this.messageBus.publish('cli.dispatched', {
      executionRunId: executionRun.id,
      taskId,
      projectId,
      providerId: resolvedProviderId,
      cliSessionId: cliSession.id,
    });

    return {
      executionRunId: executionRun.id,
      cliSessionId: cliSession.id,
      status: 'dispatched',
    };
  }

  /**
   * Cancel a running CLI execution
   */
  async cancelExecution(executionRunId: string, userId: string): Promise<boolean> {
    const binding = await this.prisma.cliExecutionBinding.findFirst({
      where: { executionRunId },
    });

    if (!binding) {
      throw new NotFoundException(
        `No CLI binding found for execution ${executionRunId}`,
      );
    }

    // Cancel the process
    const cancelled = this.executor.cancel(executionRunId);

    // Update status
    await this.executionService.cancelExecution(executionRunId, 'Cancelled by user');

    // Update bindings
    await this.prisma.cliExecutionBinding.updateMany({
      where: { executionRunId },
      data: { status: 'terminated' },
    });

    await this.prisma.cliSession.update({
      where: { id: binding.cliSessionId },
      data: {
        status: 'terminated',
        endedAt: new Date(),
      },
    });

    this.messageBus.publish('cli.cancelled', {
      executionRunId,
      cancelledBy: userId,
    });

    return cancelled;
  }

  /**
   * Get workspace root for a project
   */
  private async getWorkspaceRoot(projectId: string): Promise<string | null> {
    // Try ProjectWorkspace first
    const workspace = await this.prisma.projectWorkspace.findUnique({
      where: { projectId },
    });

    if (workspace?.localPath) {
      return workspace.localPath;
    }

    // Try AppConfig
    const config = await this.prisma.appConfig.findFirst({
      where: {
        scope: 'project',
        projectId,
        key: 'git.workspaceRoot',
      },
    });

    if (config) {
      return (config.value as { path?: string })?.path || null;
    }

    // Fallback: try to find from Repository
    const repo = await this.prisma.repository.findFirst({
      where: { projectId },
    });

    return repo?.localPath || null;
  }

  /**
   * Get or create server runtime
   */
  private async getOrCreateServerRuntime() {
    let runtime = await this.prisma.runtime.findFirst({
      where: {
        userId: 'system',
        deviceId: 'server-local',
      },
    });

    if (!runtime) {
      runtime = await this.prisma.runtime.create({
        data: {
          userId: 'system',
          deviceId: 'server-local',
          displayName: 'Server Local CLI',
          hostPlatform: process.platform,
          runtimeVersion: process.version,
          status: 'online',
          lastSeenAt: new Date(),
        },
      });
    }

    return runtime;
  }

  /**
   * Build prompt for CLI execution
   */
  private buildPrompt(
    task: { title: string; description?: string | null },
    context: unknown,
  ): string {
    const parts: string[] = [];

    parts.push(`# Task\n${task.title}`);
    if (task.description) {
      parts.push(`\n## Description\n${task.description}`);
    }

    if (context) {
      parts.push(`\n## Context\n${JSON.stringify(context, null, 2)}`);
    }

    parts.push('\n\nPlease execute this task and report the results.');

    return parts.join('\n');
  }
}
