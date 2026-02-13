import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { taskApi } from '../api/task-api';
import type {
  TaskListParams,
  TaskListResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../api/task-api';

export function useProjectTasks(
  projectId: string | undefined,
  params?: TaskListParams,
  options?: Omit<UseQueryOptions<TaskListResponse>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['projectTasks', projectId, params],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required');
      }
      const response = await taskApi.getProjectTasks(projectId, params);
      return {
        data: response.data,
        meta: response.meta,
      };
    },
    ...options,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.create(data),
    onSuccess: (response) => {
      const task = response.data;
      if (task?.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['projectTasks', task.projectId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { taskId: string; data: UpdateTaskRequest }) =>
      taskApi.update(variables.taskId, variables.data),
    onSuccess: (response) => {
      const task = response.data;
      if (task?.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['projectTasks', task.projectId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      }
    },
  });
}

