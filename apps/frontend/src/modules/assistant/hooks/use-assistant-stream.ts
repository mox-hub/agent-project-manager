/**
 * ai.stream 订阅 —— 把当前会话的流式增量聚合成一段实时文本，
 * 渲染进「待回复」气泡；isFinal 清空（POST /ai/chat 本身同步返回终文）。
 * 事件载荷（网关已修正）：{ conversationId, messageId, chunk, isFinal, userId }。
 */
import { useCallback, useState } from 'react';
import { useEventSubscription } from '@/infrastructure/hooks/use-event-subscription';

export interface AssistantStreamState {
  messageId: string;
  text: string;
}

interface AiStreamPayload {
  conversationId: string;
  messageId: string;
  chunk: string;
  isFinal: boolean;
}

export function useAssistantStream(
  conversationId?: string | null,
): AssistantStreamState | null {
  const [stream, setStream] = useState<AssistantStreamState | null>(null);

  // 作用域切换时清空上一会话的流式残段（渲染期比对模式，避免 effect 同步 setState）
  const [prevConversationId, setPrevConversationId] = useState(conversationId);
  if (prevConversationId !== conversationId) {
    setPrevConversationId(conversationId);
    setStream(null);
  }

  const handler = useCallback(
    (payload: AiStreamPayload) => {
      if (!conversationId || payload.conversationId !== conversationId) return;
      if (payload.isFinal) {
        setStream(null);
        return;
      }
      setStream((prev) =>
        prev && prev.messageId === payload.messageId
          ? { messageId: prev.messageId, text: prev.text + payload.chunk }
          : { messageId: payload.messageId, text: payload.chunk },
      );
    },
    [conversationId],
  );

  useEventSubscription('ai.stream', handler, [conversationId]);

  return stream;
}
