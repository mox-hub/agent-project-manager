import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { ModelAdapter } from './adapters/model-adapter.interface';
import { ContextBuilderService } from './services/context-builder.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { RunWorkflowDto } from './dto/workflow-run.dto';
import { UsageQueryDto } from './dto/usage-query.dto';
import { CreateAgentIdentityDto } from './dto/agent-identity.dto';

@Injectable()
export class AiHubService {
  private readonly logger = new Logger(AiHubService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly adapterRegistry: AdapterRegistryService,
  ) {}

  private getAdapter(modelPreference?: string): ModelAdapter {
    if (modelPreference) {
      // Try to find by model name first
      const adapter = this.adapterRegistry.getAdapterByModel(modelPreference);
      if (adapter) {
        return adapter;
      }
    }

    // Default to first available provider (prefer openai)
    const providers = this.adapterRegistry.getLoadedProviders();
    if (providers.length === 0) {
      throw new BadRequestException(
        'No AI provider configured. Please configure an API key in AI Settings.',
      );
    }

    // Prefer openai if available
    const provider = providers.includes('openai') ? 'openai' : providers[0];
    const adapter = this.adapterRegistry.getAdapter(provider);

    if (!adapter) {
      throw new BadRequestException('No AI provider adapter available');
    }

    return adapter;
  }

  async chat(chatDto: ChatRequestDto, userId: string) {
    const {
      projectId,
      taskId,
      conversationId,
      message,
      contextHints,
      modelPreference,
    } = chatDto;

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await this.prisma.aIConversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      // Verify access
      if (conversation.createdBy !== userId) {
        throw new BadRequestException('Access denied');
      }
    } else {
      // Create new conversation
      conversation = await this.prisma.aIConversation.create({
        data: {
          projectId: projectId || null,
          taskId: taskId || null,
          createdBy: userId,
          title: message.content.substring(0, 50) || 'New Conversation',
        },
      });
    }

