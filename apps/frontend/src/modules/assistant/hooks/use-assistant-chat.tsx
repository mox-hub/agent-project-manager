/**
 * 助手对话接入 AI SDK v7 useChat：
 * - AssistantStreamTransport：发送走 POST /ai/assistant/messages（model/viewing 经 body），
 *   流式 chunk 经 /events 的 ai.stream 事件（载荷 {conversationId, messageId, chunk, userId}）
 *   喂给 useChat——协议即 UI Message Stream 的 UIMessageChunk。
 * - toAssistantUiMessages：把服务端 UIMessage JSON（metadata.format='ui-message'）水合为
 *   UIMessage；旧纯文本消息回退为单 text part。
 * - AssistantChatSession：以 key 重挂载实现会话/作用域切换（useState 初始化器一次性
 *   构建 Chat 实例，规避 effect 内同步 setState），经 context 向消息流/输入框提供 helpers。
 */
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chat, useChat, type UseChatHelpers } from '@ai-sdk/react';
import { type ChatTransport, type UIMessage, type UIMessageChunk } from 'ai';
import { eventClient } from '@/infrastructure/event-client';
import {
  assistantApi,
  type AssistantMessage,
  type AssistantViewing,
} from '../api/assistant-api';
import { assistantKeys } from './use-assistant-session';

/** 助手消息元数据：CLI 桥占位的运行态 + 模型标注 */
export interface AssistantChatMetadata {
  runStatus?: 'running' | 'done' | 'failed';
  executionRunId?: string;
  modelId?: string;
}

export type AssistantChatMessage = UIMessage<AssistantChatMetadata>;

interface AiStreamPayload {
  conversationId: string;
  messageId: string;
  chunk: UIMessageChunk;
  userId?: string;
}

interface AssistantSendBody {
  projectId?: string;
  conversationId?: string;
  model?: string;
  viewing?: AssistantViewing;
}

/** UIMessage text part（带流式状态标记） */
interface TextPartLike {
  type: 'text';
  text: string;
  state?: 'streaming' | 'done';
}

