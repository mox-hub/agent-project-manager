/**
 * 主 AI 助手的 CLI 对话桥：监听 runtime 执行事件，把守护进程上报的
 * execution.token（正文借 summary 字段批量送达）与 runtime.execution.result
 * 转换为 ai.stream 的 UI Message Stream chunk 定向推给会话属主，
 * 并把累积正文落库为 UIMessage JSON（原位替换 sendViaRuntime 预建的
 * running 占位消息）。run 归属判定依据 ExecutionRun.input.source === 'assistant-chat'。
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { aiChatLog } from '../../core/logger/ai-chat-file.logger';

interface RuntimeExecutionEventPayload {
  eventType: string;
  executionRunId: string;
  status?: string;
  summary?: string;
  timestamp?: string;
}

interface RuntimeExecutionResultPayload {
  executionRunId: string;
  status: string;
  summary?: string;
  error?: { message?: string } | null;
  artifacts?: unknown[];
}

interface AssistantChatRunContext {
  conversationId: string;
  messageId: string;
  userId: string | null;
  /** stream 侧的 text part id（start → text-start → text-delta* → text-end） */
  textPartId: string;
  buffer: string;
  streamStarted: boolean;
}

const TEXT_PART_ID = 'text-0';

@Injectable()
export class AssistantRuntimeBridge {
  private readonly logger = new Logger(AssistantRuntimeBridge.name);

  /** 进程内 run → 会话映射缓存（miss 时查库回填；进程重启后按需重建） */
  private readonly runs = new Map<string, AssistantChatRunContext>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  @OnEvent('runtime.execution.event')
  async onExecutionEvent(payload: RuntimeExecutionEventPayload) {
    if (payload.eventType !== 'execution.token' || !payload.summary) return;
    const ctx = await this.resolveRun(payload.executionRunId);
    if (!ctx) return;

    ctx.buffer += payload.summary;
    this.publishStart(ctx);
    this.publish(ctx, {
      type: 'text-delta',
      id: ctx.textPartId,
      delta: payload.summary,
    });
    aiChatLog({
      phase: 'chunk',
      source: 'cli',
      conversationId: ctx.conversationId,
      messageId: ctx.messageId,
      userId: ctx.userId ?? undefined,
      executionRunId: payload.executionRunId,
      chunk: payload.summary,
    });
  }

  @OnEvent('runtime.execution.result')
  async onExecutionResult(payload: RuntimeExecutionResultPayload) {
    const ctx = await this.resolveRun(payload.executionRunId);
    if (!ctx) return;

    const failed = payload.status !== 'completed';
    const text = failed
      ? [payload.error?.message, payload.summary].filter(Boolean).join('\n') ||
        `执行失败（${payload.status}）`
      : ctx.buffer.trim() ||
        payload.summary?.trim() ||
        '（CLI 未返回文本输出）';

    try {
      const uiMessage = {
        id: ctx.messageId,
        role: 'assistant',
        metadata: { modelId: 'cli' },
        parts: [{ type: 'text', id: ctx.textPartId, state: 'done', text }],
      };
      await this.prisma.aIMessage.update({
        where: { id: ctx.messageId },
        data: {
          content: JSON.stringify(uiMessage),
          metadata: {
            format: 'ui-message',
            status: failed ? 'failed' : 'done',
            source: 'assistant-chat',
            executionRunId: payload.executionRunId,
          },
        },
      });
      await this.prisma.aIConversation.update({
        where: { id: ctx.conversationId },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Failed to finalize assistant chat message ${ctx.messageId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // 流式收尾：失败时正文尚未流出（或部分流出），统一起止补齐
    if (failed) {
      this.publishStart(ctx);
      this.publish(ctx, {
        type: 'text-delta',
        id: ctx.textPartId,
        delta: text,
      });
    }
    this.publish(ctx, { type: 'text-end', id: ctx.textPartId });
    this.publish(ctx, { type: 'finish-step' });
    this.publish(ctx, { type: 'finish' });

    aiChatLog({
      phase: failed ? 'error' : 'final',
      source: 'cli',
      conversationId: ctx.conversationId,
      messageId: ctx.messageId,
      userId: ctx.userId ?? undefined,
      executionRunId: payload.executionRunId,
      status: payload.status,
      text,
    });

    this.runs.delete(payload.executionRunId);
  }

  /** 解析 run 归属：非 assistant-chat 的执行直接忽略 */
  private async resolveRun(executionRunId: string) {
    const cached = this.runs.get(executionRunId);
    if (cached) return cached;

    const run = await this.prisma.execution.findUnique({
      where: { id: executionRunId },
      select: { createdBy: true, input: true },
    });
    const input = run?.input as {
      source?: string;
      conversationId?: string;
      messageId?: string;
    } | null;
    if (!run || input?.source !== 'assistant-chat' || !input.messageId) {
      return null;
    }

    const ctx: AssistantChatRunContext = {
      conversationId: input.conversationId ?? '',
      messageId: input.messageId,
      userId: run.createdBy ?? null,
      textPartId: TEXT_PART_ID,
      buffer: '',
      streamStarted: false,
    };
    this.runs.set(executionRunId, ctx);
    return ctx;
  }

  /** 首个 chunk 前补流起始（start 携带 messageId，前端据此建气泡） */
  private publishStart(ctx: AssistantChatRunContext) {
    if (ctx.streamStarted) return;
    ctx.streamStarted = true;
    this.publish(ctx, { type: 'start', messageId: ctx.messageId });
    this.publish(ctx, { type: 'start-step' });
    this.publish(ctx, { type: 'text-start', id: ctx.textPartId });
  }

  private publish(
    ctx: AssistantChatRunContext,
    chunk: Record<string, unknown>,
  ) {
    this.messageBus.publish('ai.stream', {
      conversationId: ctx.conversationId,
      messageId: ctx.messageId,
      chunk,
      userId: ctx.userId ?? undefined,
    });
  }
}