    // Save user message
    const userMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message.content,
      },
    });

    // Build context
    const context = await this.contextBuilder.buildContext({
      projectId,
      taskId,
      includeProjectSummary: contextHints?.includeProjectSummary,
      includeTaskDetails: contextHints?.includeTaskDetails,
      includeRecentActivities: contextHints?.includeRecentActivities,
      includeGitDiff: contextHints?.includeGitDiff,
    });

    // Build messages for AI
    const historyMessages = await this.prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20, // Limit history
    });

    const systemContext = this.contextBuilder.formatContextForPrompt(context);
    const aiMessages = [
      ...(systemContext
        ? [{ role: 'system' as const, content: systemContext }]
        : []),
      ...historyMessages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];

    // Get adapter
    const adapter = this.getAdapter(modelPreference);
    const modelName = adapter.getModelName();

    // Stream response
    let fullContent = '';
    const messageId = `msg_${Date.now()}`;

    try {
      for await (const chunk of adapter.chatStream(aiMessages)) {
        fullContent += chunk;
        // Emit stream event
        this.messageBus.publish('ai.stream', {
          conversationId: conversation.id,
          messageId,
          chunk,
          isFinal: false,
        });
      }

      // Emit final event
      this.messageBus.publish('ai.stream', {
        conversationId: conversation.id,
        messageId,
        chunk: '',
        isFinal: true,
      });

      // Save assistant message
      const assistantMessage = await this.prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: fullContent,
          modelName,
        },
      });

      // Update conversation
      await this.prisma.aIConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return {
        conversationId: conversation.id,
        message: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          modelName: assistantMessage.modelName,
        },
      };
    } catch (error) {
      this.logger.error('Chat error', error);
      throw new BadRequestException(`AI chat failed: ${error.message}`);
    }
  }

  async getConversations(query: ConversationQueryDto, userId: string) {
    const { projectId, taskId, q, from, to, page = 1, pageSize = 20 } = query;

    const where: any = {
      createdBy: userId,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (taskId) {
      where.taskId = taskId;
    }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { messages: { some: { content: { contains: q } } } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    const [conversations, total] = await Promise.all([
      this.prisma.aIConversation.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      this.prisma.aIConversation.count({ where }),
    ]);

    return {
      data: conversations,
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };
  }

  async getConversation(id: string, userId: string) {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.createdBy !== userId) {
      throw new BadRequestException('Access denied');
    }

    return conversation;
  }

  async runWorkflow(
    workflowId: string,
    runDto: RunWorkflowDto,
    userId: string,
  ) {
    const workflow = await this.prisma.aIWorkflowDefinition.findUnique({
      where: { key: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const workflowRun = await this.prisma.aIWorkflowRun.create({
      data: {
        workflowId: workflow.id,
        projectId: runDto.projectId || null,
        taskId: runDto.taskId || null,
        triggerType: runDto.triggerType || 'manual',
        status: 'pending',
        input: runDto.parameters || {},
        createdBy: userId,
      },
    });

    // Emit workflow update event
    this.messageBus.publish('ai.workflow.update', {
      workflowRunId: workflowRun.id,
      status: 'pending',
    });

    // TODO: Execute workflow asynchronously
    // For now, just mark as running
    setTimeout(async () => {
      await this.prisma.aIWorkflowRun.update({
        where: { id: workflowRun.id },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      });

      this.messageBus.publish('ai.workflow.update', {
        workflowRunId: workflowRun.id,
        status: 'running',
      });

      // Simulate workflow completion
      setTimeout(async () => {
        await this.prisma.aIWorkflowRun.update({
          where: { id: workflowRun.id },
          data: {
            status: 'succeeded',
            finishedAt: new Date(),
            output: { message: 'Workflow completed (mock)' },
          },
        });

        this.messageBus.publish('ai.workflow.update', {
          workflowRunId: workflowRun.id,
          status: 'succeeded',
        });
      }, 2000);
    }, 100);

    return {
      workflowRunId: workflowRun.id,
      status: workflowRun.status,
    };
  }

  async getWorkflows() {
    const workflows = await this.prisma.aIWorkflowDefinition.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return workflows.map((w) => ({
      id: w.id,
      key: w.key,
      name: w.name,
      description: w.description,
      version: w.version,
    }));
  }

  async getWorkflow(id: string) {
    const workflow = await this.prisma.aIWorkflowDefinition.findUnique({
      where: { id },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async getWorkflowRuns(query: {
    workflowId?: string;
    projectId?: string;
    taskId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      workflowId,
      projectId,
      taskId,
      status,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {};
    if (workflowId) {
      const workflow = await this.prisma.aIWorkflowDefinition.findUnique({
        where: { id: workflowId },
      });
      if (workflow) {
        where.workflowId = workflow.id;
      }
    }
    if (projectId) where.projectId = projectId;
    if (taskId) where.taskId = taskId;
    if (status) where.status = status;

    const [runs, total] = await Promise.all([
      this.prisma.aIWorkflowRun.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          workflow: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.aIWorkflowRun.count({ where }),
    ]);

    return {
      data: runs,
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };
  }

  async getModels(provider?: string) {
    // 从数据库获取模型配置
    const dbModels = await this.prisma.aIModelConfig.findMany({
      where: { enabled: true, ...(provider ? { provider } : {}) },
    });

    // 从已注册的适配器获取模型
    const adapterModels = this.adapterRegistry
      .listAdapters()
      .map((adapterInfo) => ({
        id: `${adapterInfo.provider}_${adapterInfo.model}`,
        name: adapterInfo.model,
        provider: adapterInfo.provider,
        taskTypes: null,
        maxTokens: null,
        enabled: true,
      }));

    return [...dbModels, ...adapterModels];
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  async getAgents(projectId?: string) {
    return this.prisma.agentIdentity.findMany({
      where: projectId
        ? {
            OR: [{ projectId }, { projectId: null }],
          }
        : undefined,
      orderBy: [{ projectId: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createAgent(dto: CreateAgentIdentityDto, userId: string) {
    if (dto.projectId) {
      const membership = await this.prisma.projectMember.findFirst({
        where: {
          projectId: dto.projectId,
          userId,
          role: { in: ['owner', 'maintainer'] },
        },
      });

      if (!membership) {
        throw new BadRequestException(
          'Only owner or maintainer can create project-scoped AI agents',
        );
      }
    }

    return this.prisma.agentIdentity.create({
      data: {
        projectId: dto.projectId || null,
        name: dto.name,
        type: dto.type || 'ai_employee',
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        toolPolicy: dto.toolPolicy
          ? this.toJsonValue(dto.toolPolicy)
          : undefined,
        metadata: dto.metadata ? this.toJsonValue(dto.metadata) : undefined,
        createdBy: userId,
      },
    });
  }

  async getUsage(query: UsageQueryDto) {
    const { userId, projectId, modelName, from, to } = query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (projectId) where.projectId = projectId;
    if (modelName) where.modelName = modelName;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const logs = await this.prisma.aIUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
    const totalCost = logs.reduce(
      (sum, log) => sum + (log.estimatedCost || 0),
      0,
    );

    const byModel = logs.reduce(
      (acc, log) => {
        if (!acc[log.modelName]) {
          acc[log.modelName] = {
            modelName: log.modelName,
            totalTokens: 0,
            totalCost: 0,
          };
        }
        acc[log.modelName].totalTokens += log.totalTokens;
        acc[log.modelName].totalCost += log.estimatedCost || 0;
        return acc;
      },
      {} as Record<
        string,
        { modelName: string; totalTokens: number; totalCost: number }
      >,
    );

    return {
      totalTokens,
      totalCost,
      byModel: Object.values(byModel),
    };
  }
}
