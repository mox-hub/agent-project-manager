import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { taskApi } from '../api/issue-api';
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
} from '../api/issue-api';

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
  issueId: string | undefined,
  options?: Omit<UseQueryOptions<Task>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['task', issueId],
    enabled: !!issueId,
    queryFn: () => taskApi.getDetail(issueId!),
    ...options,
  });
}

export function useTaskActivities(
  issueId: string | undefined,
  options?: Omit<UseQueryOptions<TaskActivity[]>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['taskActivities', issueId],
    enabled: !!issueId,
    // 动态已迁至通用 activity 模块；此处映射为旧 TaskActivity 形状，兼容抽屉/页签等消费方
    queryFn: async () => {
      const items = await activityApi.list('task', issueId!);
      return items.map<TaskActivity>((a) => ({
        id: a.id,
        projectId: a.projectId ?? '',
        issueId: a.entityId,
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
  issueId: string | undefined,
  options?: Omit<UseQueryOptions<TaskExecutionRun[]>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['taskExecutions', issueId],
    enabled: !!issueId,
    queryFn: async () => {
      if (!issueId) {
        throw new Error('issueId is required');
      }
      const response = await taskApi.getExecutions(issueId);
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
    mutationFn: (variables: { issueId: string; data: UpdateTaskRequest }) =>
      taskApi.update(variables.issueId, variables.data),
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
    mutationFn: (variables: { issueId: string; data: AssignTaskAgentRequest }) =>
      taskApi.assignAgent(variables.issueId, variables.data),
    onSuccess: (task) => {
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['projectTasks', task.projectId] });
      }
      if (task?.id) {
        queryClient.invalidateQueries({ queryKey: ['task', task.id] });
        queryClient.invalidateQueries({ queryKey: ['taskExecutions', task.id] });
        // AI 指派会同步主负责人（TaskAssignee），负责人面板一并刷新
        queryClient.invalidateQueries({ queryKey: ['issue-assignees', task.id] });
      }
    },
  });
}

export function useCreateTaskExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { issueId: string; data: CreateTaskExecutionRequest }) =>
      taskApi.createExecution(variables.issueId, variables.data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taskExecutions', variables.issueId] });
      const issueId = response.execution.issueId;
      if (issueId) {
        queryClient.invalidateQueries({ queryKey: ['task', issueId] });
      }
    },
  });
}

export function useConfirmTaskExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      issueId: string;
      executionId: string;
      data: ConfirmTaskExecutionRequest;
    }) => taskApi.confirmExecution(variables.issueId, variables.executionId, variables.data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taskExecutions', variables.issueId] });
      const issueId = response.execution.issueId;
      if (issueId) {
        queryClient.invalidateQueries({ queryKey: ['task', issueId] });
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

export function useAddTaskDependency(issueId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskDependencyRequest) => {
      if (!issueId) {
        throw new Error('issueId is required');
      }
      return taskApi.addDependency(issueId, data);
    },
    onSuccess: (dependency) => {
      if (issueId) {
        queryClient.invalidateQueries({ queryKey: ['task', issueId] });
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

export function useRemoveTaskDependency(issueId: string | undefined, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dependencyId: string) => {
      if (!issueId) {
        throw new Error('issueId is required');
      }
      return taskApi.removeDependency(issueId, dependencyId);
    },
    onSuccess: () => {
      if (issueId) {
        queryClient.invalidateQueries({ queryKey: ['task', issueId] });
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
    mutationFn: (issueId: string) => taskApi.delete(issueId),
    onSuccess: (_, issueId) => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', issueId] });
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
    mutationFn: (variables: { issueId: string; status: string }) =>
      taskApi.update(variables.issueId, { status: variables.status }),
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

/** 通过 parentIssueId 获取子任务列表 */
export function useSubTasks(parentIssueId: string | undefined) {
  return useQuery({
    queryKey: ['subIssues', parentIssueId],
    enabled: !!parentIssueId,
    queryFn: async () => {
      if (!parentIssueId) return [];
      const result = await taskApi.getAllTasks({ parentIssueId, pageSize: 50 });
      return result?.data ?? [];
    },
  });
}

/** 创建子任务 (内部调用 useCreateTask, 自动补 parentIssueId) */
export function useCreateSubTask(options?: { onSuccess?: (task: Task) => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CreateTaskRequest, 'parentIssueId'> & { parentIssueId: string }) =>
      taskApi.create(data),
    onSuccess: (newTask, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subIssues', variables.parentIssueId] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.parentIssueId] });
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

