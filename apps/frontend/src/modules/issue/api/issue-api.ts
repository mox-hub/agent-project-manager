import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';

/**
 * 请求体类型单源于 openapi 契约（components.schemas 的 DTO）；形状与契约
 * 不一致（可空性、Record<string, never>、契约必填 type 等）的端点仍维持手写。
 */

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'task' | 'bug';
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface TaskUserRef {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

/** 任务 AI 归因（V3：aiAgentId 即 Member.id，名字取自 Member.displayName） */
export interface AgentIdentityRef {
  id: string;
  name: string;
  type: 'ai_agent';
  status: 'active' | 'inactive' | 'suspended';
}

export interface TaskTagRef {
  id: string;
  name: string;
  color?: string | null;
}

export interface TaskCounts {
  subIssues?: number;
  dependencies?: number;
  comments?: number;
  attachments?: number;
}

export interface TaskDependencyRef {
  id: string;
  projectId: string;
  issueId: string;
  dependsOnIssueId: string;
  type: 'blocks' | 'relates';
  createdAt: string;
  dependsOnTask?: {
    id: string;
    title: string;
    status: string;
  };
  task?: {
    id: string;
    title: string;
    status: string;
  };
}

export interface TaskActivity {
  id: string;
  projectId: string;
  issueId: string;
  actorId?: string | null;
  type: string;
  timestamp: string;
  summary?: string | null;
  detail?: unknown;
  source?: string | null;
}


export interface MilestoneTaskRef {
  id: string;
  title: string;
  status: string;
  priority?: string;
}

export interface MilestoneRef {
  id: string;
  name: string;
  status: string;
  targetDate?: string | null;
  description?: string | null;
  taskCount?: number;
  tasks?: MilestoneTaskRef[];
}

export interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: TaskPriority;
  assignee?: TaskUserRef | null;
  assigneeType?: 'user' | 'ai_agent';
  aiAgentId?: string | null;
  aiAgent?: AgentIdentityRef | null;
  reporter?: TaskUserRef | null;
  startDate?: string | null;
  dueDate?: string | null;
  iterationId?: string | null;
  parentIssueId?: string | null;
  issueTags?: { tag: TaskTagRef }[];
  dependencies?: TaskDependencyRef[];
  blockedBy?: TaskDependencyRef[];
  _count?: TaskCounts;
  estimate?: number | null;
  createdAt: string;
  updatedAt: string;
  // 新增字段
  type?: TaskType;
  /** 工单类型（IssueType 适配引擎）事实源 */
  typeId?: string | null;
  severity?: BugSeverity;
  milestoneId?: string | null;
  milestone?: MilestoneRef | null;
  todoItems?: TodoItem[];
  // Phase 4: 短 ID
  shortId?: string | null;
  // Bug 专用字段
  bugReproducibility?: string;
  bugStepsToReproduce?: string;
  bugEnvironment?: string;
  bugExpectedResult?: string;
  bugActualResult?: string;
  // 任务提供商（Linear / Jira）字段
  externalProvider?: string | null;
  externalIssueId?: string | null;
  externalIdentifier?: string | null;
  externalUrl?: string | null;
  syncStatus?: 'synced' | 'pending' | 'error' | 'conflict' | null;
  lastExternalSyncAt?: string | null;
  localUpdatedAt?: string | null;
  /** 自定义字段（键集 = 所属 IssueType.fieldSchema；适配引擎二期） */
  customFields?: Record<string, unknown> | null;
}

export interface TaskListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  type?: TaskType;
  severity?: BugSeverity;
  filters?: {
    status?: string[];
    assigneeId?: string[];
    iterationId?: string[];
    tag?: string[];
  };
  parentIssueId?: string;
}

export interface IterationRef {
  id: string;
  name: string;
  status: string;
}

