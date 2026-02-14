import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { aiHubApi } from '../api/ai-hub-api';
import type {
  ConversationListParams,
  ConversationListResponse,
  AIConversation,
} from '../api/ai-hub-api';

export function useAIConversations(
  params?: ConversationListParams,
  options?: Omit<
    UseQueryOptions<ConversationListResponse>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: ['aiConversations', params],
    queryFn: async () => {
      const response = await aiHubApi.getConversations(params);
      return {
        data: response.data,
        meta: response.meta,
      };
    },
    ...options,
  });
}

export function useAIConversation(
  id: string | undefined,
  options?: Omit<
    UseQueryOptions<AIConversation>,
    'queryKey' | 'queryFn' | 'enabled'
  >,
) {
  return useQuery({
    queryKey: ['aiConversation', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error('Conversation ID is required');
      }
      const response = await aiHubApi.getConversation(id);
      return response.data;
    },
    ...options,
  });
}
