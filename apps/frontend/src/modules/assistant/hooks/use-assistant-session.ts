/**
 * 助手会话 hooks —— 会话查询 + 发送消息（乐观插入用户气泡与待回复占位，
 * 成功替换为真实回复、失败标记错误并可重试）。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assistantApi, type AssistantMessage } from '../api/assistant-api';

export const assistantKeys = {
  all: ['assistant'] as const,
  session: (projectId?: string) =>
    [...assistantKeys.all, 'session', projectId ?? null] as const,
};

/** 本地乐观态扩展：pending 占位 / 错误标记 / 重试原文 */
export interface AssistantChatMessage extends AssistantMessage {
  pending?: boolean;
  error?: string;
  retryContent?: string;
}

export interface AssistantSessionView {
  conversationId: string;
  projectId?: string | null;
  messages: AssistantChatMessage[];
}

export function useAssistantSession(projectId?: string) {
  return useQuery({
    queryKey: assistantKeys.session(projectId),
    queryFn: async () => (await assistantApi.current(projectId)) as AssistantSessionView,
    staleTime: 30_000,
  });
}

let localSeq = 0;

export function useSendAssistantMessage(projectId?: string) {
  const qc = useQueryClient();
  const sessionKey = assistantKeys.session(projectId);

  const patchPending = (
    updater: (pending: AssistantChatMessage) => AssistantChatMessage,
  ) => {
    qc.setQueryData<AssistantSessionView>(sessionKey, (old) =>
      old
        ? {
            ...old,
            messages: old.messages.map((m) => (m.pending ? updater(m) : m)),
          }
        : old,
    );
  };

  return useMutation({
    mutationFn: (content: string) => assistantApi.send(content, projectId),
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: sessionKey });
      qc.setQueryData<AssistantSessionView>(sessionKey, (old) => ({
        conversationId: old?.conversationId ?? '',
        projectId: old?.projectId ?? null,
        messages: [
          ...(old?.messages ?? []),
          {
            id: `local-user-${++localSeq}`,
            role: 'user' as const,
            content,
            createdAt: new Date().toISOString(),
          },
          {
            id: `local-pending-${++localSeq}`,
            role: 'assistant' as const,
            content: '',
            createdAt: new Date().toISOString(),
            pending: true,
          },
        ],
      }));
    },
    onSuccess: (data) => {
      patchPending((pending) => ({
        ...pending,
        id: data.message.id,
        content: data.message.content,
        modelName: data.message.modelName ?? null,
        pending: false,
      }));
    },
    onError: (error, content) => {
      patchPending((pending) => ({
        ...pending,
        pending: false,
        error: error instanceof Error ? error.message : String(error),
        retryContent: content,
      }));
    },
  });
}
