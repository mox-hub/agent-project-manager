import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiHubApi } from '../api/ai-hub-api';
import type { AgentIdentity, CreateAgentIdentityRequest } from '../api/ai-hub-api';

export function useAIAgents(projectId?: string) {
  return useQuery({
    queryKey: ['aiAgents', projectId],
    queryFn: async () => {
      const response = await aiHubApi.getAgents(projectId);
      return response.data;
    },
  });
}

export function useCreateAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgentIdentityRequest) => aiHubApi.createAgent(data),
    onSuccess: (response) => {
      const agent = response.data as AgentIdentity;
      queryClient.invalidateQueries({ queryKey: ['aiAgents'] });
      if (agent.projectId) {
        queryClient.invalidateQueries({ queryKey: ['aiAgents', agent.projectId] });
      }
    },
  });
}
