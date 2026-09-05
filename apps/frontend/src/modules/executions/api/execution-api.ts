/**
 * 执行模块 API —— /execution/* 真实契约形状
 *
 * list:   GET /execution/runs → { runs, total }（projectId 缺省 = 用户为成员的全部项目）
 * detail: GET /execution/runs/:id（含 steps/artifacts/approvals/bindings）
 * events: GET /execution/runs/:id/events（守护进程路径事件流水，token 流式事件不落库）
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';

/** 服务端 ExecutionRun.status 全集（prisma schema 注释枚举） */
export type ExecutionRunStatus =
  | 'draft'
  | 'planned'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'superseded';

/** 终态：命中即停轮询/停刷新 */
export const RUN_TERMINAL_STATUSES = ['completed', 'failed', 'blocked', 'superseded'];

export function isTerminalRunStatus(status?: string | null): boolean {
  return !!status && RUN_TERMINAL_STATUSES.includes(status);
}

export interface ExecutionRunRecord {
  id: string;
  projectId: string;
  taskId?: string | null;
  subjectType: string; // human | platform_ai_member | external_agent
  subjectId: string;
  subjectName?: string | null;
  identitySource: string; // internal | mcp | cli | api | plugin
  goal: string;
  role?: string | null;
  level?: string | null;
  status: ExecutionRunStatus;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  errorDetail?: Record<string, unknown> | null;
  startedAt?: string | null;
  completedAt?: string | null;
  terminatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  totalTokens?: number | null;
  totalCost?: number | null;
  costBreakdown?: {
    byModel?: Record<string, { tokens?: number; cost?: number }>;
  } | null;
  metadata?: Record<string, unknown> | null;
  acceptanceId?: string | null;
  project?: { id: string; name: string };
  task?: { id: string; title: string } | null;
}

export interface ExecutionStepRecord {
  id: string;
  executionRunId: string;
  stepType: string; // tool_call | observation | thinking | approval_gate | error | result
  sequence: number;
  name?: string | null;
  input?: unknown;
  output?: unknown;
  status: string; // pending | running | completed | failed | skipped
  startedAt?: string | null;
  completedAt?: string | null;
  duration?: number | null; // 毫秒
  metadata?: Record<string, unknown> | null;
}

export interface ExecutionArtifactRecord {
  id: string;
  executionRunId: string;
  stepId?: string | null;
  artifactType: string; // code_diff | command_output | file_path | screenshot | log | report | test_report
  name: string;
  content?: string | null;
  storageRef?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface CliExecutionBindingRecord {
  id: string;
  executionRunId: string;
  cliSessionId?: string | null;
  runtimeId: string;
  providerId: string;
  workspaceRoot?: string | null;
  bindingMode: string; // one-time | session-reuse
  status: string;
  createdAt: string;
}

export interface ExecutionRunDetail extends ExecutionRunRecord {
  steps: ExecutionStepRecord[];
  artifacts: ExecutionArtifactRecord[];
  bindings: CliExecutionBindingRecord[];
}

/** 守护进程路径事件流水条目（SystemEvent runtime.execution.event 投影） */
export interface ExecutionRunEvent {
  id: string;
  level: string;
  eventType: string;
  status?: string;
  summary?: string;
  stepId?: string;
  errorCode?: string;
  timestamp?: string;
  createdAt: string;
}

export const executionKeys = {
  all: ['executions'] as const,
  runs: (params?: Record<string, unknown>) =>
    [...executionKeys.all, 'runs', params ?? {}] as const,
  detail: (id: string) => [...executionKeys.all, 'run', id] as const,
  events: (id: string) => [...executionKeys.all, 'run-events', id] as const,
};

export function useExecutionRuns(params?: {
  projectId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: executionKeys.runs(params),
    queryFn: async () => {
      // api.get 自动解后端信封；data 形如 { runs, total }
      const data = await api.get<{
        runs?: ExecutionRunRecord[];
        total?: number;
      }>('/execution/runs', params);
      return { runs: data?.runs ?? [], total: data?.total ?? 0 };
    },
  });
}

export function useExecutionRunDetail(id?: string | null) {
  return useQuery({
    queryKey: executionKeys.detail(id ?? ''),
    queryFn: () => api.get<ExecutionRunDetail>(`/execution/runs/${id}`),
    enabled: !!id,
  });
}

/** 事件流水：active（运行未到终态）时 5s 轮询跟随 */
export function useExecutionRunEvents(id?: string | null, active?: boolean) {
  return useQuery({
    queryKey: executionKeys.events(id ?? ''),
    queryFn: async () => {
      const data = await api.get<{ events?: ExecutionRunEvent[] }>(
        `/execution/runs/${id}/events`,
      );
      return data?.events ?? [];
    },
    enabled: !!id,
    refetchInterval: active ? 5000 : false,
  });
}

export const executionApi = {
  cancel: (id: string, reason?: string): Promise<unknown> => {
    return api.post(`/execution/runs/${id}/cancel`, { reason });
  },
};
