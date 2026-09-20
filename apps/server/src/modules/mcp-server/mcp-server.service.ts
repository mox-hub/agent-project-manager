/**
 * MCP Server Service
 * 使用 @modelcontextprotocol/sdk 实现 MCP Server (SSE transport)
 *
 * Architecture:
 * - 持有 1 个共享 Server 实例（注册工具一次）
 * - 通过 McpSseSessionRegistry 管理多个 SSEServerTransport 实例
 * - 每个 SSE 连接 = 1 个 transport = 1 个 session
 *
 * SDK version: @modelcontextprotocol/sdk@^1.0.0 (实测 1.27.1)
 * - SSEServerTransport 在 1.27.1 已标记 @deprecated，下一里程碑迁移到
 *   StreamableHTTPServerTransport。
 * - 但 API 完全可用，且当前部署以 SSE 为主，先用 SSE。
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ExecutionService } from '@/modules/execution/execution.service';
import { ApprovalService } from '@/modules/execution/approval.service';
import { CliDispatchService } from '@/modules/cli-dispatch/dispatch.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { PrismaService } from '@/core/database/prisma.service';
import { CliProviderService } from '@/modules/cli-provider/cli-provider.service';
import { AuditService } from '@/core/audit';

interface SseSessionEntry {
  sessionId: string;
  userId: string | null;
  /** 建连时校验通过的 token SHA-256：消息上行时做零成本比对（不重复查库） */
  tokenHash: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

/** 工具执行上下文：来自 PAT 解析的操作归因 */
export interface McpToolContext {
  userId: string | null;
}

