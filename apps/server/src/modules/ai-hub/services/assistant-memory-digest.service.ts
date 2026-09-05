import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { PrismaService } from '@/core/database/prisma.service';
import { MemoryService } from '@/modules/memory/memory.service';
import {
  extractMessagePlainText,
  isUiMessageRow,
} from '../utils/ui-message-text';
import { AssistantSilentService } from './assistant-silent.service';

/**
 * 记忆消化器（AI 同事化 · Store B 写入方）：
 * 会话静默后离线提炼纪要/偏好/结论原子——写入不在热路径（debounce 20s）。
 * 记忆必带 sourceEventId 溯源；消化是旁路，任何失败只 warn 不影响主流程。
 * LLM 路径经 'ai.assistant.replied' 触发；CLI 路径监听 runtime.execution.result
 * 从 ExecutionRun.input.conversationId 反查会话。
 */
const DEBOUNCE_MS = 20_000;
const MAX_MESSAGES = 20;

interface DigestMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Injectable()
export class AssistantMemoryDigestService implements OnModuleInit {
  private readonly logger = new Logger(AssistantMemoryDigestService.name);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly messageBus: MessageBusService,
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
    private readonly silentService: AssistantSilentService,
  ) {}

  onModuleInit() {
    // LLM 路径：助手回复完成
    this.messageBus.subscribe(
      'ai.assistant.replied',
      (payload: { conversationId?: string }) => {
        if (payload?.conversationId) this.schedule(payload.conversationId);
      },
    );
    // CLI 路径：执行桥回流终态 → 从 run input 反查会话
    this.messageBus.subscribe(
      'runtime.execution.result',
      (payload: { executionRunId?: string }) => {
        void this.scheduleFromRun(payload?.executionRunId);
      },
    );
  }

  /** 会话静默 debounce：同一会话的后续消息会重置计时器 */
  schedule(conversationId: string): void {
    const existing = this.timers.get(conversationId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.timers.delete(conversationId);
      void this.digestConversation(conversationId);
    }, DEBOUNCE_MS);
    this.timers.set(conversationId, timer);
  }

  private async scheduleFromRun(executionRunId?: string): Promise<void> {
    if (!executionRunId) return;
    try {
      const run = await this.prisma.executionRun.findUnique({
        where: { id: executionRunId },
        select: { input: true },
      });
      const conversationId = (run?.input as { conversationId?: string } | null)
        ?.conversationId;
      if (conversationId) this.schedule(conversationId);
    } catch (err) {
      this.logger.warn(
        `digest schedule from run failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** 消化一段会话：拉 transcript → silent memory-digest → 写原子（旁路容错） */
  async digestConversation(conversationId: string): Promise<void> {
    try {
      const conversation = await this.prisma.aIConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, projectId: true },
      });
      if (!conversation) return;

      const rows = await this.prisma.aIMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: MAX_MESSAGES,
      });
      const messages: DigestMessage[] = rows
        .reverse()
        .map((row) => ({
          role: row.role === 'user' ? ('user' as const) : ('assistant' as const),
          text: isUiMessageRow(row)
            ? extractMessagePlainText(row)
            : row.content,
        }))
        .filter((m) => m.text.trim().length > 0);
      if (messages.length < 2) return; // 单条问候没有可沉淀的

      const result = await this.silentService.run(
        'memory-digest',
        { messages },
        conversation.projectId,
        'system',
      );
      const data = result.data as {
        summary?: unknown;
        preferences?: unknown;
        conclusions?: unknown;
      };
      const sourceEventId = rows[0]?.id;

      await this.writeAtom(
        conversation.projectId,
        'summary',
        data.summary,
        0.8,
        sourceEventId,
      );
      await this.writeAtomBatch(
        conversation.projectId,
        'preference',
        data.preferences,
        sourceEventId,
      );
      await this.writeAtomBatch(
        conversation.projectId,
        'conclusion',
        data.conclusions,
        sourceEventId,
      );
    } catch (err) {
      // 消化是旁路：无 LLM provider / 提炼失败都不影响主流程
      this.logger.warn(
        `memory digest skipped for ${conversationId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async writeAtom(
    projectId: string | null,
    type: string,
    content: unknown,
    confidence: number,
    sourceEventId?: string,
  ): Promise<void> {
    if (typeof content !== 'string' || content.trim().length < 4) return;
    await this.memoryService.note({
      projectId: projectId ?? undefined,
      type,
      content,
      confidence,
      sourceEventId,
      sourceType: 'digest',
      createdBy: 'system:digester',
    });
  }

  private async writeAtomBatch(
    projectId: string | null,
    type: string,
    raw: unknown,
    sourceEventId?: string,
  ): Promise<void> {
    if (!Array.isArray(raw)) return;
    for (const item of raw.slice(0, 2)) {
      if (typeof item !== 'object' || item === null) continue;
      const { content, confidence } = item as {
        content?: unknown;
        confidence?: unknown;
      };
      await this.writeAtom(
        projectId,
        type,
        content,
        typeof confidence === 'number' ? confidence : 0.8,
        sourceEventId,
      );
    }
  }
}
