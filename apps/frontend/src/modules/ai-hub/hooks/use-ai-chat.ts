import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiHubApi } from '../api/ai-hub-api';
import type { ChatRequest } from '../api/ai-hub-api';
import { eventClient } from '@/infrastructure/event-client';
import type { SocketEventMap } from '@/shared/types/socket-events';

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

export function useAIStream(
  conversationId: string | undefined,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
) {
  const handleStream = useCallback(
    (data: SocketEventMap['ai:stream']) => {
      if (data.conversationId === conversationId) {
        if (data.isFinal) {
          onComplete();
        } else {
          onChunk(data.chunk);
        }
      }
    },
    [conversationId, onChunk, onComplete],
  );

  const subscribe = useCallback(() => {
    if (!conversationId) return;
    eventClient.on<SocketEventMap['ai:stream']>('ai:stream', handleStream);
  }, [conversationId, handleStream]);

  const unsubscribe = useCallback(() => {
    if (!conversationId) return;
    eventClient.off<SocketEventMap['ai:stream']>('ai:stream', handleStream);
  }, [conversationId, handleStream]);

  return {
    subscribe,
    unsubscribe,
  };
}
