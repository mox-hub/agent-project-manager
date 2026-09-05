import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi, type CreateMilestoneRequest } from '../api/project-api';
import type { ProjectDashboardSummary } from '../api/project-api';

export function useProjectDashboardSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'dashboard-summary'],
    enabled: !!projectId,
    queryFn: () => projectApi.getDashboardSummary(projectId),
  });
}

export function useCreateProjectMilestone(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMilestoneRequest) => {
      if (!projectId) {
        throw new Error('projectId is required');
      }
      return projectApi.createMilestone(projectId, data);
    },
    onSuccess: () => {
      if (!projectId) return;
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'health-snapshots'] });
      // 里程碑列表（project-milestones-page / 详情页侧栏）与项目里程碑查询同 key
      queryClient.invalidateQueries({ queryKey: ['projectMilestones', projectId] });
    },
  });
}

export function selectProjectHealthDetails(summary: ProjectDashboardSummary | undefined) {
  return summary?.health.details ?? [];
}
