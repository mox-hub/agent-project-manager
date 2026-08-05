import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectApi } from '../api/project-api';
import type { CreateProjectRequest, UpdateProjectRequest } from '../api/project-api';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      toast.error('创建项目失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; data: UpdateProjectRequest }) =>
      projectApi.update(variables.projectId, variables.data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      }
    },
    onError: (err) => {
      toast.error('更新项目失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}
