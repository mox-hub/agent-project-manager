import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import {
  streamText,
  stepCountIs,
  type LanguageModel,
  type ModelMessage,
} from 'ai';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { aiChatLog } from '../../core/logger/ai-chat-file.logger';
import { ModelAdapter } from './adapters/model-adapter.interface';
import { ContextBuilderService } from './services/context-builder.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { AssistantToolsService } from './services/assistant-tools.service';
import { UsagePricingService } from './services/usage-pricing.service';
import {
  extractMessagePlainText,
  isUiMessageRunning,
} from './utils/ui-message-text';
import { ChatRequestDto } from './dto/chat.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { UsageQueryDto } from './dto/usage-query.dto';

@Injectable()
export class AiHubService {
  private readonly logger = new Logger(AiHubService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly adapterRegistry: AdapterRegistryService,
    private readonly assistantTools: AssistantToolsService,
    private readonly usagePricing: UsagePricingService,
  ) {}

  private getAdapter(modelPreference?: string): ModelAdapter {
    if (modelPreference) {
      // Try to find by model name first
      const adapter = this.adapterRegistry.getAdapterByModel(modelPreference);
      if (adapter) {
        return adapter;
      }
      // 再按 provider 名匹配（llm:<provider> 形式的模型选择）
      const byProvider = this.adapterRegistry.getAdapter(modelPreference);
      if (byProvider) {
        return byProvider;
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
      issueId,
      conversationId,
      message,
      contextHints,
      modelPreference,
      systemInstruction,
      enableTools,
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
          issueId: issueId || null,
          createdBy: userId,
          title: message.content.substring(0, 50) || 'New Conversation',
        },
      });
    }

    // Save user message
    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message.content,
      },
    });

    // Build context
    const context = await this.contextBuilder.buildContext({
      projectId,
      issueId,
      includeProjectSummary: contextHints?.includeProjectSummary,
      includeTaskDetails: contextHints?.includeTaskDetails,
      includeRecentActivities: contextHints?.includeRecentActivities,
      includeGitDiff: contextHints?.includeGitDiff,
    });

    // @ 提及成员：注入卡片摘要 + 个人提示词，并落 Mention 记录
    const mentionContext = await this.buildMentionContext(
      message.content,
      conversation.id,
    );

    // Build messages for AI
    const historyMessages = await this.prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20, // Limit history
    });

    const systemContext = [
      systemInstruction,
      this.contextBuilder.formatContextForPrompt(context),
      mentionContext,
    ]
      .filter(Boolean)
      .join('\n\n');
    // AI SDK v7：messages 中不允许 system 消息，系统提示走 streamText 的 instructions 选项
    const aiMessages = historyMessages
      .filter((m) => m.role !== 'system' && !isUiMessageRunning(m))
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: extractMessagePlainText(m),
      }))
      .filter((m) => m.content.length > 0);

    // Get adapter
    const adapter = this.getAdapter(modelPreference);
    const modelName = adapter.getModelName();
    const languageModel = adapter.getModel() as LanguageModel | null;
    if (!languageModel) {
      throw new BadRequestException(
        '当前 provider 适配器不支持流式对话（缺少模型实例）',
      );
    }

    // Stream response（UI Message Stream：chunk 直达前端，onEnd 拿到完整 UIMessage）
    const messageId = randomUUID();
    let finalUiMessage: unknown;
    const startedAt = Date.now();

    // 控制台只留关键事件；完整 prompt/chunk/终文进 logs/ai-chat.log
    this.logger.log(
      `AI chat start: ${adapter.getProvider()}/${modelName} conv=${conversation.id}`,
    );
    aiChatLog({
      phase: 'request',
      source: 'llm',
      conversationId: conversation.id,
      messageId,
      userId,
      provider: adapter.getProvider(),
      model: modelName,
      instructions: systemContext || undefined,
      messages: aiMessages,
    });

    try {
      const result = streamText({
        model: languageModel,
        instructions: systemContext || undefined,
        messages: aiMessages as ModelMessage[],
        temperature: 0.7,
        // 主助手可开启系统工具循环（服务端代查库/出卡；userId 为写操作执行者）
        ...(enableTools
          ? {
              tools: this.assistantTools.buildTools({ projectId, userId }),
              stopWhen: stepCountIs(5),
            }
          : {}),
      });

      const uiStream = result.toUIMessageStream({
        generateMessageId: () => messageId,
        messageMetadata: ({ part }) =>
          part.type === 'start' || part.type === 'finish'
            ? { modelId: modelName }
            : undefined,
        onError: (error) => {
          this.logger.error('Chat stream error', error);
          aiChatLog({
            phase: 'error',
            source: 'llm',
            conversationId: conversation.id,
            messageId,
            error: error instanceof Error ? error.message : String(error),
          });
          return 'AI 流式响应失败，请稍后重试';
        },
        onEnd: ({ responseMessage }) => {
          finalUiMessage = responseMessage;
        },
      });

      for await (const chunk of uiStream) {
        aiChatLog({
          phase: 'chunk',
          source: 'llm',
          conversationId: conversation.id,
          messageId,
          chunk,
        });
        // Emit stream event（带 userId 供网关定向推送，避免全局广播）
        this.messageBus.publish('ai.stream', {
          conversationId: conversation.id,
          messageId,
          chunk,
          userId,
        });
      }

      const [fullContent, usage, steps] = await Promise.all([
        result.text,
        result.usage,
        result.steps,
      ]);
      // 多步工具循环时聚合各步用量（stepCountIs(5) 下 usage 仅反映部分供应商的累计口径）
      let fullUsage = usage;
      if (steps.length > 1) {
        const summed = steps.reduce(
          (acc, step) => ({
            inputTokens: acc.inputTokens + (step.usage?.inputTokens ?? 0),
            outputTokens: acc.outputTokens + (step.usage?.outputTokens ?? 0),
            totalTokens: acc.totalTokens + (step.usage?.totalTokens ?? 0),
          }),
          { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        );
        if (summed.totalTokens > (fullUsage?.totalTokens ?? 0)) {
          fullUsage = { ...fullUsage, ...summed };
        }
      }
      const durationMs = Date.now() - startedAt;

      this.logger.log(
        `AI chat done: conv=${conversation.id} chars=${fullContent.length} tokens=${usage?.totalTokens ?? 0} ${durationMs}ms`,
      );
      aiChatLog({
        phase: 'final',
        source: 'llm',
        conversationId: conversation.id,
        messageId,
        userId,
        provider: adapter.getProvider(),
        model: modelName,
        text: fullContent,
        usage,
        durationMs,
      });

      // Save assistant message：UIMessage JSON 存 content，纯文本由前端从 parts 提取
      const persisted = (finalUiMessage as
        { id: string; role: string; parts: unknown[] } | undefined) ?? {
        id: messageId,
        role: 'assistant',
        parts: [{ type: 'text', text: fullContent }],
      };
      const assistantMessage = await this.prisma.aIMessage.create({
        data: {
          id: messageId,
          conversationId: conversation.id,
          role: 'assistant',
          content: JSON.stringify(persisted),
          modelName,
          tokens: fullUsage?.totalTokens ?? null,
          metadata: { format: 'ui-message', model: modelName },
        },
      });

      // usage 落库（含成本估算与步级聚合）
      try {
        const estimatedCost = await this.usagePricing.estimateCostUsd({
          modelName,
          provider: adapter.getProvider(),
          promptTokens: fullUsage?.inputTokens ?? 0,
          completionTokens: fullUsage?.outputTokens ?? 0,
        });
        await this.prisma.aIUsageLog.create({
          data: {
            userId,
            projectId: projectId ?? null,
            issueId: issueId ?? null,
            conversationId: conversation.id,
            modelName,
            provider: adapter.getProvider(),
            promptTokens: fullUsage?.inputTokens ?? 0,
            completionTokens: fullUsage?.outputTokens ?? 0,
            totalTokens: fullUsage?.totalTokens ?? 0,
            estimatedCost,
            responseMetadata: { durationMs } as Prisma.InputJsonValue,
          },
        });
      } catch (usageError) {
        this.logger.warn(
          `Failed to write AI usage log: ${usageError instanceof Error ? usageError.message : String(usageError)}`,
        );
      }

      // Update conversation
      await this.prisma.aIConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return {
        conversationId: conversation.id,
        mode: 'sync' as const,
        message: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: fullContent,
          modelName: assistantMessage.modelName,
        },
      };
    } catch (error) {
      this.logger.error('Chat error', error);
      aiChatLog({
        phase: 'error',
        source: 'llm',
        conversationId: conversation.id,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException(`AI chat failed: ${error.message}`);
    }
  }

  /**
   * 解析消息中被 @ 提及的成员，注入其摘要与个人提示词到系统上下文，
   * 并写入 Mention 记录（sourceType=comment, sourceId=会话 id）。
   */
  private async buildMentionContext(
    content: string,
    conversationId: string,
  ): Promise<string> {
    const handles = [
      ...new Set(
        [...content.matchAll(/@([a-zA-Z0-9_\-.]+)/g)].map((m) => m[1]),
      ),
    ];
    if (handles.length === 0) return '';

    const members = await this.prisma.member.findMany({
      where: { handle: { in: handles }, status: { not: 'inactive' } },
    });
    if (members.length === 0) return '';

    try {
      // SQLite 不支持 skipDuplicates，先查已存在的再增量写入
      const existing = await this.prisma.mention.findMany({
        where: { sourceType: 'comment', sourceId: conversationId },
        select: { memberId: true },
      });
      const existingIds = new Set(existing.map((e) => e.memberId));
      const toCreate = members.filter((m) => !existingIds.has(m.id));
      if (toCreate.length > 0) {
        await this.prisma.mention.createMany({
          data: toCreate.map((m) => ({
            memberId: m.id,
            sourceType: 'comment',
            sourceId: conversationId,
            content: `@${m.handle}`,
          })),
        });
      }
    } catch (e) {
      this.logger.warn(`mention createMany failed: ${(e as Error).message}`);
    }

    const blocks = members.map((m) => {
      const lines = [
        `- ${m.displayName} (@${m.handle}${m.title ? `，${m.title}` : ''})${m.type === 'ai_agent' ? ' [AI 成员]' : ''}`,
      ];
      if (m.description) lines.push(`  背景：${m.description}`);
      if (m.personalPrompt?.trim()) {
        lines.push(`  行为指令：${m.personalPrompt.trim()}`);
      }
      return lines.join('\n');
    });

    return `## Mentioned Members\n以下成员被 @ 提及，请在其能力与行为指令约束下回应：\n${blocks.join('\n')}`;
  }

  async getConversations(query: ConversationQueryDto, userId: string) {
    const { projectId, issueId, q, from, to, page = 1, pageSize = 20 } = query;

    const where: any = {
      createdBy: userId,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (issueId) {
      where.issueId = issueId;
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
        issue: {
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
      take: 5000,
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

    // 按日聚合（近 30 天有用量记录的日期）
    const byDayMap = new Map<string, { tokens: number; cost: number }>();
    for (const log of logs) {
      const created = new Date(log.createdAt);
      if (Number.isNaN(created.getTime())) continue;
      const day = created.toISOString().slice(0, 10);
      const entry = byDayMap.get(day) ?? { tokens: 0, cost: 0 };
      entry.tokens += log.totalTokens;
      entry.cost += log.estimatedCost || 0;
      byDayMap.set(day, entry);
    }
    const byDay = [...byDayMap.entries()]
      .map(([day, v]) => ({ day, totalTokens: v.tokens, totalCost: v.cost }))
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 30);

    return {
      totalTokens,
      totalCost,
      byModel: Object.values(byModel),
      byDay,
    };
  }
}
