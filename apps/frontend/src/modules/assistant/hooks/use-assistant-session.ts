/**
 * 助手会话 hooks —— 消息查询（跟随当前会话或显式切换历史会话）+
 * 会话列表/新建 + 发送消息（乐观插入用户气泡与待回复占位，失败可重试）。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assistantApi,
  type AssistantMessage,
} from '../api/assistant-api';

let localSeq = 0;

export const assistantKeys = {
  all: ['assistant'] as const,
  /** conversationId 为 null 表示「跟随当前」（服务端取 updatedAt 最新） */
  messages: (projectId: string | undefined, conversationId: string | null) =>
    [...assistantKeys.all, 'messages', projectId ?? null, conversationId ?? 'current'] as const,
  conversations: (projectId: string | undefined) =>
    [...assistantKeys.all, 'conversations', projectId ?? null] as const,
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

/** 会话消息（conversationId=null 跟随当前；传入即查看指定历史会话） */
export function useAssistantMessages(
  projectId: string | undefined,
  conversationId: string | null,
) {
  return useQuery({
    queryKey: assistantKeys.messages(projectId, conversationId),
    queryFn: async () =>
      (await assistantApi.current(projectId, conversationId ?? undefined)) as AssistantSessionView,
    staleTime: 30_000,
  });
}

export function useAssistantConversationList(projectId: string | undefined) {
  return useQuery({
    queryKey: assistantKeys.conversations(projectId),
    queryFn: () => assistantApi.listConversations(projectId),
    staleTime: 15_000,
  });
}

export function useCreateAssistantConversation(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => assistantApi.createConversation(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assistantKeys.conversations(projectId) });
      qc.invalidateQueries({
        queryKey: assistantKeys.messages(projectId, null),
      });
    },
  });
}

export function useSendAssistantMessage(
  projectId: string | undefined,
  conversationId: string | null,
) {
  const qc = useQueryClient();
  const messagesKey = assistantKeys.messages(projectId, conversationId);

  const patchPending = (
    updater: (pending: AssistantChatMessage) => AssistantChatMessage,
  ) => {
    qc.setQueryData<AssistantSessionView>(messagesKey, (old) =>
      old
        ? {
            ...old,
            messages: old.messages.map((m) => (m.pending ? updater(m) : m)),
          }
        : old,
    );
  };

  return useMutation({
    mutationFn: (content: string) =>
      assistantApi.send(content, projectId, conversationId ?? undefined),
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: messagesKey });
      qc.setQueryData<AssistantSessionView>(messagesKey, (old) => ({
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
