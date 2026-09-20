import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { playbookApi } from '../api/playbook-api';

/** 剧本 hooks：查询走 ['projects', id, 'playbook'] 命名空间，模板全局缓存 */

export function usePlaybookTemplates() {
  return useQuery({
    queryKey: ['playbooks', 'templates'] as const,
    queryFn: () => playbookApi.getTemplates(),
    staleTime: Infinity,
  });
}

export function usePlaybookStatus(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'playbook'] as const,
    queryFn: () => playbookApi.getStatus(projectId!),
    enabled: !!projectId,
  });
}

export function useMountPlaybook(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playbookRef: string) => playbookApi.mount(projectId, playbookRef),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'playbook'] });
    },
  });
}

export function useSubmitInterview(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stageKey,
      answers,
    }: {
      stageKey: string;
      answers: Array<{ questionId: string; answer: string }>;
    }) => playbookApi.submitInterview(projectId, stageKey, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'playbook'] });
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
    },
  });
}

export function useSkipStage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stageKey, reason }: { stageKey: string; reason?: string }) =>
      playbookApi.skipStage(projectId, stageKey, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'playbook'] });
    },
  });
}