export function hashMcpToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class McpServerService implements OnModuleInit {
  private readonly logger = new Logger(McpServerService.name);
  private server: Server | null = null;
  private readonly sessions = new Map<string, SseSessionEntry>();
  private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

  constructor(
    private readonly executionService: ExecutionService,
    private readonly approvalService: ApprovalService,
    private readonly cliDispatch: CliDispatchService,
    private readonly messageBus: MessageBusService,
    private readonly prisma: PrismaService,
    private readonly cliProviderService: CliProviderService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit() {
    // 【注意】服务端不在 onModuleInit 时初始化 Server
    // 原因：SDK Server.connect() 只能连接一个 transport；
    // 每个 SSE 连接需要独立的 Server 实例（共享同一份工具定义）
    // 工具定义在 registerToolsOnServer() 中复用。

    // 定时清理过期 session
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * 为单个 SSE 连接创建一个独立的 McpServer 实例（共享工具定义）
   * userId：PAT 校验出的操作者，用于工具执行归因/审计
   */
  createServerForSession(userId: string | null = null): Server {
    const server = new Server(
      {
        name: 'apm-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );

    this.registerToolsOnServer(server, userId);
    return server;
  }

  private cleanupExpiredSessions() {
    const now = Date.now();
    let removed = 0;
    for (const [id, entry] of this.sessions.entries()) {
      if (now - entry.lastSeenAt.getTime() > this.SESSION_TTL_MS) {
        this.sessions.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.log(`Cleaned up ${removed} expired MCP SSE sessions`);
    }
  }

  // ─── Session 管理（供 Controller 调用）───────────────────────

  /**
   * 创建新的 SSE session（client 调 GET /mcp/sse 时调用）
   * tokenHash：已通过 AccessTokenService 校验的 token 摘要，供消息上行时比对
   */
  createSession(
    userId: string | null,
    tokenHash: string | null = null,
  ): SseSessionEntry {
    const sessionId = `mcp_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const now = new Date();
    const entry: SseSessionEntry = {
      sessionId,
      userId,
      tokenHash,
      createdAt: now,
      lastSeenAt: now,
    };
    this.sessions.set(sessionId, entry);
    this.logger.log(`MCP SSE session created: ${sessionId} (user=${userId})`);
    return entry;
  }

  /**
   * 复用已有 session 时重新绑定身份：换 token 重连（如 PAT 轮换）后
   * 会话归因与消息校验都随新 token 走；session 不存在返回 null
   */
  bindSession(
    sessionId: string,
    userId: string | null,
    tokenHash: string | null,
  ): SseSessionEntry | null {
    const entry = this.validateSession(sessionId);
    if (!entry) return null;
    entry.userId = userId;
    entry.tokenHash = tokenHash;
    return entry;
  }

  /**
   * 校验 session 是否存在；存在则刷新 lastSeenAt
   */
  validateSession(sessionId: string): SseSessionEntry | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    entry.lastSeenAt = new Date();
    return entry;
  }

  /**
   * 移除 session（连接关闭时调用）
   */
  removeSession(sessionId: string) {
    if (this.sessions.delete(sessionId)) {
      this.logger.log(`MCP SSE session removed: ${sessionId}`);
    }
  }

  /**
   * 当前活跃 session 数
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 【已废弃】之前为单 Server 模式保留，现每个 session 独立 Server
   * @deprecated use createServerForSession() instead
   */
  getServer(): Server | null {
    return this.server;
  }

  private registerToolsOnServer(server: Server, userId: string | null) {
    // List tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_tasks',
            description: 'List all tasks for a project',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: { type: 'string', description: 'Project ID' },
                status: { type: 'string', description: 'Filter by status' },
                assigneeId: {
                  type: 'string',
                  description: 'Filter by assignee',
                },
              },
              required: ['projectId'],
            },
          },
          {
            name: 'get_task_context',
            description: 'Get detailed context for a task',
            inputSchema: {
              type: 'object',
              properties: {
                issueId: { type: 'string', description: 'Task ID' },
              },
              required: ['issueId'],
            },
          },
          {
            name: 'claim_task',
            description: 'Claim a task for AI execution',
            inputSchema: {
              type: 'object',
              properties: {
                issueId: { type: 'string', description: 'Task ID' },
                agentId: {
                  type: 'string',
                  description: 'Agent ID to claim for',
                },
              },
              required: ['issueId'],
            },
          },
          {
            name: 'update_task_status',
            description: 'Update task status',
            inputSchema: {
              type: 'object',
              properties: {
                issueId: { type: 'string', description: 'Task ID' },
                status: { type: 'string', description: 'New status' },
                comment: { type: 'string', description: 'Optional comment' },
              },
              required: ['issueId', 'status'],
            },
          },
          {
            name: 'submit_task_result',
            description: 'Submit execution result for a task',
            inputSchema: {
              type: 'object',
              properties: {
                executionRunId: {
                  type: 'string',
                  description: 'Execution Run ID',
                },
                result: {
                  type: 'string',
                  description: 'Execution result summary',
                },
                artifacts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of artifact references',
                },
              },
              required: ['executionRunId', 'result'],
            },
          },
          {
            name: 'request_approval',
            description: 'Request human approval for an action',
            inputSchema: {
              type: 'object',
              properties: {
                executionRunId: {
                  type: 'string',
                  description: 'Execution Run ID',
                },
                action: {
                  type: 'string',
                  description: 'Action requiring approval',
                },
                reason: {
                  type: 'string',
                  description: 'Reason for the action',
                },
                riskLevel: {
                  type: 'string',
                  enum: ['read', 'write', 'high_risk'],
                  description: 'Risk level of the action',
                },
              },
              required: ['executionRunId', 'action'],
            },
          },
          {
            name: 'dispatch_task_to_cli',
            description: 'Dispatch a task to CLI for AI execution',
            inputSchema: {
              type: 'object',
              properties: {
                issueId: { type: 'string', description: 'Task ID' },
                providerId: {
                  type: 'string',
                  enum: ['claude-code', 'codex', 'zcode', 'opencode'],
                  description: 'CLI provider',
                },
                model: { type: 'string', description: 'Model to use' },
                executionId: {
                  type: 'string',
                  description:
                    'Optional existing Execution id to bind (no new execution created)',
                },
              },
              required: ['issueId'],
            },
          },
          {
            name: 'get_context',
            description: 'Get project or task context data',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['project', 'task', 'team'],
                  description: 'Context type',
                },
                id: { type: 'string', description: 'Resource ID' },
              },
              required: ['type', 'id'],
            },
          },
          // ─── New runtime tools (V3 Addon) ──────────────────────
          {
            name: 'get_cli_providers',
            description:
              'List locally available CLI providers (Claude Code / Codex / ZCode / OpenCode) with status and DB overrides',
            inputSchema: {
              type: 'object',
              properties: {
                forceRefresh: {
                  type: 'boolean',
                  description: 'Force re-detection on the server',
                  default: false,
                },
              },
            },
          },
          {
            name: 'configure_cli_provider',
            description:
              'Configure a CLI provider (commandPath / model / env / allowedTools / enabled)',
            inputSchema: {
              type: 'object',
              properties: {
                providerId: {
                  type: 'string',
                  enum: ['claude-code', 'codex', 'zcode', 'opencode'],
                  description: 'CLI provider',
                },
                displayName: { type: 'string' },
                commandPath: {
                  type: 'string',
                  description: 'Custom binary path (empty = PATH lookup)',
                },
                model: { type: 'string' },
                env: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                  description: 'Environment variables to inject',
                },
                allowedTools: {
                  type: 'array',
                  items: { type: 'string' },
                },
                enabled: { type: 'boolean' },
              },
              required: ['providerId'],
            },
          },
          {
            name: 'health_check_cli_provider',
            description:
              'Run a real-time health check on a CLI provider (binary detect + version)',
            inputSchema: {
              type: 'object',
              properties: {
                providerId: {
                  type: 'string',
                  enum: ['claude-code', 'codex', 'zcode', 'opencode'],
                },
              },
              required: ['providerId'],
            },
          },
        ],
      };
    });

    // Call tool handler
    // ctx：PAT 解析出的操作者身份（P0-6 止血：操作可归因）
    const ctx: McpToolContext = { userId };
    server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args = {} } = request.params;

      try {
        switch (name) {
          case 'list_tasks':
            return await this.listTasks(args);

          case 'get_task_context':
            return await this.getTaskContext(args);

          case 'claim_task':
            return await this.claimTask(ctx, args);

          case 'update_task_status':
            return await this.updateTaskStatus(ctx, args);

          case 'submit_task_result':
            return await this.submitTaskResult(ctx, args);

          case 'request_approval':
            return await this.requestApproval(ctx, args);

          case 'dispatch_task_to_cli':
            return await this.dispatchToCli(ctx, args);

          case 'get_context':
            return await this.getContext(args);

          // ─── New runtime tools ──────────────────────────────────
          case 'get_cli_providers':
            return await this.getCliProvidersTool(args);

          case 'configure_cli_provider':
            return await this.configureCliProviderTool(ctx, args);

          case 'health_check_cli_provider':
            return await this.healthCheckCliProviderTool(args);

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `Unknown tool: ${name}`,
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        this.logger.error(`Tool ${name} failed: ${error}`);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // ─── New runtime tool implementations ────────────────────────────

  /**
   * 变更类工具的统一审计留痕（P0-6）：归因到 PAT 解析出的用户。
   * best-effort：审计失败只告警，不阻断工具调用本身。
   */
  private async auditToolCall(
    ctx: McpToolContext,
    input: {
      action: 'create' | 'update' | 'execute';
      resourceType: 'task' | 'execution_run' | 'approval_request' | 'system';
      resourceId: string;
      tool: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    try {
      await this.auditService.log({
        actorType: 'agent',
        actorId: ctx.userId ?? 'mcp-agent',
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        result: 'success',
        metadata: { via: 'mcp', tool: input.tool, ...input.metadata },
      });
    } catch (err) {
      this.logger.warn(
        `MCP audit log failed for ${input.tool}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async getCliProvidersTool(args: { forceRefresh?: boolean }) {
    if (args.forceRefresh) {
      await this.cliProviderService.detectAll();
    }
    const result = await this.cliProviderService.listProviders();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async configureCliProviderTool(
    ctx: McpToolContext,
    args: {
      providerId: 'claude-code' | 'codex' | 'zcode' | 'opencode';
      displayName?: string;
      commandPath?: string;
      model?: string;
      env?: Record<string, string>;
      allowedTools?: string[];
      enabled?: boolean;
    },
  ) {
    if (!args.providerId) {
      throw new BadRequestException('providerId is required');
    }
    const updated = await this.cliProviderService.configureProvider(
      args.providerId,
      args,
    );
    await this.auditToolCall(ctx, {
      action: 'update',
      resourceType: 'system',
      resourceId: args.providerId,
      tool: 'configure_cli_provider',
      metadata: {
        providerId: args.providerId,
        enabled: args.enabled,
        envKeys: args.env ? Object.keys(args.env) : [],
      },
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(updated, null, 2),
        },
      ],
    };
  }

  private async healthCheckCliProviderTool(args: {
    providerId: 'claude-code' | 'codex' | 'zcode' | 'opencode';
  }) {
    if (!args.providerId) {
      throw new BadRequestException('providerId is required');
    }
    const result = await this.cliProviderService.healthCheck(args.providerId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  // Tool implementations

  private async listTasks(args: {
    projectId: string;
    status?: string;
    assigneeId?: string;
  }) {
    const tasks = await this.prisma.issue.findMany({
      where: {
        projectId: args.projectId,
        ...(args.status && { status: args.status }),
        ...(args.assigneeId && { assigneeId: args.assigneeId }),
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  }

  private async getTaskContext(args: { issueId: string }) {
    const task = await this.prisma.issue.findUnique({
      where: { id: args.issueId },
      include: {
        project: true,
        assignee: true,
        issueTags: { include: { tag: true } },
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }

  /**
   * 解析并校验 claim/dispatch 的执行主体：
   * - 显式 agentId 必须是存在的 Member（id 或 shortId），否则报错——杜绝幽灵 ID；
   * - 未传时优先归因到 PAT 用户绑定的 Member，兜底保留旧占位 'mcp-agent'。
   */
  private async resolveAgentMemberId(
    ctx: McpToolContext,
    agentId?: string,
  ): Promise<string> {
    if (agentId) {
      const member = await this.prisma.member.findFirst({
        where: { OR: [{ id: agentId }, { shortId: agentId }] },
        select: { id: true },
      });
      if (!member) {
        throw new Error(`Agent member not found: ${agentId}`);
      }
      return member.id;
    }
    if (ctx.userId) {
      const selfMember = await this.prisma.member.findFirst({
        where: { userId: ctx.userId },
        select: { id: true },
      });
      if (selfMember) return selfMember.id;
    }
    return 'mcp-agent';
  }

  private async claimTask(
    ctx: McpToolContext,
    args: { issueId: string; agentId?: string },
  ) {
    // P0-6：先验实体——issue 不存在直接报 404 语义错误，
    // 而不是让 prisma.update 抛 P2025 内部错误
    const issue = await this.prisma.issue.findUnique({
      where: { id: args.issueId },
      select: { id: true },
    });
    if (!issue) {
      throw new Error(`Issue ${args.issueId} not found`);
    }

    const agentId = await this.resolveAgentMemberId(ctx, args.agentId);
    await this.prisma.issue.update({
      where: { id: args.issueId },
      data: {
        aiAgentId: agentId,
        assigneeType: 'ai_agent',
      },
    });
    await this.auditToolCall(ctx, {
      action: 'update',
      resourceType: 'task',
      resourceId: args.issueId,
      tool: 'claim_task',
      metadata: { agentId },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Task ${args.issueId} claimed successfully`,
        },
      ],
    };
  }

  private async updateTaskStatus(
    ctx: McpToolContext,
    args: {
      issueId: string;
      status: string;
      comment?: string;
    },
  ) {
    await this.prisma.issue.update({
      where: { id: args.issueId },
      data: { status: args.status },
    });
    await this.auditToolCall(ctx, {
      action: 'update',
      resourceType: 'task',
      resourceId: args.issueId,
      tool: 'update_task_status',
      metadata: { status: args.status },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Task ${args.issueId} status updated to ${args.status}`,
        },
      ],
    };
  }

  private async submitTaskResult(
    ctx: McpToolContext,
    args: {
      executionRunId: string;
      result: string;
      artifacts?: string[];
    },
  ) {
    await this.executionService.completeExecution(args.executionRunId, {
      summary: args.result,
      artifacts: args.artifacts || [],
    });
    await this.auditToolCall(ctx, {
      action: 'update',
      resourceType: 'execution_run',
      resourceId: args.executionRunId,
      tool: 'submit_task_result',
    });

    return {
      content: [
        {
          type: 'text',
          text: `Result submitted for execution ${args.executionRunId}`,
        },
      ],
    };
  }

  private async requestApproval(
    ctx: McpToolContext,
    args: {
      executionRunId: string;
      action: string;
      reason?: string;
      riskLevel?: string;
    },
  ) {
    const execution = await this.prisma.execution.findUnique({
      where: { id: args.executionRunId },
    });

    if (!execution) {
      throw new Error(`Execution ${args.executionRunId} not found`);
    }

    const approval = await this.approvalService.createApprovalRequest({
      executionRunId: args.executionRunId,
      projectId: execution.projectId,
      issueId: execution.issueId || undefined,
      requestedAction: args.action,
      actionType: 'tool_call',
      riskLevel: (args.riskLevel as 'read' | 'write' | 'high_risk') || 'write',
      reason: args.reason,
    });
    await this.auditToolCall(ctx, {
      action: 'create',
      resourceType: 'approval_request',
      resourceId: approval.id,
      tool: 'request_approval',
      metadata: { requestedAction: args.action },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Approval request ${approval.id} created`,
        },
      ],
    };
  }

  private async dispatchToCli(
    ctx: McpToolContext,
    args: {
      issueId: string;
      providerId?: string;
      model?: string;
      executionId?: string;
    },
  ) {
    const agentId = await this.resolveAgentMemberId(ctx);
    const result = await this.cliDispatch.dispatchTaskToCli(
      args.issueId,
      agentId,
      {
        providerId: args.providerId as
          'claude-code' | 'codex' | 'zcode' | 'opencode' | undefined,
        model: args.model,
        executionId: args.executionId,
      },
    );
    await this.auditToolCall(ctx, {
      action: 'execute',
      resourceType: 'task',
      resourceId: args.issueId,
      tool: 'dispatch_task_to_cli',
      metadata: { providerId: args.providerId, model: args.model },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async getContext(args: { type: string; id: string }) {
    switch (args.type) {
      case 'project': {
        const project = await this.prisma.project.findUnique({
          where: { id: args.id },
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case 'task': {
        const task = await this.prisma.issue.findUnique({
          where: { id: args.id },
          include: { project: true },
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown context type: ${args.type}`,
            },
          ],
          isError: true,
        };
    }
  }
}
