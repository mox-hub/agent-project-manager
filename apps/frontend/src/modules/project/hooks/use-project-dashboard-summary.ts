import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi, type CreateMilestoneRequest } from '../api/project-api';
import type { ProjectDashboardSummary } from '../api/project-api';

export function useProjectDashboardSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'dashboard-summary'],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required');
      }
      const response = await projectApi.getDashboardSummary(projectId);
      return response.data;
    },
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
    },
  });
}

export function selectProjectHealthDetails(summary: ProjectDashboardSummary | undefined) {
  return summary?.health.details ?? [];
}

export function selectProjectAnalytics(summary: ProjectDashboardSummary | undefined) {
  return (
    summary?.analytics ?? {
      deliveryTimeline: [],
      workloadDistribution: [],
      aiRiskDistribution: [],
      aiComplexityDistribution: [],
    }
  );
}
