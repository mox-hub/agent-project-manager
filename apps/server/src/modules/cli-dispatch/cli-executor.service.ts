/**
 * CLI Executor Service
 * 核心执行循环：spawn → 解析流 → 更新状态 → 完成/失败
 */

import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import { CliProviderRegistry } from './cli-provider.registry';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import { ApprovalService } from '@/modules/execution/approval.service';
import {
  CliAdapter,
  CliExecutionInput,
  StreamEmitter,
  ExecutionStepUpdate,
  ProviderId,
} from './adapters/cli-adapter.interface';

export interface ExecutionContext {
  executionRunId: string;
  projectId: string;
  taskId?: string;
  providerId: ProviderId;
  conversationId?: string;
  userId?: string;
}

export interface ExecuteOptions {
  onToken?: (token: string) => void;
  onStep?: (step: ExecutionStepUpdate) => void;
  onApprovalNeeded?: (approvalId: string) => void;
  onComplete?: (result: { status: string; output: unknown }) => void;
  onError?: (error: Error) => void;
}

@Injectable()
export class CliExecutorService {
  private readonly logger = new Logger(CliExecutorService.name);
  private readonly activeProcesses = new Map<string, ChildProcess>();

  constructor(
    private readonly registry: CliProviderRegistry,
    private readonly messageBus: MessageBusService,
    private readonly executionService: ExecutionService,
    private readonly approvalService: ApprovalService,
  ) {}

