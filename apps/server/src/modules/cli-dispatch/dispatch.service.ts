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
import { randomUUID } from 'crypto';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import { CliExecutorService, ExecutionContext } from './cli-executor.service';
import { CliProviderRegistry } from './cli-provider.registry';
import { ContextBuilderService } from '@/modules/ai-hub/services/context-builder.service';
import { TrustService } from '@/modules/trust/trust.service';
import { AcceptanceService } from '@/modules/acceptance/acceptance.service';
import { TEST_REPORT_ARTIFACT_TYPE } from './adapters/cli-adapter.interface';

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
    private readonly contextBuilder: ContextBuilderService,
    private readonly trustService: TrustService,
    private readonly acceptanceService: AcceptanceService,
  ) {}

  /**
   * Dispatch a task to CLI for AI agent execution
   */
  async dispatchTaskToCli(
    taskId: string,
    userId: string,
    options: DispatchOptions = {},
  ): Promise<DispatchResult> {
    const { providerId, model, allowedTools, timeout, agentBindingId } =
      options;

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
        throw new NotFoundException(
          `Agent binding ${agentBindingId} not found`,
        );
      }

      // Provider from binding takes precedence
      if (binding.providerId && !providerId) {
        resolvedProviderId = binding.providerId as
          | 'claude-code'
          | 'codex'
          | 'zcode';
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
      taskId,
      projectId,
    );

    // 6.5 成员上下文：个人提示词 / 团队规则 / 思考强度；CLI 工具白名单收敛
    const memberContext = await this.buildMemberPromptContext(binding);
    let effectiveAllowedTools = allowedTools;
    if (binding?.subjectId) {
      const granted = await this.getGrantedCliTools(binding.subjectId);
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

    // 7. Create ExecutionRun
    const executionRunId = `exec_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const executionRun = await this.executionService.createExecutionRun({
      projectId,
      taskId,
      subjectType:
        (binding?.subjectType as
          | 'human'
          | 'platform_ai_member'
          | 'external_agent') || 'external_agent',
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
        allowedTools: effectiveAllowedTools,
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

    // 10. Resolve agent role for prompt injection
    const agentRole = binding
      ? await this.resolveAgentRole(binding.mappedRole, projectId)
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
      const run = await this.prisma.executionRun.findUnique({
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
   * 成员提示词上下文：binding.subjectId 指向 Member 时聚合
   * 个人提示词、思考强度与所在活跃团队的团队规则。
   */
  private async buildMemberPromptContext(
    binding: { subjectType: string; subjectId: string } | null,
  ): Promise<MemberPromptContext | null> {
    if (!binding) return null;
    const member = await this.prisma.member.findUnique({
      where: { id: binding.subjectId },
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

  /**
   * Resolve agent role definition from binding's mappedRole key.
   * Looks up ProjectRoleDefinition (project-specific first, then global fallback).
   */
  private async resolveAgentRole(
    mappedRole: string | null,
    projectId: string,
  ): Promise<{ name: string; role: string; promptHint: string } | null> {
    if (!mappedRole) return null;

    // Try project-specific role first
    const projectRole = await this.prisma.projectRoleDefinition.findFirst({
      where: { projectId, key: mappedRole },
    });
    if (projectRole?.promptHint) {
      return {
        name: projectRole.name,
        role: projectRole.executionRole,
        promptHint: projectRole.promptHint,
      };
    }

    // Fall back to global role
    const globalRole = await this.prisma.projectRoleDefinition.findFirst({
      where: { projectId: null, key: mappedRole },
    });
    if (globalRole?.promptHint) {
      return {
        name: globalRole.name,
        role: globalRole.executionRole,
        promptHint: globalRole.promptHint,
      };
    }

    return null;
  }
}
