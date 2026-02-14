import { api } from '@/infrastructure/api-client';

export type ProjectType = 'personal' | 'team' | 'experiment' | 'enterprise';
export type ProjectVisibility = 'private' | 'internal' | 'public';
export type ProjectStatus = 'active' | 'archived';

export interface ProjectMemberUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface ProjectMember {
  user: ProjectMemberUser;
  role: string;
}

export interface ProjectCounts {
  tasks?: number;
  iterations?: number;
  milestones?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  type: ProjectType;
  visibility: ProjectVisibility;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  _count?: ProjectCounts;
}

export interface ProjectListParams {
  q?: string;
  status?: ProjectStatus;
  type?: ProjectType;
  memberId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  type: ProjectType;
  visibility: ProjectVisibility;
  templateId?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  type?: ProjectType;
  visibility?: ProjectVisibility;
}

export interface ProjectListResponse {
  data: Project[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export const projectApi = {
  getList: (params?: ProjectListParams) =>
    api.get<ProjectListResponse>('/projects', params),

  getDetail: (projectId: string) =>
    api.get<Project>(`/projects/${projectId}`),

  create: (data: CreateProjectRequest) =>
    api.post<Project>('/projects', data),

  update: (projectId: string, data: UpdateProjectRequest) =>
    api.patch<Project>(`/projects/${projectId}`, data),
};

