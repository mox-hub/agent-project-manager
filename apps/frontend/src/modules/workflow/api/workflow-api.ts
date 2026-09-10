/**
 * Workflow API——与后端 apps/server/src/modules/workflow/ 对应的 REST 面。
 * 响应形状对齐 openapi 契约（WorkflowSummaryDto / WorkflowRunDto 族）。
 */

import { api } from '@/infrastructure/api-client';

export interface WorkflowSummary {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  version: number;
}

export interface WorkflowStepSummary {
  id: string;
  type: string;
  title?: string;
}

export interface WorkflowDetail extends WorkflowSummary {
  definition: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  /** 服务端解析出的步骤摘要（文法非法时为空数组） */
  stepsSummary?: WorkflowStepSummary[];
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  projectId?: string | null;
  issueId?: string | null;
  triggerType: string;
  status: string;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  stepsState?: Record<string, unknown> | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  workflow?: { id: string; key: string; name: string };
}

export interface WorkflowRunsPage {
  data: WorkflowRun[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** status=suspended 时的人工确认待办 */
export interface WorkflowRunDetail extends WorkflowRun {
  waitingApproval?: { stepId: string; title?: string; message: string } | null;
}

export interface TriggerWorkflowRequest {
  projectId?: string;
  issueId?: string;
  parameters?: Record<string, unknown>;
  triggerType?: string;
}

export interface ResumeWorkflowRequest {
  resumeData: Record<string, unknown>;
}

/** 产品动作目录项（CAP-A-12 节点库，GET /workflows/actions） */
export interface WorkflowActionInfo {
  id: string;
  title: string;
  description: string;
  requiredParams: string[];
  inputHint: Record<string, string>;
}

export interface CreateWorkflowRequest {
  key: string;
  name: string;
  description?: string;
  definition: Record<string, unknown>;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  definition?: Record<string, unknown>;
}

export const workflowApi = {
  listDefinitions: () => api.get<WorkflowSummary[]>('/workflows'),

  getDefinition: (id: string) => api.get<WorkflowDetail>(`/workflows/${id}`),

  createWorkflow: (data: CreateWorkflowRequest) =>
    api.post<{ id: string; key: string; version: number }>('/workflows', data),

  updateWorkflow: (id: string, data: UpdateWorkflowRequest) =>
    api.patch<{ id: string; key: string; version: number; stepsSummary?: WorkflowStepSummary[] }>(
      `/workflows/${id}`,
      data,
    ),

  listActions: () => api.get<WorkflowActionInfo[]>('/workflows/actions'),

  triggerRun: (id: string, data: TriggerWorkflowRequest) =>
    api.post<{ workflowRunId: string; status: string }>(`/workflows/${id}/run`, data),

  listRuns: (query: Record<string, string | number | undefined>) =>
    api.get<WorkflowRunsPage>('/workflow-runs', query),

  getRun: (id: string) => api.get<WorkflowRunDetail>(`/workflow-runs/${id}`),

  resumeRun: (id: string, data: ResumeWorkflowRequest) =>
    api.post<{ workflowRunId: string; status: string }>(
      `/workflow-runs/${id}/resume`,
      data,
    ),
};
