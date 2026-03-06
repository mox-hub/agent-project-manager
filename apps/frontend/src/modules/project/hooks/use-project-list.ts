import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { projectApi } from '../api/project-api';
import type { Project, ProjectListParams, ProjectListResponse } from '../api/project-api';

export function useProjectList(
  params?: ProjectListParams,
  options?: Omit<UseQueryOptions<ProjectListResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const response = await projectApi.getList(params);
      return response.data;
    },
    ...options,
  });
}

export interface UseProjectListResult {
  projects: Project[];
  meta?: ProjectListResponse['meta'];
}

