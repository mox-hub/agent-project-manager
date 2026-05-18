import { api } from '@/infrastructure/api-client';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

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

export interface Task {
  id: string;
  projectId: string;
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
}

export interface TaskListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  filters?: {
    status?: string[];
    assigneeId?: string[];
    iterationId?: string[];
    tag?: string[];
  };
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
  projectId: string;
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

  getDetail: (taskId: string) => api.get<Task>(`/tasks/${taskId}`),

  getActivities: (taskId: string) =>
    api.get<TaskActivity[]>(`/tasks/${taskId}/activities`),

  create: (data: CreateTaskRequest) => api.post<Task>('/tasks', data),

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
};

