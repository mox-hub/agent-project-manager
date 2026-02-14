import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/project-api';
import type { CreateProjectRequest, UpdateProjectRequest } from '../api/project-api';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; data: UpdateProjectRequest }) =>
      projectApi.update(variables.projectId, variables.data),
    onSuccess: (response) => {
      const project = response.data;
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      }
    },
  });
}
