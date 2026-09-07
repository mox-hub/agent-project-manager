/**
 * CLI Dispatch Service
 * 任务派发桥：Task → ExecutionRun → CLI
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import { RuntimeService } from '@/modules/runtime/runtime.service';
import { CliExecutorService, ExecutionContext } from './cli-executor.service';
import { CliProviderRegistry } from './cli-provider.registry';
import {
  CliResolutionService,
  type ResolvedBinding,
} from './cli-resolution.service';
import { ContextBuilderService } from '@/modules/ai-hub/services/context-builder.service';
import { TrustService } from '@/modules/trust/trust.service';
import { AcceptanceService } from '@/modules/acceptance/acceptance.service';
import { TEST_REPORT_ARTIFACT_TYPE } from './adapters/cli-adapter.interface';
import {
  validateTestReport,
  type TestReportPayload,
} from './adapters/test-report.schema';

export interface DispatchOptions {
  /** 目标 AI 成员（Member.id，type=ai_agent）；缺省时以发起用户为执行主体 */
  memberId?: string;
  providerId?: 'claude-code' | 'codex' | 'zcode';
  model?: string;
  allowedTools?: string[];
  timeout?: number;
  /**
   * 4d-3：绑定既有执行项（Execution.id）。传入时不再新建执行项，
   * 而是复用该执行项（状态须为 draft/planned/failed/blocked）并经既有
   * 状态机流转到 in_progress；缺省时保持原语义：为 issue 现场创建
   * 默认执行项（语法糖：subject 回落 issue.aiAgentId 对应 AI 成员）。
   */
  executionId?: string;
}

export interface DispatchResult {
  executionRunId: string;
  cliSessionId?: string;
  status: 'dispatched' | 'pending_approval' | 'error';
  error?: string;
  /** 两级审计 gate 之"派发黄牌"：活契约审计 red 时警告但不阻断 */
  auditWarning?: string;
}

/** 成员提示词上下文（派发 prompt 注入用） */
interface MemberPromptContext {
  memberName: string;
  personalPrompt: string | null;
  thinkingLevel: string | null;
  teamRules: string[];
}

/** 思考强度 → 派发 prompt 指令（CLI 无关的统一表述，各 CLI 自行映射执行强度） */
const THINKING_LEVEL_INSTRUCTIONS: Record<string, string> = {
  minimal: '以最简推理快速作答，跳过冗长推演',
  low: '低强度思考：只对关键决策做推理',
  medium: '中等强度思考：常规分析与规划',
  high: '高强度思考：深入推演边界情况与风险后再动手',
  max: '最大化思考：全面穷举方案、权衡与测试策略后再给出结论',
};

@Injectable()
export class CliDispatchService {
  private readonly logger = new Logger(CliDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly executionService: ExecutionService,
    private readonly executor: CliExecutorService,
    private readonly registry: CliProviderRegistry,
    private readonly cliResolution: CliResolutionService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly trustService: TrustService,
    private readonly acceptanceService: AcceptanceService,
    private readonly runtimeService: RuntimeService,
  ) {}

  /**
   * Dispatch a task to CLI for AI agent execution.
   * 新建式派发失败时落一条 blocked 执行项留痕（可监控、可从执行项面板重派）；
   * 绑定既有执行项的失败由该项自身状态承载，不另建记录。
   */
  async dispatchTaskToCli(
    issueId: string,
    userId: string,
    options: DispatchOptions = {},
  ): Promise<DispatchResult> {
    try {
      return await this.runDispatch(issueId, userId, options);
    } catch (err) {
      await this.recordDispatchFailure(issueId, userId, options, err as Error);
      throw err;
    }
  }

  /** 派发失败留痕：best-effort，落库失败只告警，不掩盖原始错误 */
  private async recordDispatchFailure(
    issueId: string,
    userId: string,
    options: DispatchOptions,
    error: Error,
  ) {
    try {
      if (options.executionId) return;
      const task = await this.prisma.issue.findUnique({
        where: { id: issueId },
        select: { id: true, projectId: true, title: true, aiAgentId: true },
      });
      // 收件箱任务无项目，无法落执行项（Execution.projectId 必填）
      if (!task?.projectId) return;
      const subjectId = options.memberId ?? task.aiAgentId;
      await this.executionService.createExecutionRun({
        projectId: task.projectId,
        issueId,
        subjectType: subjectId ? 'platform_ai_member' : 'external_agent',
        subjectId: subjectId ?? userId,
        identitySource: 'cli',
        goal: task.title,
        title: task.title,
        status: 'blocked',
        input: {
          dispatchError: error.message,
          failedAt: new Date().toISOString(),
        },
        metadata: { dispatchFailed: true },
        createdBy: userId,
      });
      this.logger.warn(
        `Dispatch failure recorded as blocked execution for task ${issueId}: ${error.message}`,
      );
    } catch (e) {
      this.logger.warn(
        `Failed to record dispatch failure for task ${issueId}: ${(e as Error).message}`,
      );
    }
  }