  async execute(
    context: ExecutionContext,
    input: CliExecutionInput,
    options: ExecuteOptions = {},
  ): Promise<{ success: boolean; executionRunId: string }> {
    const { executionRunId, conversationId } = context;

    // Get adapter
    const adapter = this.registry.getAdapter(context.providerId);
    if (!adapter) {
      throw new Error(`No adapter found for provider: ${context.providerId}`);
    }

    // Check if provider is available
    if (!this.registry.isAvailable(context.providerId)) {
      throw new Error(`Provider ${context.providerId} is not available`);
    }

    // Build command
    const { cmd, args, env } = adapter.buildCommand(input);

    this.logger.log(
      `Executing CLI: ${cmd} ${args.join(' ')} in ${input.workspaceRoot}`,
    );

    // Start execution
    await this.executionService.startExecution(executionRunId);

    // Create stream emitter
    const emitter: StreamEmitter = this.createEmitter(context, options);

    // Spawn process
    const proc = spawn(cmd, args, {
      cwd: input.workspaceRoot,
      env: {
        ...env,
        // Pass execution context via environment
        APM_EXECUTION_ID: executionRunId,
        APM_CONVERSATION_ID: conversationId || '',
        APM_PROJECT_ID: context.projectId,
      },
      shell: true,
    });

    // Track process
    this.activeProcesses.set(executionRunId, proc);

    let stdout = '';
    let stderr = '';
    let currentStepSequence = 0;

    // Create readline interface for stdout
    const rl = readline.createInterface({
      input: proc.stdout!,
      crlfDelay: Infinity,
    });

    // Handle stdout stream
    rl.on('line', (line) => {
      stdout += line + '\n';
      adapter.parseStream(line, {
        ...emitter,
        step: (step) => {
          currentStepSequence++;
          const stepWithSeq = { ...step, sequence: currentStepSequence };
          this.handleStepUpdate(context, stepWithSeq, options);
          emitter.step?.(stepWithSeq);
        },
      });
    });

    // Handle stderr
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      this.logger.warn(`CLI stderr: ${data.toString().trim()}`);
    });

    // Handle process exit
    return new Promise((resolve) => {
      proc.on('close', async (code) => {
        this.activeProcesses.delete(executionRunId);

        this.logger.log(`CLI process exited with code ${code}`);

        // Parse final result
        const result = adapter.parseFinalResult(stdout, code ?? 0);

        // Create artifacts
        const artifacts = result.artifacts.map((a) => ({
          artifactType: a.type,
          name: a.name,
          content: a.content,
        }));

        if (result.status === 'completed') {
          await this.executionService.completeExecution(executionRunId, result.output || {}, artifacts);
          options.onComplete?.({ status: 'completed', output: result.output });
        } else {
          await this.executionService.failExecution(executionRunId, {
            error: result.error,
            stdout,
            stderr,
          });
          options.onComplete?.({ status: 'failed', output: { error: result.error } });
        }

        // Publish completion event
        this.messageBus.publish('execution.completed', {
          executionRunId,
          projectId: context.projectId,
          taskId: context.taskId,
          status: result.status,
          providerId: context.providerId,
        });

        resolve({ success: result.status === 'completed', executionRunId });
      });

      proc.on('error', async (err) => {
        this.activeProcesses.delete(executionRunId);
        this.logger.error(`CLI process error: ${err.message}`);

        await this.executionService.failExecution(executionRunId, {
          error: err.message,
        });

        options.onError?.(err);

        this.messageBus.publish('execution.completed', {
          executionRunId,
          projectId: context.projectId,
          status: 'failed',
          error: err.message,
        });

        resolve({ success: false, executionRunId });
      });

      // Apply timeout
      if (input.timeout && input.timeout > 0) {
        setTimeout(() => {
          if (this.activeProcesses.has(executionRunId)) {
            this.cancel(executionRunId);
            this.logger.warn(`CLI execution timed out after ${input.timeout}ms`);
          }
        }, input.timeout);
      }
    });
  }

  cancel(executionRunId: string): boolean {
    const proc = this.activeProcesses.get(executionRunId);
    if (proc) {
      proc.kill('SIGTERM');
      this.activeProcesses.delete(executionRunId);
      this.logger.log(`Cancelled CLI process for execution: ${executionRunId}`);
      return true;
    }
    return false;
  }

  isRunning(executionRunId: string): boolean {
    return this.activeProcesses.has(executionRunId);
  }

  private createEmitter(
    context: ExecutionContext,
    options: ExecuteOptions,
  ): StreamEmitter {
    const { executionRunId, conversationId } = context;

    return {
      token: (delta: string) => {
        // Publish token stream
        this.messageBus.publish('ai.stream', {
          conversationId,
          executionRunId,
          token: delta,
          done: false,
        });
        options.onToken?.(delta);
      },
      step: (step: ExecutionStepUpdate) => {
        this.handleStepUpdate(context, step, options);
      },
      approvalNeeded: async (req) => {
        // Create approval request
        const approval = await this.approvalService.createApprovalRequest({
          executionRunId,
          projectId: context.projectId,
          taskId: context.taskId,
          requestedAction: req.requestedAction,
          actionType: req.actionType,
          riskLevel: req.riskLevel,
          reason: req.reason,
        });

        // Emit approval event
        this.messageBus.publish('execution.approval_needed', {
          executionRunId,
          projectId: context.projectId,
          approvalId: approval.id,
        });

        options.onApprovalNeeded?.(approval.id);
      },
    };
  }

  private async handleStepUpdate(
    context: ExecutionContext,
    step: ExecutionStepUpdate,
    options: ExecuteOptions,
  ) {
    try {
      // Add or update step in execution
      const existingSteps = await this.executionService.getExecutionArtifacts(context.executionRunId);

      // Create new step
      await this.executionService.addExecutionStep(context.executionRunId, {
        stepType: step.stepType,
        sequence: step.sequence || 0,
        name: step.name,
        input: step.input,
        status: step.status,
      });

      // Publish step update
      this.messageBus.publish('execution.step.updated', {
        executionRunId: context.executionRunId,
        stepType: step.stepType,
        stepName: step.name,
        status: step.status,
        providerId: context.providerId,
      });

      options.onStep?.(step);
    } catch (error) {
      this.logger.error(`Failed to handle step update: ${error}`);
    }
  }
}