/** 提取消息正文（text parts 拼接；无文本返回空串） */
export function extractMessageText(message: AssistantChatMessage): string {
  return message.parts
    .filter((p): p is TextPartLike => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/** 服务端消息行 → UIMessage（ui-message JSON 水合；旧纯文本回退；空/system 剔除） */
export function convertAssistantMessage(
  m: AssistantMessage,
): AssistantChatMessage | null {
  const meta = m.metadata ?? null;
  if (meta?.format === 'ui-message') {
    let parsed: { parts?: unknown; metadata?: { modelId?: string } } | null = null;
    try {
      parsed = JSON.parse(m.content) as typeof parsed;
    } catch {
      parsed = null;
    }
    if (parsed && Array.isArray(parsed.parts)) {
      return {
        id: m.id,
        role: 'assistant',
        metadata: {
          runStatus: meta.status,
          executionRunId: meta.executionRunId,
          modelId: parsed.metadata?.modelId,
        },
        parts: parsed.parts as AssistantChatMessage['parts'],
      };
    }
    // 占位损坏兜底：仍保留运行态标记供渲染
    return {
      id: m.id,
      role: 'assistant',
      metadata: {
        runStatus: meta.status ?? 'failed',
        executionRunId: meta.executionRunId,
      },
      parts: [],
    };
  }
  if (m.role === 'user' && m.content) {
    return {
      id: m.id,
      role: 'user',
      parts: [{ type: 'text', text: m.content }],
    };
  }
  if (m.role === 'assistant' && m.content.trim()) {
    return {
      id: m.id,
      role: 'assistant',
      parts: [{ type: 'text', text: m.content }],
    };
  }
  return null;
}

export function toAssistantUiMessages(
  messages: AssistantMessage[],
): AssistantChatMessage[] {
  return messages
    .map(convertAssistantMessage)
    .filter((m): m is AssistantChatMessage => m !== null);
}

/**
 * socket 传输：ai.stream 事件按 conversationId 过滤后逐 chunk 转交；
 * finish/error/abort 关流；POST 失败以 error chunk 上报给 useChat。
 */
class AssistantStreamTransport
  implements ChatTransport<AssistantChatMessage>
{
  async sendMessages({
    messages,
    abortSignal,
    body,
  }: {
    messages: AssistantChatMessage[];
    abortSignal?: AbortSignal;
    body?: unknown;
    trigger?: string;
    chatId?: string;
    messageId?: string;
  }): Promise<ReadableStream<UIMessageChunk>> {
    const opts = (body ?? {}) as AssistantSendBody;
    // submit 取最后一条；regenerate 时 useChat 的 messages 以待重发的 user 消息结尾前置
    const userMessage =
      opts && [...messages].reverse().find((m) => m.role === 'user');
    const content = userMessage ? extractMessageText(userMessage) : '';
    if (!content) {
      throw new Error('空消息不可发送');
    }
    if (!eventClient.isConnected()) {
      eventClient.connect();
    }

    let closed = false;
    let boundConversationId = opts.conversationId ?? null;
    let handler: ((payload: AiStreamPayload) => void) | null = null;

    return new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        const close = () => {
          if (closed) return;
          closed = true;
          if (handler) eventClient.off('ai.stream', handler);
          try {
            controller.close();
          } catch {
            // 已关闭
          }
        };
        handler = (payload) => {
          if (closed) return;
          if (boundConversationId && payload.conversationId !== boundConversationId) {
            return;
          }
          if (!boundConversationId) {
            boundConversationId = payload.conversationId;
          }
          const chunk = payload.chunk;
          try {
            controller.enqueue(chunk);
          } catch {
            close();
            return;
          }
          if (
            chunk.type === 'finish' ||
            chunk.type === 'error' ||
            chunk.type === 'abort'
          ) {
            close();
          }
        };
        eventClient.on('ai.stream', handler);
        abortSignal?.addEventListener('abort', close, { once: true });

        assistantApi
          .send({ content, ...opts })
          .then((res) => {
            // 显式会话为空（跟随当前）时以响应/流事件的会话 id 为准
            if (!opts.conversationId && !boundConversationId) {
              boundConversationId = res.conversationId;
            }
          })
          .catch((err: unknown) => {
            if (closed) return;
            controller.enqueue({
              type: 'error',
              errorText: err instanceof Error ? err.message : String(err),
            });
            close();
          });
      },
      cancel: () => {
        closed = true;
        if (handler) eventClient.off('ai.stream', handler);
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    // 刷新后的在途回流不做重连：会话消息以服务端落库为准（running 占位可再水合）
    return null;
  }
}

const assistantStreamTransport = new AssistantStreamTransport();

const AssistantChatContext = createContext<
  UseChatHelpers<AssistantChatMessage> | null
>(null);

export function AssistantChatSession({
  conversationId,
  initialMessages,
  onFinished,
  children,
}: {
  /** 显式历史会话 id；缺省为跟随当前（服务端 updatedAt 最新） */
  conversationId?: string;
  initialMessages: AssistantChatMessage[];
  /** 一轮流式结束（LLM 同步返回或 CLI run 终态）后回调（如失效会话列表缓存） */
  onFinished?: () => void;
  children: ReactNode;
}) {
  const [chat] = useState(
    () =>
      new Chat<AssistantChatMessage>({
        id: conversationId ?? 'assistant-current',
        transport: assistantStreamTransport,
        messages: initialMessages,
        onError: () => {
          // 错误经 helpers.error 呈现于输入区
        },
        onFinish: () => {
          onFinished?.();
        },
      }),
  );
  const helpers = useChat({ chat });
  return (
    <AssistantChatContext.Provider value={helpers}>
      {children}
    </AssistantChatContext.Provider>
  );
}

export function useAssistantChatHelpers(): UseChatHelpers<AssistantChatMessage> {
  const ctx = useContext(AssistantChatContext);
  if (!ctx) {
    throw new Error('useAssistantChatHelpers must be used within AssistantChatSession');
  }
  return ctx;
}

/** 组装发送 body（跟随当前会话时不带 conversationId，由服务端解析） */
export function buildAssistantSendBody(options: {
  projectId?: string;
  conversationId?: string;
  model?: string | null;
  viewing?: AssistantViewing | null;
}): AssistantSendBody {
  return {
    ...(options.projectId ? { projectId: options.projectId } : {}),
    ...(options.conversationId ? { conversationId: options.conversationId } : {}),
    ...(options.model ? { model: options.model } : {}),
    ...(options.viewing ? { viewing: options.viewing } : {}),
  };
}

/** 可选模型清单（在线 CLI 通道 + 已启用 LLM provider） */
export function useAssistantModels(projectId: string | undefined) {
  return useQuery({
    queryKey: assistantKeys.models(projectId),
    queryFn: () => assistantApi.listModels(),
    staleTime: 30_000,
  });
}
