/**
 * CLI Executor Service
 * 核心执行循环：spawn → 解析流 → 更新状态 → 完成/失败
 */

import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import { CliProviderRegistry } from './cli-provider.registry';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import { ApprovalService } from '@/modules/execution/approval.service';
import {
  CliExecutionInput,
  CLI_ADAPTER_CAPABILITIES,
  StreamEmitter,
  ExecutionStepUpdate,
  ProviderId,
} from './adapters/cli-adapter.interface';

export interface ExecutionContext {
  executionRunId: string;
  projectId: string;
  issueId?: string;
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
    private readonly prisma: PrismaService,
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
    const built = adapter.buildCommand(input);
    let cmd = built.cmd;
    const args: string[] = [...built.args];
    let env = built.env;

    // P1-22a：治理语义能力位——请求携带了 adapter 不支持的选项时显式告警，不再静默忽略
    const capabilities = CLI_ADAPTER_CAPABILITIES[context.providerId];
    const override = this.registry.getOverrideConfig(context.providerId);
    const unsupportedOptions: string[] = [];
    if (input.allowedTools?.length && !capabilities.allowedTools) {
      unsupportedOptions.push(
        `allowedTools（${input.allowedTools.length} 项，来自派发请求）`,
      );
    }
    if (override?.allowedTools?.length && !capabilities.allowedTools) {
      unsupportedOptions.push(
        `allowedTools（${override.allowedTools.length} 项，来自 provider 配置）`,
      );
    }

    // Apply DB overrides (commandPath / model / env / allowedTools)
    if (override) {
      if (override.commandPath) {
        cmd = override.commandPath;
      }
      if (override.env) {
        env = { ...env, ...override.env };
      }
      if (
        override.allowedTools &&
        override.allowedTools.length > 0 &&
        capabilities.allowedTools
      ) {
        // Inject --allowedTools / --allow based on adapter contract
        // Claude Code uses comma-joined flag; Codex uses comma-joined --allow
        // 能力位不支持的家（zcode/opencode）不注入：未知 flag 会污染 positional 参数或被 CLI 拒绝，改为显式告警
        const joiner = context.providerId === 'codex' ? ',' : ',';
        const flagName =
          context.providerId === 'codex' ? '--allow' : '--allowedTools';
        // Remove pre-existing flag pair to avoid duplicates
        const idx = args.findIndex(
          (a, i) => a === flagName && i + 1 < args.length,
        );
        if (idx >= 0) {
          args.splice(idx, 2);
        }
        args.push(flagName, override.allowedTools.join(joiner));
      }
    }

    // Apply default model override if input.model not set
    if (!input.model && override?.model) {
      // Insert --model before stream-json flags or just append
      args.push('--model', override.model);
    }

    this.logger.log(
      `Executing CLI: ${cmd} ${args.join(' ')} in ${input.workspaceRoot}`,
    );

    // Start execution
    await this.executionService.startExecution(executionRunId);

    // P1-22a：能力告警落执行时间线（不阻断执行；跟随 addExecutionStep 既有形态）
    if (unsupportedOptions.length > 0) {
      const detail = {
        providerId: context.providerId,
        unsupportedOptions,
        hint: '该 CLI provider 能力位不支持以上选项，执行时已忽略',
      };
      this.logger.warn(
        `[capability] ${context.providerId} 不支持: ${unsupportedOptions.join('、')}（execution=${executionRunId}）`,
      );
      try {
        await this.executionService.addExecutionStep(executionRunId, {
          stepType: 'observation',
          name: 'capability_warning',
          sequence: 0,
          input: detail,
          status: 'completed',
        });
      } catch (warnError) {
        this.logger.warn(
          `[capability] 告警时间线写入失败（不阻断执行）: ${warnError}`,
        );
      }
    }

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

    // prompt 注入：adapter 返回 stdinData 时写入后关闭 stdin（claude-code stream-json NDJSON）
    if (built.stdinData) {
      proc.stdin?.write(built.stdinData);
      proc.stdin?.end();
    }

    // Track process
    this.activeProcesses.set(executionRunId, proc);

    let stdout = '';
    let stderr = '';
    let currentStepSequence = 0;

