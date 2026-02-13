import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { projectApi } from '../api/project-api';
import type { Project } from '../api/project-api';

export function useProjectDetail(
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<Project>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['project', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required');
      }
      const response = await projectApi.getDetail(projectId);
      return response.data;
    },
    ...options,
  });
}

