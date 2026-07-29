import { api } from '@/infrastructure/api-client';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'task' | 'bug';
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface TaskUserRef {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface TaskTagRef {
  id: string;
  name: string;
  color?: string | null;
}

export interface TaskCounts {
  subTasks?: number;
  dependencies?: number;
  comments?: number;
  attachments?: number;
}

export interface TaskDependencyRef {
  id: string;
  projectId: string;
  taskId: string;
  dependsOnTaskId: string;
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
  taskId: string;
  actorId?: string | null;
  type: string;
  timestamp: string;
  summary?: string | null;
  detail?: unknown;
  source?: string | null;
}

export type AIExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface MilestoneRef {
  id: string;
  name: string;
  status: string;
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
  reporter?: TaskUserRef | null;
  startDate?: string | null;
  dueDate?: string | null;
  iterationId?: string | null;
  parentTaskId?: string | null;
  taskTags?: { tag: TaskTagRef }[];
  dependencies?: TaskDependencyRef[];
  blockedBy?: TaskDependencyRef[];
  _count?: TaskCounts;
  estimate?: number | null;
  assigneeType: 'user' | 'ai_agent';
  aiAgentId?: string | null;
  aiSuggestion?: unknown | null;
  aiExecutionSpec?: unknown | null;
  aiExecutionResult?: unknown | null;
  aiExecutionStatus?: AIExecutionStatus | null;
  createdAt: string;
  updatedAt: string;
  // 新增字段
  type?: TaskType;
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
  parentTaskId?: string;
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
  /** Project ID (optional). 未选择时, 后端自动落到 inbox 项目 */
  projectId?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  reporterId?: string;
  iterationId?: string;
  parentTaskId?: string;
  startDate?: string;
  dueDate?: string;
  estimate?: number;
  tags?: string[];
  type?: TaskType;
  severity?: BugSeverity;
  milestoneId?: string;
  /** Phase 4: 模块代码, 2-4 位大写字母. 未选择项目时由后端 fallback 到 INBX */
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
  reporterId?: string;
  iterationId?: string;
  startDate?: string | null;
  dueDate?: string;
  estimate?: number;
  actualSpent?: number;
  tags?: string[];
  type?: TaskType;
  severity?: BugSeverity;
  milestoneId?: string;
  todoItems?: TodoItem[];
  bugReproducibility?: string;
  bugStepsToReproduce?: string;
  bugEnvironment?: string;
  bugExpectedResult?: string;
  bugActualResult?: string;
}

export interface CreateTaskDependencyRequest {
  dependsOnTaskId: string;
  type?: 'blocks' | 'relates';
}

export const taskApi = {
  getProjectTasks: (projectId: string, params?: TaskListParams) =>
    api.get<TaskListResponse>(`/projects/${projectId}/tasks`, params),

  getProjectIterations: (projectId: string) =>
    api.get<IterationRef[]>(`/projects/${projectId}/iterations`),

  getProjectMilestones: (projectId: string) =>
    api.get<MilestoneRef[]>(`/projects/${projectId}/milestones`),

  getDetail: (taskId: string) => api.get<Task>(`/tasks/${taskId}`),

  getActivities: (taskId: string) =>
    api.get<TaskActivity[]>(`/tasks/${taskId}/activities`),

  create: (data: CreateTaskRequest) => api.post<Task>('/tasks', data),

  createActivity: (taskId: string, data: { type: string; content?: string; summary?: string }) =>
    api.post<TaskActivity>(`/tasks/${taskId}/activities`, data),

  update: (taskId: string, data: UpdateTaskRequest) =>
    api.patch<Task>(`/tasks/${taskId}`, data),

  addDependency: (taskId: string, data: CreateTaskDependencyRequest) =>
    api.post<TaskDependencyRef>(`/tasks/${taskId}/dependencies`, data),

  removeDependency: (taskId: string, dependencyId: string) =>
    api.delete<void>(`/tasks/${taskId}/dependencies/${dependencyId}`),

  delete: (taskId: string) =>
    api.delete<void>(`/tasks/${taskId}`),

  importTasks: (tasks: CreateTaskRequest[]) =>
    api.post<{ imported: number; tasks: Task[] }>('/tasks/import', { tasks }),

  exportTasks: (projectId: string, format: 'csv' | 'json' = 'csv') =>
    api.get<Task[]>(`/tasks/export`, { projectId, format }),

  // ─── Bug APIs ──────────────────────────────────────────

  getProjectBugs: (projectId: string, params?: TaskListParams) =>
    api.get<TaskListResponse>(`/projects/${projectId}/bugs`, params),

  getAllBugs: (params?: TaskListParams) =>
    api.get<TaskListResponse>('/tasks/bugs', params),

  /**
   * 跨项目查询所有 task + bug (默认 type=all)
   * 用于全局任务管理页面, 同时返回未绑定项目的任务 (inbox)
   */
  getAllTasks: (params?: TaskListParams & { type?: 'task' | 'bug' | 'all' }) =>
    api.get<TaskListResponse>('/tasks/all', params),

  /**
   * 跨项目查询当前用户有权限访问的 task/bug
   * 用于文档关联面板: 即便文档无 project 也能拿到可选清单
   */
  getAccessibleTasks: (params?: TaskListParams & { projectId?: string; type?: 'task' | 'bug' | 'all' }) =>
    api.get<TaskListResponse>('/tasks/accessible', params),

  // ─── AI Worker APIs ──────────────────────────────────────────

  /** AI agent claims a task */
  claimForAI: (taskId: string, data: { aiAgentId: string; aiExecutionSpec?: unknown }) =>
    api.post<Task>(`/tasks/${taskId}/claim`, data),

  /** Submit AI suggestion for a task */
  submitAISuggestion: (taskId: string, data: { aiSuggestion: unknown; aiExecutionSpec?: unknown }) =>
    api.post<Task>(`/tasks/${taskId}/ai-suggestion`, data),

  /** Submit AI execution result */
  submitAIExecutionResult: (taskId: string, data: { aiExecutionResult: unknown; aiExecutionStatus: 'completed' | 'failed'; error?: string }) =>
    api.post<Task>(`/tasks/${taskId}/ai-execution-result`, data),

  /** Find tasks discoverable by AI agents */
  findAIDiscoverableTasks: (projectId: string, params?: { status?: string; priority?: string }) =>
    api.get<Task[]>(`/tasks/ai-discoverable`, { projectId, ...params }),
};