    // 流日志分块缓冲：周期性把 stdout/stderr 落 SystemEvent（执行记录弹窗「原始日志」）
    const pendingOut: string[] = [];
    const pendingErr: string[] = [];
    const flushStreamLogs = async () => {
      const out = pendingOut.splice(0).join('');
      const err = pendingErr.splice(0).join('');
      if (out) {
        await this.executionService.appendExecutionStreamLog(
          executionRunId,
          out,
          'stdout',
        );
      }
      if (err) {
        await this.executionService.appendExecutionStreamLog(
          executionRunId,
          err,
          'stderr',
        );
      }
    };
    const logTimer = setInterval(() => void flushStreamLogs(), 2000);

    // Create readline interface for stdout
    const rl = readline.createInterface({
      input: proc.stdout!,
      crlfDelay: Infinity,
    });

    // Handle stdout stream
    rl.on('line', (line) => {
      stdout += line + '\n';
      pendingOut.push(line + '\n');
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
      const text = data.toString();
      stderr += text;
      pendingErr.push(text);
      this.logger.warn(`CLI stderr: ${text.trim()}`);
    });

    // Handle process exit
    return new Promise((resolve) => {
      proc.on('close', async (code) => {
        this.activeProcesses.delete(executionRunId);
        clearInterval(logTimer);
        await flushStreamLogs();

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
          await this.executionService.completeExecution(
            executionRunId,
            result.output || {},
            artifacts,
          );
          options.onComplete?.({ status: 'completed', output: result.output });
        } else {
          await this.executionService.failExecution(executionRunId, {
            error: result.error,
            stdout,
            stderr,
          });
          options.onComplete?.({
            status: 'failed',
            output: { error: result.error },
          });
        }

        // Publish completion event
        this.messageBus.publish('execution.completed', {
          executionRunId,
          projectId: context.projectId,
          issueId: context.issueId,
          status: result.status,
          providerId: context.providerId,
        });

        resolve({ success: result.status === 'completed', executionRunId });
      });

      proc.on('error', async (err) => {
        this.activeProcesses.delete(executionRunId);
        clearInterval(logTimer);
        await flushStreamLogs();
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
            this.logger.warn(
              `CLI execution timed out after ${input.timeout}ms`,
            );
          }
        }, input.timeout);
      }
    });
  }

  cancel(executionRunId: string): boolean {
    const proc = this.activeProcesses.get(executionRunId);
    if (proc) {
      this.killProcessTree(proc);
      this.activeProcesses.delete(executionRunId);
      this.logger.log(`Cancelled CLI process for execution: ${executionRunId}`);
      return true;
    }
    return false;
  }

  /** Windows 下 taskkill /T 杀整棵进程树，POSIX 下 SIGTERM */
  private killProcessTree(proc: ChildProcess): void {
    if (!proc.pid) {
      return;
    }
    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F']);
        return;
      } catch {
        // fallthrough to SIGTERM
      }
    }
    try {
      proc.kill('SIGTERM');
    } catch {
      // already exited
    }
  }

  isRunning(executionRunId: string): boolean {
    return this.activeProcesses.has(executionRunId);
  }

  private createEmitter(
    context: ExecutionContext,
    options: ExecuteOptions,
  ): StreamEmitter {
    const { executionRunId, conversationId } = context;

    // 兜底改造批 4：ai.stream 需带 userId 才能被网关定向推送（此前被丢弃，
    // 进程内执行路径前端看不到实时输出）。惰性解析一次 run 属主并缓存。
    let ownerIdPromise: Promise<string | null> | null = null;
    const resolveOwnerId = () => {
      ownerIdPromise ??= this.prisma.execution
        .findUnique({
          where: { id: executionRunId },
          select: { createdBy: true },
        })
        .then((r) => r?.createdBy ?? null)
        .catch(() => null);
      return ownerIdPromise;
    };

    return {
      token: (delta: string) => {
        // Publish token stream
        void resolveOwnerId().then((ownerId) => {
          this.messageBus.publish('ai.stream', {
            conversationId,
            executionRunId,
            userId: ownerId ?? undefined,
            token: delta,
            done: false,
          });
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
          issueId: context.issueId,
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
