/**
 * MCP Server Service
 * 使用 @modelcontextprotocol/sdk 实现 MCP Server
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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

@Injectable()
export class McpServerService implements OnModuleInit {
  private readonly logger = new Logger(McpServerService.name);
  private server: Server | null = null;

  constructor(
    private readonly executionService: ExecutionService,
    private readonly approvalService: ApprovalService,
    private readonly cliDispatch: CliDispatchService,
    private readonly messageBus: MessageBusService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.initializeServer();
  }

  private async initializeServer() {
    try {
      this.server = new Server(
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

      this.registerTools();

      this.logger.log('MCP Server initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize MCP Server: ${error}`);
    }
  }

  private registerTools() {
    if (!this.server) return;

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
                assigneeId: { type: 'string', description: 'Filter by assignee' },
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
                agentId: { type: 'string', description: 'Agent ID to claim for' },
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
                executionRunId: { type: 'string', description: 'Execution Run ID' },
                result: { type: 'string', description: 'Execution result summary' },
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
                executionRunId: { type: 'string', description: 'Execution Run ID' },
                action: { type: 'string', description: 'Action requiring approval' },
                reason: { type: 'string', description: 'Reason for the action' },
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
        ],
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
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
    await this.executionService.completeExecution(
      args.executionRunId,
      { summary: args.result, artifacts: args.artifacts || [] },
    );

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
        providerId: args.providerId as 'claude-code' | 'codex' | 'zcode' | undefined,
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
