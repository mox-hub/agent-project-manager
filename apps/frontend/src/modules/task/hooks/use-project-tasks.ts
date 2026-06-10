import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskApi } from '../api/task-api';
import type {
  TaskListParams,
  TaskListResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  Task,
  TaskActivity,
  CreateTaskDependencyRequest,
  IterationRef,
  MilestoneRef,
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
      return response.data;
    },
    ...options,
  });
}

export function useProjectBugs(
  projectId: string | undefined,
  params?: TaskListParams,
  options?: Omit<UseQueryOptions<TaskListResponse>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['projectBugs', projectId, params],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required');
      }
      const response = await taskApi.getProjectBugs(projectId, params);
      return response.data;
    },
    ...options,
  });
}

export function useAllBugs(
  params?: TaskListParams,
  options?: Omit<UseQueryOptions<TaskListResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ['allBugs', params],
    queryFn: async () => {
      const response = await taskApi.getAllBugs(params);
      return response.data;
    },
    ...options,
  });
}

export function useProjectIterations(
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<IterationRef[]>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['projectIterations', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required');
      }
      const response = await taskApi.getProjectIterations(projectId);
      return response.data;
    },
    ...options,
  });
}

export function useProjectMilestones(
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<MilestoneRef[]>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['projectMilestones', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required');
      }
      const response = await taskApi.getProjectMilestones(projectId);
      return response.data;
    },
    ...options,
  });
}

export function useTaskDetail(
  taskId: string | undefined,
  options?: Omit<UseQueryOptions<Task>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['task', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      if (!taskId) {
        throw new Error('taskId is required');
      }
      const response = await taskApi.getDetail(taskId);
      return response.data;
    },
    ...options,
  });
}

export function useTaskActivities(
  taskId: string | undefined,
  options?: Omit<UseQueryOptions<TaskActivity[]>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['taskActivities', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      if (!taskId) {
        throw new Error('taskId is required');
      }
      const response = await taskApi.getActivities(taskId);
      return response.data;
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
    onError: (err) => {
      toast.error('创建任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
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
      if (task?.id) {
        queryClient.invalidateQueries({
          queryKey: ['task', task.id],
        });
      }
    },
    onError: (err) => {
      toast.error('更新任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useCreateTaskQuick(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Pick<CreateTaskRequest, 'title' | 'description'>) => {
      if (!projectId) {
        throw new Error('projectId is required');
      }

      return taskApi.create({
        projectId,
        title: data.title,
        description: data.description,
      });
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['projectTasks', projectId],
        });
      }
    },
    onError: (err) => {
      toast.error('快速创建任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useAddTaskDependency(taskId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskDependencyRequest) => {
      if (!taskId) {
        throw new Error('taskId is required');
      }
      return taskApi.addDependency(taskId, data);
    },
    onSuccess: (response) => {
      const dependency = response.data;
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      }
      if (dependency?.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['projectTasks', dependency.projectId],
        });
      }
    },
    onError: (err) => {
      toast.error('添加任务依赖失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useRemoveTaskDependency(taskId: string | undefined, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dependencyId: string) => {
      if (!taskId) {
        throw new Error('taskId is required');
      }
      return taskApi.removeDependency(taskId, dependencyId);
    },
    onSuccess: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      }
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['projectTasks', projectId],
        });
      }
    },
    onError: (err) => {
      toast.error('移除任务依赖失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.delete(taskId),
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err) => {
      toast.error('删除任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { taskId: string; status: string }) =>
      taskApi.update(variables.taskId, { status: variables.status }),
    onSuccess: (response) => {
      const task = response.data;
      if (task?.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['projectTasks', task.projectId],
        });
      }
      if (task?.id) {
        queryClient.invalidateQueries({
          queryKey: ['task', task.id],
        });
      }
    },
    onError: (err) => {
      toast.error('移动任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useImportTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { projectId: string; tasks: CreateTaskRequest[] }) =>
      taskApi.importTasks(variables.tasks),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projectTasks', variables.projectId],
      });
    },
    onError: (err) => {
      toast.error('导入任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useExportTasks() {
  return useMutation({
    mutationFn: (variables: { projectId: string; format: 'csv' | 'json' }) =>
      taskApi.exportTasks(variables.projectId, variables.format),
    onError: (err) => {
      toast.error('导出任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

