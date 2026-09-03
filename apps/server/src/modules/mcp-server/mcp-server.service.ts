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
import { randomUUID } from 'crypto';
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

interface SseSessionEntry {
  sessionId: string;
  userId: string | null;
  createdAt: Date;
  lastSeenAt: Date;
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
   */
  createServerForSession(): Server {
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

    this.registerToolsOnServer(server);
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
   */
  createSession(userId: string | null): SseSessionEntry {
    const sessionId = `mcp_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const now = new Date();
    const entry: SseSessionEntry = {
      sessionId,
      userId,
      createdAt: now,
      lastSeenAt: now,
    };
    this.sessions.set(sessionId, entry);
    this.logger.log(`MCP SSE session created: ${sessionId} (user=${userId})`);
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

  private registerToolsOnServer(server: Server) {
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
                taskId: { type: 'string', description: 'Task ID' },
              },
              required: ['taskId'],
            },
          },
          {
            name: 'claim_task',
            description: 'Claim a task for AI execution',
            inputSchema: {
              type: 'object',
              properties: {
                taskId: { type: 'string', description: 'Task ID' },
                agentId: {
                  type: 'string',
                  description: 'Agent ID to claim for',
                },
              },
              required: ['taskId'],
            },
          },
          {
            name: 'update_task_status',
            description: 'Update task status',
            inputSchema: {
              type: 'object',
              properties: {
                taskId: { type: 'string', description: 'Task ID' },
                status: { type: 'string', description: 'New status' },
                comment: { type: 'string', description: 'Optional comment' },
              },
              required: ['taskId', 'status'],
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
                taskId: { type: 'string', description: 'Task ID' },
                providerId: {
                  type: 'string',
                  enum: ['claude-code', 'codex', 'zcode'],
                  description: 'CLI provider',
                },
                model: { type: 'string', description: 'Model to use' },
              },
              required: ['taskId'],
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
              'List locally available CLI providers (Claude Code / Codex / ZCode) with status and DB overrides',
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
                  enum: ['claude-code', 'codex', 'zcode'],
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
                  enum: ['claude-code', 'codex', 'zcode'],
                },
              },
              required: ['providerId'],
            },
          },
        ],
      };
    });

    // Call tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args = {} } = request.params;

      try {
        switch (name) {
          case 'list_tasks':
            return await this.listTasks(args);

          case 'get_task_context':
            return await this.getTaskContext(args);

          case 'claim_task':
            return await this.claimTask(args);

          case 'update_task_status':
            return await this.updateTaskStatus(args);

          case 'submit_task_result':
            return await this.submitTaskResult(args);

          case 'request_approval':
            return await this.requestApproval(args);

          case 'dispatch_task_to_cli':
            return await this.dispatchToCli(args);

          case 'get_context':
            return await this.getContext(args);

          // ─── New runtime tools ──────────────────────────────────
          case 'get_cli_providers':
            return await this.getCliProvidersTool(args);

          case 'configure_cli_provider':
            return await this.configureCliProviderTool(args);

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

  private async configureCliProviderTool(args: {
    providerId: 'claude-code' | 'codex' | 'zcode';
    displayName?: string;
    commandPath?: string;
    model?: string;
    env?: Record<string, string>;
    allowedTools?: string[];
    enabled?: boolean;
  }) {
    if (!args.providerId) {
      throw new BadRequestException('providerId is required');
    }
    const updated = await this.cliProviderService.configureProvider(
      args.providerId,
      args,
    );
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
    providerId: 'claude-code' | 'codex' | 'zcode';
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
    const tasks = await this.prisma.task.findMany({
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

  private async getTaskContext(args: { taskId: string }) {
    const task = await this.prisma.task.findUnique({
      where: { id: args.taskId },
      include: {
        project: true,
        assignee: true,
        taskTags: { include: { tag: true } },
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

  private async claimTask(args: { taskId: string; agentId?: string }) {
    await this.prisma.task.update({
      where: { id: args.taskId },
      data: {
        aiAgentId: args.agentId || 'mcp-agent',
        assigneeType: 'ai_agent',
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Task ${args.taskId} claimed successfully`,
        },
      ],
    };
  }

  private async updateTaskStatus(args: {
    taskId: string;
    status: string;
    comment?: string;
  }) {
    await this.prisma.task.update({
      where: { id: args.taskId },
      data: { status: args.status },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Task ${args.taskId} status updated to ${args.status}`,
        },
      ],
    };
  }

  private async submitTaskResult(args: {
    executionRunId: string;
    result: string;
    artifacts?: string[];
  }) {
    await this.executionService.completeExecution(args.executionRunId, {
      summary: args.result,
      artifacts: args.artifacts || [],
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

  private async requestApproval(args: {
    executionRunId: string;
    action: string;
    reason?: string;
    riskLevel?: string;
  }) {
    const execution = await this.prisma.executionRun.findUnique({
      where: { id: args.executionRunId },
    });

    if (!execution) {
      throw new Error(`Execution ${args.executionRunId} not found`);
    }

    const approval = await this.approvalService.createApprovalRequest({
      executionRunId: args.executionRunId,
      projectId: execution.projectId,
      taskId: execution.taskId || undefined,
      requestedAction: args.action,
      actionType: 'tool_call',
      riskLevel: (args.riskLevel as 'read' | 'write' | 'high_risk') || 'write',
      reason: args.reason,
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

  private async dispatchToCli(args: {
    taskId: string;
    providerId?: string;
    model?: string;
  }) {
    const result = await this.cliDispatch.dispatchTaskToCli(
      args.taskId,
      'mcp-agent',
      {
        providerId: args.providerId as
          'claude-code' | 'codex' | 'zcode' | undefined,
        model: args.model,
      },
    );

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
        const task = await this.prisma.task.findUnique({
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
