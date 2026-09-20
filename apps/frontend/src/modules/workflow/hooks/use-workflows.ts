/**
 * Workflow Hooks——定义/runs 查询 + 触发/恢复 mutation。
 * 进度失效经 eventClient 的 `ai.workflow.update` 广播（EventsGateway 全局推）。
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventClient } from '@/infrastructure/event-client';
import {
  workflowApi,
  type CreateWorkflowRequest,
  type ResumeWorkflowRequest,
  type TriggerWorkflowRequest,
  type UpdateWorkflowRequest,
} from '../api/workflow-api';

export const workflowKeys = {
  all: ['workflows'] as const,
  definitions: () => [...workflowKeys.all, 'definitions'] as const,
  definition: (id: string) => [...workflowKeys.all, 'definitions', id] as const,
  runs: (filters?: Record<string, unknown>) =>
    [...workflowKeys.all, 'runs', filters ?? {}] as const,
  run: (id: string) => [...workflowKeys.all, 'runs', 'detail', id] as const,
};

/** 订阅引擎进度推送 → 失效 runs/详情查询（页面级挂一次即可） */
export function useWorkflowEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const handler = (payload: unknown) => {
      const { workflowRunId } = (payload ?? {}) as { workflowRunId?: string };
      queryClient.invalidateQueries({ queryKey: workflowKeys.runs() });
      if (workflowRunId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.run(workflowRunId) });
      }
    };
    eventClient.on('ai.workflow.update', handler);
    return () => eventClient.off('ai.workflow.update', handler);
  }, [queryClient]);
}

export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.definitions(),
    queryFn: () => workflowApi.listDefinitions(),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.definition(id),
    queryFn: () => workflowApi.getDefinition(id),
    enabled: Boolean(id),
  });
}

export function useWorkflowRuns(filters: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: workflowKeys.runs(filters),
    queryFn: () => workflowApi.listRuns(filters),
    placeholderData: (prev) => prev,
  });
}

export function useWorkflowRun(runId: string | null) {
  return useQuery({
    queryKey: workflowKeys.run(runId ?? ''),
    queryFn: () => workflowApi.getRun(runId as string),
    enabled: Boolean(runId),
    // socket 推送之外的兜底：运行中/待确认时 5s 轮询，其余停止
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)?.status;
      return status === 'running' || status === 'suspended' ? 5_000 : false;
    },
  });
}

export function useTriggerWorkflow(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TriggerWorkflowRequest) => workflowApi.triggerRun(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.runs() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.definition(id) });
    },
  });
}

export function useResumeWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, data }: { runId: string; data: ResumeWorkflowRequest }) =>
      workflowApi.resumeRun(runId, data),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.run(vars.runId) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.runs() });
    },
  });
}

/** 产品动作目录（节点库下拉与 AI 草拟共用） */
export function useWorkflowActions() {
  return useQuery({
    queryKey: [...workflowKeys.all, 'actions'],
    queryFn: () => workflowApi.listActions(),
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowRequest) => workflowApi.createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWorkflowRequest) => workflowApi.updateWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.definition(id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}
