import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { taskApi } from '../api/task-api';
import { activityApi } from '@/modules/activity/api/activity-api';
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
  AssignTaskAgentRequest,
  CreateTaskExecutionRequest,
  ConfirmTaskExecutionRequest,
  TaskExecutionRun,
} from '../api/task-api';

export function useProjectTasks(
  projectId: string | undefined,
  params?: TaskListParams,
  options?: Omit<UseQueryOptions<TaskListResponse>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['projectTasks', projectId, params],
    enabled: !!projectId,
    queryFn: () => taskApi.getProjectTasks(projectId!, params),
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
    queryFn: () => taskApi.getProjectBugs(projectId!, params),
    ...options,
  });
}

export function useAllBugs(
  params?: TaskListParams,
  options?: Omit<UseQueryOptions<TaskListResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ['allBugs', params],
    queryFn: () => taskApi.getAllBugs(params),
    ...options,
  });
}

/**
 * 全局任务列表页专用: 跨项目查询所有 task + bug, 包含 inbox 任务
 */
export function useAllTasks(
  params?: TaskListParams & { type?: 'task' | 'bug' | 'all' },
  options?: Omit<UseQueryOptions<TaskListResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ['allTasks', params],
    queryFn: () => taskApi.getAllTasks(params),
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
    queryFn: () => taskApi.getProjectIterations(projectId!),
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
    queryFn: () => taskApi.getProjectMilestones(projectId!),
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
    queryFn: () => taskApi.getDetail(taskId!),
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
    // 动态已迁至通用 activity 模块；此处映射为旧 TaskActivity 形状，兼容抽屉/页签等消费方
    queryFn: async () => {
      const items = await activityApi.list('task', taskId!);
      return items.map<TaskActivity>((a) => ({
        id: a.id,
        projectId: a.projectId ?? '',
        taskId: a.entityId,
        actorId: a.actor?.displayName ?? a.actor?.username ?? null,
        type: a.type,
        timestamp: a.createdAt,
        summary: a.content ?? a.summary ?? null,
      }));
    },
    ...options,
  });
}

export function useTaskExecutions(
  taskId: string | undefined,
  options?: Omit<UseQueryOptions<TaskExecutionRun[]>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['taskExecutions', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      if (!taskId) {
        throw new Error('taskId is required');
      }
      const response = await taskApi.getExecutions(taskId);
      return response as TaskExecutionRun[];
    },
    ...options,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.create(data),
    onSuccess: (task) => {
      if (task?.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['projectTasks', task.projectId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      }
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['allBugs'] });
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
    onSuccess: (task) => {
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
      // 全局列表同步
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['allBugs'] });
    },
    onError: (err) => {
      toast.error('更新任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useAssignTaskAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { taskId: string; data: AssignTaskAgentRequest }) =>
      taskApi.assignAgent(variables.taskId, variables.data),
    onSuccess: (task) => {
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['projectTasks', task.projectId] });
      }
      if (task?.id) {
        queryClient.invalidateQueries({ queryKey: ['task', task.id] });
        queryClient.invalidateQueries({ queryKey: ['taskExecutions', task.id] });
      }
    },
  });
}

export function useCreateTaskExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { taskId: string; data: CreateTaskExecutionRequest }) =>
      taskApi.createExecution(variables.taskId, variables.data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taskExecutions', variables.taskId] });
      const taskId = response.execution.taskId;
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      }
    },
  });
}

export function useConfirmTaskExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      taskId: string;
      executionId: string;
      data: ConfirmTaskExecutionRequest;
    }) => taskApi.confirmExecution(variables.taskId, variables.executionId, variables.data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taskExecutions', variables.taskId] });
      const taskId = response.execution.taskId;
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      }
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
    onSuccess: (dependency) => {
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
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['allBugs'] });
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
    onSuccess: (task) => {
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
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['allBugs'] });
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

/** 通过 parentTaskId 获取子任务列表 */
export function useSubTasks(parentTaskId: string | undefined) {
  return useQuery({
    queryKey: ['subTasks', parentTaskId],
    enabled: !!parentTaskId,
    queryFn: async () => {
      if (!parentTaskId) return [];
      const result = await taskApi.getAllTasks({ parentTaskId, pageSize: 50 });
      return result?.data ?? [];
    },
  });
}

/** 创建子任务 (内部调用 useCreateTask, 自动补 parentTaskId) */
export function useCreateSubTask(options?: { onSuccess?: (task: Task) => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CreateTaskRequest, 'parentTaskId'> & { parentTaskId: string }) =>
      taskApi.create(data),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['subTasks', (newTask as any).parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ['task', (newTask as any).parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['allBugs'] });
      toast.success('子任务已创建');
      options?.onSuccess?.(newTask);
    },
    onError: (err) => {
      toast.error('创建子任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
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

// ─── ShortId 管理 Hooks ──────────────────────────────────────────

export interface ShortIdStats {
  total: number;
  withShortId: number;
  withoutShortId: number;
}

export interface BackfillResult {
  success: boolean;
  total: number;
  successCount: number;
  failed: number;
  errors: string[];
}

export function useShortIdStats() {
  return useQuery({
    queryKey: ['shortIdStats'],
    queryFn: () => taskApi.getShortIdStats(),
  });
}

export function useBackfillShortIds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => taskApi.backfillShortIds(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shortIdStats'] });
      if (result.success) {
        toast.success(`成功为 ${result.successCount} 个任务补充 shortId`);
      } else {
        toast.warning(`补充完成：成功 ${result.successCount} 个，失败 ${result.failed} 个`);
      }
    },
    onError: (err) => {
      toast.error('补充 shortId 失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

