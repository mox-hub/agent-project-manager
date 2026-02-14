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

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: string;
  priority: TaskPriority;
  assignee?: TaskUserRef | null;
  reporter?: TaskUserRef | null;
  dueDate?: string | null;
  iterationId?: string | null;
  parentTaskId?: string | null;
  taskTags?: { tag: TaskTagRef }[];
  dependencies?: TaskDependencyRef[];
  blockedBy?: TaskDependencyRef[];
  _count?: TaskCounts;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListParams {
  status?: string | string[];
  assigneeId?: string;
  iterationId?: string;
  parentTaskId?: string;
  tag?: string | string[];
  q?: string;
  page?: number;
  pageSize?: number;
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
};

