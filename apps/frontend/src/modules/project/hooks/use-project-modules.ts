import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjectModules,
  createProjectModule,
  updateProjectModule,
  deleteProjectModule,
  type ProjectModule,
} from '@/modules/project/api/project-module-api';
import { useToastMutation } from '@/shared/hooks';

const KEYS = {
  byProject: (projectId: string) => ['project-modules', projectId] as const,
};

export function useProjectModules(projectId: string) {
  return useQuery<ProjectModule[]>({
    queryKey: KEYS.byProject(projectId),
    queryFn: () => fetchProjectModules(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProjectModule(projectId: string) {
  const queryClient = useQueryClient();
  return useToastMutation<ProjectModule, Error, { code: string; name: string; description?: string }>({
    successMessage: '模块代码已创建',
    errorPrefix: '创建模块代码',
    mutationFn: (dto) => createProjectModule(projectId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.byProject(projectId) });
    },
  });
}

export function useUpdateProjectModule(projectId: string) {
  const queryClient = useQueryClient();
  return useToastMutation<ProjectModule, Error, { moduleId: string; dto: { name?: string; description?: string } }>({
    successMessage: '模块代码已更新',
    errorPrefix: '更新模块代码',
    mutationFn: ({ moduleId, dto }) => updateProjectModule(projectId, moduleId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.byProject(projectId) });
    },
  });
}

export function useDeleteProjectModule(projectId: string) {
  const queryClient = useQueryClient();
  return useToastMutation<{ ok: boolean }, Error, string>({
    successMessage: '模块代码已删除',
    errorPrefix: '删除模块代码',
    mutationFn: (moduleId) => deleteProjectModule(projectId, moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.byProject(projectId) });
    },
  });
}
