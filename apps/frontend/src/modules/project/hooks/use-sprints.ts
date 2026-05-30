import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintApi, type Sprint, type CreateSprintRequest, type UpdateSprintRequest } from '../api/sprint-api';

export function useSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: ['sprints', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required');
      }
      const response = await sprintApi.list(projectId);
      return response.data;
    },
  });
}

export function useSprint(projectId: string | undefined, sprintId: string | undefined) {
  return useQuery({
    queryKey: ['sprint', projectId, sprintId],
    enabled: !!projectId && !!sprintId,
    queryFn: async () => {
      if (!projectId || !sprintId) {
        throw new Error('projectId and sprintId are required');
      }
      const response = await sprintApi.get(projectId, sprintId);
      return response.data;
    },
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; data: CreateSprintRequest }) =>
      sprintApi.create(variables.projectId, variables.data),
    onSuccess: (response) => {
      const sprint = response.data;
      queryClient.invalidateQueries({ queryKey: ['sprints', sprint.projectId] });
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      projectId: string;
      sprintId: string;
      data: UpdateSprintRequest;
    }) => sprintApi.update(variables.projectId, variables.sprintId, variables.data),
    onSuccess: (response) => {
      const sprint = response.data;
      queryClient.invalidateQueries({ queryKey: ['sprints', sprint.projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprint', sprint.projectId, sprint.id] });
    },
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; sprintId: string }) =>
      sprintApi.delete(variables.projectId, variables.sprintId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', variables.projectId] });
    },
  });
}

export function useStartSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; sprintId: string }) =>
      sprintApi.start(variables.projectId, variables.sprintId),
    onSuccess: (response) => {
      const sprint = response.data;
      queryClient.invalidateQueries({ queryKey: ['sprints', sprint.projectId] });
    },
  });
}

export function useCompleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; sprintId: string }) =>
      sprintApi.complete(variables.projectId, variables.sprintId),
    onSuccess: (response) => {
      const sprint = response.data;
      queryClient.invalidateQueries({ queryKey: ['sprints', sprint.projectId] });
    },
  });
}

export function useCancelSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; sprintId: string }) =>
      sprintApi.cancel(variables.projectId, variables.sprintId),
    onSuccess: (response) => {
      const sprint = response.data;
      queryClient.invalidateQueries({ queryKey: ['sprints', sprint.projectId] });
    },
  });
}
