import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiHubApi } from '../api/ai-hub-api';
import type { ChatRequest } from '../api/ai-hub-api';
import { eventClient } from '@/infrastructure/event-client';

export function useAIChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChatRequest) => aiHubApi.chat(data),
    onSuccess: (response, variables) => {
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ['aiConversations'] });
      // Invalidate specific conversation if exists
      if (variables.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['aiConversation', variables.conversationId],
        });
      } else if (response.data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['aiConversation', response.data.conversationId],
        });
      }
    },
  });
}

interface AIStreamData {
  conversationId: string;
  messageId: string;
  chunk: string;
  isFinal: boolean;
}

export function useAIStream(
  conversationId: string | undefined,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
) {
  if (!conversationId) {
    return { subscribe: () => {}, unsubscribe: () => {} };
  }

  const handleStream = (data: AIStreamData) => {
    if (data.conversationId === conversationId) {
      if (data.isFinal) {
        onComplete();
      } else {
        onChunk(data.chunk);
      }
    }
  };

  return {
    subscribe: () => {
      eventClient.on<AIStreamData>('ai.stream', handleStream);
    },
    unsubscribe: () => {
      eventClient.off<AIStreamData>('ai.stream', handleStream);
    },
  };
}