  private async runDispatch(
    issueId: string,
    userId: string,
    options: DispatchOptions = {},
  ): Promise<DispatchResult> {
    const { providerId, model, allowedTools, timeout, memberId } = options;

    // 1. Fetch task and validate
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task ${issueId} not found`);
    }

    if (!task.projectId) {
      throw new BadRequestException('Task must belong to a project');
    }

    const projectId = task.projectId;

    // 2. Get workspace root
    const workspaceRoot = await this.getWorkspaceRoot(projectId);
    if (!workspaceRoot) {
      throw new BadRequestException(
        `项目尚未配置工作区根目录（No workspace root configured for project ${projectId}）。` +
          `请到「项目设置 → Git 与终端 → 工作区」填写本地路径并保存后，再重新派发。`,
      );
    }

    // 3. V3 身份解析：AI 成员 → provider/role 现场解析（不再读 AgentIdentityBinding）
    let resolvedProviderId = providerId;
    let member: { id: string; type: string; status: string } | null = null;
    let resolved: ResolvedBinding | null = null;

    if (memberId) {
      member = await this.prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, type: true, status: true },
      });
      if (
        !member ||
        member.type !== 'ai_agent' ||
        member.status === 'inactive'
      ) {
        throw new BadRequestException(
          `Member ${memberId} is not an available AI agent`,
        );
      }
      resolved = await this.cliResolution.resolveForMember(memberId, projectId);
      // 显式 providerId 入参优先于解析结果
      if (!providerId) {
        resolvedProviderId = resolved.providerId as
          'claude-code' | 'codex' | 'zcode';
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
    const context = await this.contextBuilder.buildTaskExecutionContext(
      issueId,
      projectId,
    );

    // 6.5 成员上下文：个人提示词 / 团队规则 / 思考强度；CLI 工具白名单收敛
    const memberContext = await this.buildMemberPromptContext(memberId ?? null);
    let effectiveAllowedTools = allowedTools;
    if (memberId) {
      const granted = await this.getGrantedCliTools(memberId);
      if (granted) {
        effectiveAllowedTools = allowedTools
          ? allowedTools.filter((t) => granted.includes(t))
          : granted;
        if (effectiveAllowedTools.length === 0) {
          throw new BadRequestException(
            '该成员的 CLI 工具白名单未覆盖请求的工具集，无法派发',
          );
        }
      }
    }

    // 7. Create ExecutionRun —— 传入 executionId 时复用既有执行项（4d-3），否则现场创建
    let executionRun;
    if (options.executionId) {
      const existing = await this.prisma.execution.findUnique({
        where: { id: options.executionId },
      });
      if (!existing) {
        throw new NotFoundException(
          `Execution ${options.executionId} not found`,
        );
      }
      if (existing.issueId !== issueId) {
        throw new BadRequestException(
          `Execution ${existing.id} 不属于 issue ${issueId}`,
        );
      }
      // 绑定派发允许的起始状态（4d-3）：流转到 in_progress 走
      // updateExecutionRun 的既有状态机校验，不允许则 400。
      const DISPATCHABLE_STATUSES = ['draft', 'planned', 'failed', 'blocked'];
      if (!DISPATCHABLE_STATUSES.includes(existing.status)) {
        throw new BadRequestException(
          `执行项 ${existing.id} 当前状态为 ${existing.status}，仅 draft/planned/failed/blocked 可派发`,
        );
      }
      executionRun = await this.executionService.updateExecutionRun(
        existing.id,
        {
          status: 'in_progress',
          startedAt: new Date(),
          // goal/input 以派发参数为准：合并既有 input 并覆盖本次派发载荷
          input: {
            ...((existing.input as Record<string, unknown>) ?? {}),
            task: {
              id: task.id,
              title: task.title,
              description: task.description,
            },
            context,
            model,
            allowedTools: effectiveAllowedTools,
          },
        },
      );
    } else {
      // 语法糖：未指定 memberId 时，回落到 issue 主负责人 AI 成员（aiAgentId），
      // 使「issue 级直接派发」也能落到 platform_ai_member 语义的默认执行项。
      let defaultMember = member;
      if (!memberId && task.aiAgentId) {
        const agent = await this.prisma.member.findUnique({
          where: { id: task.aiAgentId },
          select: { id: true, type: true, status: true },
        });
        if (agent && agent.type === 'ai_agent' && agent.status !== 'inactive') {
          defaultMember = agent;
        }
      }
      executionRun = await this.executionService.createExecutionRun({
        projectId,
        issueId,
        subjectType: defaultMember ? 'platform_ai_member' : 'external_agent',
        subjectId: defaultMember?.id ?? userId,
        identitySource: 'cli',
        goal: task.title,
        role: resolved?.executionRole || undefined,
        input: {
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
          },
          context,
          model,
          allowedTools: effectiveAllowedTools,
        },
        createdBy: userId,
      });
    }

    this.logger.log(
      `ExecutionRun created: ${executionRun.id} for task ${issueId}`,
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
          issueId,
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

    // 10. Resolve agent role for prompt injection（解析链路已带回 promptHint）
    const agentRole = resolved?.promptHint
      ? {
          name: resolved.roleName ?? resolved.executionRole,
          role: resolved.executionRole,
          promptHint: resolved.promptHint,
        }
      : null;

    // 11. Build CLI input
    const prompt = this.buildPrompt(task, context, agentRole, memberContext);
    const cliInput = {
      workspaceRoot,
      prompt,
      model,
      allowedTools: effectiveAllowedTools,
      timeout: timeout || 600000, // Default 10 minutes
    };

    // 11. 编排：优先派发到在线 runtime 守护进程，否则回退进程内执行（dev）
    const onlineRuntime = await this.findOnlineRuntime();
    if (onlineRuntime) {
      await this.runtimeService.createDispatch(onlineRuntime.runtimeId, {
        executionRunId: executionRun.id,
        projectId,
        issueId,
        subjectType: executionRun.subjectType,
        subjectId: executionRun.subjectId,
        prompt,
        workspaceRoot,
        providerId: resolvedProviderId,
        model,
        allowedTools: effectiveAllowedTools,
        timeout: timeout || 600000,
      });
      this.logger.log(
        `Task ${issueId} dispatched to runtime ${onlineRuntime.runtimeId} (${resolvedProviderId})`,
      );
    } else {
      this.logger.log(
        `No online runtime, executing in-process (dev fallback): ${executionRun.id}`,
      );
      this.executor.execute(
        {
          executionRunId: executionRun.id,
          projectId,
          issueId,
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

            // Trigger trust evaluation
            try {
              await this.trustService.evaluateExecution({
                executionRunId: executionRun.id,
                agentId: executionRun.subjectId,
                projectId: executionRun.projectId,
                criteria: {
                  correctness: result.status === 'completed' ? 0.9 : 0.2,
                  efficiency: 0.7,
                  safety: 0.9,
                  collaboration: 0.7,
                },
                outcome: result.status === 'completed' ? 'success' : 'failure',
              });
            } catch (e) {
              this.logger.warn(
                `Trust evaluation failed for ${executionRun.id}: ${(e as Error).message}`,
              );
            }

            this.logger.log(
              `CLI execution ${result.status} for ${executionRun.id}`,
            );

            // V3 阶段1: 若 ExecutionRun 关联了 Acceptance，将 result.artifacts 落为 completionEvidence
            await this.persistCompletionEvidence(executionRun.id, result);
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

            // Trust: failure evaluation on error
            try {
              await this.trustService.evaluateExecution({
                executionRunId: executionRun.id,
                agentId: executionRun.subjectId,
                projectId: executionRun.projectId,
                criteria: {
                  correctness: 0.1,
                  efficiency: 0.2,
                  safety: 0.5,
                  collaboration: 0.3,
                },
                outcome: 'failure',
              });
            } catch (e) {
              this.logger.warn(
                `Trust evaluation failed for ${executionRun.id}: ${(e as Error).message}`,
              );
            }
          },
        },
      );
    }

    // 12. Publish dispatch event
    this.messageBus.publish('cli.dispatched', {
      executionRunId: executionRun.id,
      issueId,
      projectId,
      providerId: resolvedProviderId,
      cliSessionId: cliSession.id,
    });

    // 13. 派发黄牌：活契约审计 red 时随响应返回警告（不阻断执行）
    let auditWarning: string | undefined;
    if (executionRun.acceptanceId) {
      const report = await this.prisma.completenessAuditReport.findUnique({
        where: { acceptanceId: executionRun.acceptanceId },
        select: { riskLevel: true, blockedItems: true },
      });
      if (report?.riskLevel === 'red') {
        const blocked = (report.blockedItems as unknown[]) ?? [];
        auditWarning = `验收完整性审计存在 ${blocked.length} 个强阻断项，建议补全验收标准（接收时将被红牌拦截）`;
        this.logger.warn(
          `Dispatch yellow-gate: acceptance ${executionRun.acceptanceId} has ${blocked.length} blocked items`,
        );
      }
    }

    return {
      executionRunId: executionRun.id,
      cliSessionId: cliSession.id,
      status: 'dispatched',
      auditWarning,
    };
  }

  /**
   * Cancel a running CLI execution
   */
  async cancelExecution(
    executionRunId: string,
    userId: string,
  ): Promise<boolean> {
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
    await this.executionService.cancelExecution(
      executionRunId,
      'Cancelled by user',
    );

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
   * 查找最近的在线 runtime（守护进程）。无在线 runtime 时返回 null（回退进程内执行）。
   */
  private async findOnlineRuntime(): Promise<{ runtimeId: string } | null> {
    const records = await this.prisma.appConfig.findMany({
      where: { scope: 'runtime.registration' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    const online = records
      .map(
        (r) =>
          r.value as {
            runtimeId: string;
            status?: string;
            lastSeenAt?: string;
          },
      )
      .filter((r) => r.status === 'online')
      .sort((a, b) =>
        (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''),
      )[0];
    return online ? { runtimeId: online.runtimeId } : null;
  }

  /**
   * 守护进程上报执行结果（runtime.execution.result）→ 桥接：
   * ExecutionRun 状态更新 + cliSession 状态 + 信任评估 + 验收证据落库。
   */
  /**
   * 守护进程 execution.started 事件 → 执行项 planned→in_progress。
   * runtime 路径没有进程内执行器那样的 startExecution 时机，
   * 不补这一步结果落地时会被状态机禁跳步拒收（planned→completed）。
   */
  @OnEvent('runtime.execution.event')
  async onRuntimeExecutionEvent(payload: {
    eventType?: string;
    executionRunId?: string;
  }): Promise<void> {
    if (payload?.eventType !== 'execution.started' || !payload.executionRunId) {
      return;
    }
    try {
      await this.executionService.startExecution(payload.executionRunId);
    } catch (e) {
      this.logger.warn(
        `Failed to mark ${payload.executionRunId} in_progress: ${(e as Error).message}`,
      );
    }
  }

  @OnEvent('runtime.execution.result')
  async onRuntimeExecutionResult(payload: {
    executionRunId: string;
    status: string;
    summary?: string;
    artifacts?: Array<{ type: string; ref: string }>;
    evidence?: Array<{ type: string; ref: string }>;
    error?: Record<string, unknown> | null;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      costUsd?: number;
      model?: string;
    } | null;
  }): Promise<void> {
    const {
      executionRunId,
      status,
      summary,
      artifacts = [],
      error,
      usage,
    } = payload;
    try {
      const run = await this.prisma.execution.findUnique({
        where: { id: executionRunId },
      });
      if (!run) {
        this.logger.warn(
          `runtime result for unknown run ${executionRunId}, skipped`,
        );
        return;
      }

      // 兜底：started 事件缺失/乱序时先补 in_progress，避免终态被状态机拒收
      if (
        run.status !== 'in_progress' &&
        !['completed', 'superseded'].includes(run.status)
      ) {
        try {
          await this.executionService.startExecution(executionRunId);
        } catch (e) {
          this.logger.warn(
            `Failed to backfill in_progress for ${executionRunId}: ${(e as Error).message}`,
          );
        }
      }

      const completed = status === 'completed';
      const result = {
        status: completed ? ('completed' as const) : ('failed' as const),
        output: { summary },
        artifacts: artifacts.map((a) => ({
          type: a.type,
          name: a.ref,
          storageRef: a.ref,
        })),
        error: error ?? undefined,
      };

      // 1) 更新 ExecutionRun
      if (completed) {
        await this.executionService.completeExecution(
          executionRunId,
          result.output,
          result.artifacts.map((a) => ({
            artifactType: a.type,
            name: a.name,
          })),
        );
      } else {
        await this.executionService.failExecution(executionRunId, {
          error: result.error,
          summary,
        });
      }

      // 2) 更新 cliSession 状态
      const cliBinding = await this.prisma.cliExecutionBinding.findFirst({
        where: { executionRunId },
      });
      if (cliBinding) {
        await this.prisma.cliSession.update({
          where: { id: cliBinding.cliSessionId },
          data: {
            status: completed ? 'idle' : 'error',
            lastActiveAt: new Date(),
          },
        });
      }

      // 3) 信任评估
      try {
        await this.trustService.evaluateExecution({
          executionRunId,
          agentId: run.subjectId,
          projectId: run.projectId,
          criteria: completed
            ? {
                correctness: 0.9,
                efficiency: 0.7,
                safety: 0.9,
                collaboration: 0.7,
              }
            : {
                correctness: 0.1,
                efficiency: 0.2,
                safety: 0.5,
                collaboration: 0.3,
              },
          outcome: completed ? 'success' : 'failure',
        });
      } catch (e) {
        this.logger.warn(
          `Trust evaluation failed for ${executionRunId}: ${(e as Error).message}`,
        );
      }

      // 4) 验收证据落库
      await this.persistCompletionEvidence(executionRunId, result);

      // 5) 终事件落时间线：completed/failed 成为事件流最后一条（含 usage 快照）
      try {
        await this.prisma.systemEvent.create({
          data: {
            level: completed ? 'info' : 'error',
            category: 'runtime.execution.event',
            message: `${completed ? 'execution.completed' : 'execution.failed'} (${executionRunId})`,
            context: {
              executionRunId,
              eventType: completed ? 'execution.completed' : 'execution.failed',
              summary: summary ?? (completed ? '任务执行完成' : '任务执行失败'),
              detail: { usage: usage ?? null, error: error ?? null },
              timestamp: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
      } catch (e) {
        this.logger.warn(
          `Failed to persist terminal event for ${executionRunId}: ${(e as Error).message}`,
        );
      }

      this.logger.log(
        `Runtime execution ${completed ? 'completed' : 'failed'} for ${executionRunId}`,
      );
    } catch (e) {
      this.logger.warn(
        `onRuntimeExecutionResult failed for ${executionRunId}: ${(e as Error).message}`,
      );
    }
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
   * Persist execution artifacts as completionEvidence on linked Acceptance.
   * - test_report artifacts → evidence.report
   * - all artifacts → evidence.artifacts (id + name + type)
   */
  private async persistCompletionEvidence(
    executionRunId: string,
    result: {
      status: string;
      artifacts?: Array<{
        type: string;
        name: string;
        content?: string;
        storageRef?: string;
        metadata?: Record<string, unknown>;
      }>;
    },
  ): Promise<void> {
    try {
      const run = await this.prisma.execution.findUnique({
        where: { id: executionRunId },
        select: { acceptanceId: true },
      });
      if (!run?.acceptanceId) return; // 未关联 Acceptance，跳过

      const artifacts = result.artifacts ?? [];
      const evidence: Record<string, unknown> = {
        executionRunId,
        capturedAt: new Date().toISOString(),
        artifacts: artifacts.map((a) => ({
          id: a.storageRef, // storageRef is the canonical ID
          name: a.name,
          type: a.type,
          metadata: a.metadata,
        })),
      };

      // 若是 test_report artifact，把它的 metadata 当成 report
      const testReportArtifact = artifacts.find(
        (a) => a.type === TEST_REPORT_ARTIFACT_TYPE,
      );
      if (testReportArtifact?.metadata) {
        evidence.report = testReportArtifact.metadata;
      }

      // CI 自动判定（最小版）：test_report 校验通过时记录 autoChecks，
      // 供接收校验与前端展示；不自动改写 criteria（判定仍以人工为主）
      if (testReportArtifact?.metadata) {
        const v = validateTestReport(testReportArtifact.metadata);
        if (v.valid) {
          const r: TestReportPayload = v.report;
          const errored = r.errored ?? 0;
          evidence.autoChecks = {
            kind: 'test_report',
            valid: r.failed === 0 && errored === 0,
            passed: r.passed,
            failed: r.failed,
            errored,
            total: r.total,
            checkedAt: new Date().toISOString(),
          };
        }
      }

      // 不覆盖已有 evidence，除非是同一 executionRunId 重跑
      const existing = await this.prisma.acceptance.findUnique({
        where: { id: run.acceptanceId },
        select: { completionEvidence: true },
      });
      const existingEv = existing?.completionEvidence as Record<
        string,
        unknown
      > | null;
      if (existingEv && existingEv.executionRunId !== executionRunId) {
        // 先前的 evidence 来自不同 run，保留为历史
        evidence.previousEvidence = existingEv;
      }

      await this.prisma.acceptance.update({
        where: { id: run.acceptanceId },
        data: { completionEvidence: evidence as any },
      });

      // 同时把 acceptance 推入 in_review（等待人工接收/驳回）
      await this.prisma.acceptance.update({
        where: { id: run.acceptanceId },
        data: { status: 'in_review' },
      });

      this.logger.log(
        `Persisted completion evidence for acceptance ${run.acceptanceId} (${artifacts.length} artifacts)`,
      );
    } catch (e) {
      this.logger.warn(
        `persistCompletionEvidence failed for ${executionRunId}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Build prompt for CLI execution
   */
  private buildPrompt(
    task: { title: string; description?: string | null },
    context: unknown,
    agentRole?: { name: string; role: string; promptHint: string } | null,
    memberContext?: MemberPromptContext | null,
  ): string {
    const parts: string[] = [];

    // 1. Role block (injected first so it sets context before task details)
    if (agentRole) {
      parts.push(`## Your Role\n${agentRole.promptHint}`);
    }

    // 1.5 Team rules + member personal instructions + reasoning effort
    if (memberContext?.teamRules?.length) {
      parts.push(`## Team Rules\n${memberContext.teamRules.join('\n\n')}`);
    }
    if (memberContext?.personalPrompt?.trim()) {
      parts.push(
        `## Member Instructions (${memberContext.memberName})\n${memberContext.personalPrompt.trim()}`,
      );
    }
    if (memberContext?.thinkingLevel) {
      const instruction =
        THINKING_LEVEL_INSTRUCTIONS[memberContext.thinkingLevel] ??
        memberContext.thinkingLevel;
      parts.push(
        `## Reasoning Effort\n${memberContext.thinkingLevel} — ${instruction}`,
      );
    }

    // 2. Task
    parts.push(`# Task\n${task.title}`);
    if (task.description) {
      parts.push(`\n## Description\n${task.description}`);
    }

    // 3. Context
    if (context) {
      parts.push(`\n## Context\n${JSON.stringify(context, null, 2)}`);
    }

    parts.push('\n\nPlease execute this task and report the results.');

    return parts.join('\n');
  }

  /**
   * 成员提示词上下文：按 memberId 聚合个人提示词/团队规则/思考强度
   * 个人提示词、思考强度与所在活跃团队的团队规则。
   */
  private async buildMemberPromptContext(
    memberId: string | null,
  ): Promise<MemberPromptContext | null> {
    if (!memberId) return null;
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) return null;

    const teamMembers = await this.prisma.teamMember.findMany({
      where: { memberId: member.id },
      select: { teamId: true },
    });
    const teamIds = teamMembers.map((t) => t.teamId);
    const teams = await (teamIds.length
      ? this.prisma.team.findMany({
          where: { id: { in: teamIds }, status: 'active' },
          select: { teamPrompt: true },
        })
      : Promise.resolve([]));
    const teamRules = [
      ...new Set(
        teams
          .map((t) => t.teamPrompt)
          .filter((p): p is string => Boolean(p && p.trim())),
      ),
    ];

    return {
      memberName: member.displayName,
      personalPrompt: member.personalPrompt,
      thinkingLevel: member.thinkingLevel,
      teamRules,
    };
  }

  /**
   * 成员 CLI 工具白名单（MemberToolGrant scope=cli_tool）。
   * 返回 null 表示未配置授权（不限制）；数组为空表示全部被拒绝。
   */
  private async getGrantedCliTools(memberId: string): Promise<string[] | null> {
    const rows = await this.prisma.memberToolGrant.findMany({
      where: { memberId, scope: 'cli_tool' },
    });
    if (rows.length === 0) return null;
    return rows.filter((r) => r.granted).map((r) => r.refKey);
  }
}