export interface TaskListResponse {
  data: Task[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface CreateTaskRequest {
  /** Project ID (optional). 未选择时落为无项目任务（projectId = null） */
  projectId?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  assigneeType?: 'user' | 'ai_agent';
  aiAgentId?: string | null;
  reporterId?: string;
  iterationId?: string;
  parentIssueId?: string;
  startDate?: string;
  dueDate?: string;
  estimate?: number;
  tags?: string[];
  // Task Details
  type?: TaskType;
  severity?: BugSeverity;
  milestoneId?: string;
  /** Phase 4: 模块代码, 2-4 位大写字母（两段式 shortID 后不再参与编号） */
  moduleCode?: string;
  todoItems?: TodoItem[];
  bugReproducibility?: string;
  bugStepsToReproduce?: string;
  bugEnvironment?: string;
  bugExpectedResult?: string;
  bugActualResult?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  assigneeType?: 'user' | 'ai_agent';
  aiAgentId?: string | null;
  reporterId?: string;
  iterationId?: string;
  startDate?: string | null;
  dueDate?: string;
  estimate?: number;
  actualSpent?: number;
  tags?: string[];
  // Task Details
  type?: TaskType;
  severity?: BugSeverity;
  milestoneId?: string;
  todoItems?: TodoItem[];
  bugReproducibility?: string;
  bugStepsToReproduce?: string;
  bugEnvironment?: string;
  bugExpectedResult?: string;
  bugActualResult?: string;
  /** 自定义字段整体提交（顶层键合并、null 删除；需提交完整键集） */
  customFields?: Record<string, unknown> | null;
  /** 4d 关单软强制：置终态存在未完成执行项时，force=true 显式放行 */
  force?: boolean;
}

export type AssignTaskAgentRequest = RequestBodyOf<'IssueController_assignAgent'>;

export interface TaskExecutionRun {
  id: string;
  projectId?: string | null;
  issueId?: string | null;
  subjectType?: 'human' | 'platform_ai_member' | 'external_agent' | string;
  subjectId?: string | null;
  requestedBy?: string | null;
  actorType?: string | null;
  goal: string;
  status:
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'running'
    | 'completed'
    | 'failed';
  requiresApproval: boolean;
  input?: Record<string, unknown> | null;
  contextPack?: Record<string, unknown> | null;
  plan?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  approvalRequests?: ApprovalRequest[];
}

export interface ApprovalRequest {
  id: string;
  executionRunId: string;
  projectId?: string | null;
  issueId?: string | null;
  actionType: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy?: string | null;
  decidedBy?: string | null;
  reason?: string | null;
  requestPayload?: Record<string, unknown> | null;
  decisionPayload?: Record<string, unknown> | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskExecutionRequest {
  goal?: string;
  input?: Record<string, unknown>;
  plan?: Record<string, unknown>;
  contextPack?: Record<string, unknown>;
  requiresApproval?: boolean;
  actionType?: string;
  approvalReason?: string;
}

export interface ConfirmTaskExecutionRequest {
  decision: 'approved' | 'rejected';
  comment?: string;
  decisionPayload?: Record<string, unknown>;
}

export interface CreateTaskExecutionResponse {
  execution: TaskExecutionRun;
  approvalRequest?: ApprovalRequest | null;
  contextPack?: Record<string, unknown> | null;
}

export type CreateTaskDependencyRequest =
  RequestBodyOf<'IssueController_addDependency'>;

export const taskApi = {
  getProjectTasks: (projectId: string, params?: TaskListParams) =>
    api.get<TaskListResponse>(`/projects/${projectId}/issues`, params),

  getProjectIterations: (projectId: string) =>
    api.get<IterationRef[]>(`/projects/${projectId}/iterations`),

  getProjectMilestones: (projectId: string) =>
    api.get<MilestoneRef[]>(`/projects/${projectId}/milestones`),

  getDetail: (issueId: string) => api.get<Task>(`/issues/${issueId}`),

  getActivities: (issueId: string) =>
    api.get<TaskActivity[]>(`/issues/${issueId}/activities`),

  create: (data: CreateTaskRequest) => api.post<Task>('/issues', data),

  createActivity: (issueId: string, data: { type: string; content?: string; summary?: string }) =>
    api.post<TaskActivity>(`/issues/${issueId}/activities`, data),

  update: (issueId: string, data: UpdateTaskRequest) =>
    api.patch<Task>(`/issues/${issueId}`, data),

  assignAgent: (issueId: string, data: AssignTaskAgentRequest) =>
    api.post<Task>(`/issues/${issueId}/assign-agent`, data),

  getExecutions: (issueId: string) =>
    api.get<TaskExecutionRun[]>(`/issues/${issueId}/executions`),

  createExecution: (issueId: string, data: CreateTaskExecutionRequest) =>
    api.post<CreateTaskExecutionResponse>(`/issues/${issueId}/executions`, data),

  confirmExecution: (
    issueId: string,
    executionId: string,
    data: ConfirmTaskExecutionRequest,
  ) =>
    api.post<CreateTaskExecutionResponse>(
      `/issues/${issueId}/executions/${executionId}/confirm`,
      data,
    ),

  addDependency: (issueId: string, data: CreateTaskDependencyRequest) =>
    api.post<TaskDependencyRef>(`/issues/${issueId}/dependencies`, data),

  removeDependency: (issueId: string, dependencyId: string) =>
    api.delete<void>(`/issues/${issueId}/dependencies/${dependencyId}`),

  delete: (issueId: string) =>
    api.delete<void>(`/issues/${issueId}`),

  importTasks: (tasks: CreateTaskRequest[]) =>
    api.post<{ imported: number; tasks: Task[] }>('/issues/import', { tasks }),

  exportTasks: (projectId: string, format: 'csv' | 'json' = 'csv') =>
    api.get<Task[]>(`/issues/export`, { projectId, format }),

  // ─── Bug APIs ──────────────────────────────────────────

  getProjectBugs: (projectId: string, params?: TaskListParams) =>
    api.get<TaskListResponse>(`/projects/${projectId}/bugs`, params),

  getAllBugs: (params?: TaskListParams) =>
    api.get<TaskListResponse>('/issues/bugs', params),

  /**
   * 跨项目查询所有 task + bug (默认 type=all)
   * 用于全局任务管理页面, 同时返回未绑定项目的任务 (inbox)
   */
  getAllTasks: (params?: TaskListParams & { type?: 'task' | 'bug' | 'all' }) =>
    api.get<TaskListResponse>('/issues/all', params),

  /**
   * 跨项目查询当前用户有权限访问的 task/bug
   * 用于文档关联面板: 即便文档无 project 也能拿到可选清单
   */
  getAccessibleTasks: (params?: TaskListParams & { projectId?: string; type?: 'task' | 'bug' | 'all' }) =>
    api.get<TaskListResponse>('/issues/accessible', params),

  // ─── Task ID 管理 APIs ──────────────────────────────────────────

  /** 获取 shortId 统计信息 */
  getShortIdStats: () =>
    api.get<{ total: number; withShortId: number; withoutShortId: number }>('/issues/admin/short-id-stats'),

  /** 补充缺少 shortId 的任务 */
  backfillShortIds: () =>
    api.post<{ success: boolean; total: number; successCount: number; failed: number; errors: string[] }>('/issues/admin/backfill-short-ids'),
};

