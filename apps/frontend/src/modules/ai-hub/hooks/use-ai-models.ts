import { useQuery } from '@tanstack/react-query';
import { aiHubApi } from '../api/ai-hub-api';

export function useAIModels() {
  return useQuery({
    queryKey: ['aiModels'],
    queryFn: () => aiHubApi.getModels(),
  });
}
