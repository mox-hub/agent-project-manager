/**
 * 助手会话查询 hooks —— 消息查询（跟随当前会话或显式切换历史会话）+
 * 会话列表/新建。发送与流式由 use-assistant-chat 的 useChat 承接。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assistantApi,
  type AssistantMessage,
  type AssistantSession,
} from '../api/assistant-api';

export const assistantKeys = {
  all: ['assistant'] as const,
  /** conversationId 为 null 表示「跟随当前」（服务端取 updatedAt 最新） */
  messages: (projectId: string | undefined, conversationId: string | null) =>
    [...assistantKeys.all, 'messages', projectId ?? null, conversationId ?? 'current'] as const,
  conversations: (projectId: string | undefined) =>
    [...assistantKeys.all, 'conversations', projectId ?? null] as const,
  models: (projectId: string | undefined) =>
    [...assistantKeys.all, 'models', projectId ?? null] as const,
};

export type { AssistantMessage, AssistantSession };

/** 会话消息（conversationId=null 跟随当前；传入即查看指定历史会话） */
export function useAssistantMessages(
  projectId: string | undefined,
  conversationId: string | null,
) {
  return useQuery({
    queryKey: assistantKeys.messages(projectId, conversationId),
    queryFn: async () =>
      (await assistantApi.current(projectId, conversationId ?? undefined)) as AssistantSession,
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
