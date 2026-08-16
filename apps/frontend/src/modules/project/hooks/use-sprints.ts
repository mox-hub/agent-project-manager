import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintApi, type Sprint, type CreateSprintRequest, type UpdateSprintRequest } from '../api/sprint-api';

export function useSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: ['sprints', projectId],
    enabled: !!projectId,
    queryFn: () => sprintApi.list(projectId),
  });
}

export function useSprint(projectId: string | undefined, sprintId: string | undefined) {
  return useQuery({
    queryKey: ['sprint', projectId, sprintId],
    enabled: !!projectId && !!sprintId,
    queryFn: () => sprintApi.get(projectId!, sprintId!),
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; data: CreateSprintRequest }) =>
      sprintApi.create(variables.projectId, variables.data),
    onSuccess: (sprint) => {
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
    onSuccess: (sprint) => {
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
    onSuccess: (sprint) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', sprint.projectId] });
    },
  });
}

export function useCompleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; sprintId: string }) =>
      sprintApi.complete(variables.projectId, variables.sprintId),
    onSuccess: (sprint) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', sprint.projectId] });
    },
  });
}

export function useCancelSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; sprintId: string }) =>
      sprintApi.cancel(variables.projectId, variables.sprintId),
    onSuccess: (sprint) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', sprint.projectId] });
    },
  });
}
