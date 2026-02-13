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

export const taskApi = {
  getProjectTasks: (projectId: string, params?: TaskListParams) =>
    api.get<Task[]>(`/projects/${projectId}/tasks`, params),

  create: (data: CreateTaskRequest) => api.post<Task>('/tasks', data),

  update: (taskId: string, data: UpdateTaskRequest) =>
    api.patch<Task>(`/tasks/${taskId}`, data),
};

