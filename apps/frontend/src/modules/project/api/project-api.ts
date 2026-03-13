import { api } from '@/infrastructure/api-client';

export type ProjectType = 'personal' | 'team' | 'experiment' | 'enterprise';
export type ProjectVisibility = 'private' | 'internal' | 'public';
export type ProjectStatus = 'active' | 'archived';
export type ProjectSource = 'local' | 'github_projects' | 'linear' | 'jira';

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

export interface ExternalProjectLink {
  id: string;
  provider: 'github_projects' | 'linear' | 'jira';
  externalProjectId: string;
  externalProjectUrl: string;
  syncConfig?: Record<string, unknown>;
  lastSyncAt?: string;
  syncStatus: 'active' | 'paused' | 'error';
}

export interface ProjectDocLink {
  id: string;
  label: string;
  url: string;
  type: 'wiki' | 'spec' | 'design' | 'other';
  description?: string;
  aiIndexed: boolean;
  createdAt: string;
}

export interface ProjectApiDocLink {
  id: string;
  label: string;
  url: string;
  type: 'openapi' | 'apifox' | 'postman' | 'other';
  description?: string;
  aiIndexed: boolean;
  createdAt: string;
}

export interface ProjectHealthSnapshot {
  id: string;
  date: string;
  healthScore: number;
  breakdown: {
    iterationCompletionRate: number;
    overdueTaskRatio: number;
    ciSuccessRate: number;
    commitActivity: number;
    blockedTaskRatio: number;
  };
}

export interface ProjectAIContext {
  id: string;
  techStack: string[];
  languages: string[];
  frameworks: string[];
  domainTags: string[];
  teamSizeCategory: 'solo' | 'small' | 'medium' | 'large';
  lifecyclePhase: 'inception' | 'development' | 'maintenance' | 'sunset';
  complexityLevel: 'low' | 'medium' | 'high' | 'critical';
  riskIndicators: {
    overdueTaskRatio: number;
    blockedTaskCount: number;
    velocityTrend: 'up' | 'stable' | 'down';
    ciFailureRate: number;
  };
  healthScore: number;
  autoSummary: string;
  lastComputedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  type: ProjectType;
  visibility: ProjectVisibility;
  status: ProjectStatus;
  source?: ProjectSource;
  healthScore?: number;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  _count?: ProjectCounts;
  externalProjectLinks?: ExternalProjectLink[];
  docLinks?: ProjectDocLink[];
  apiDocLinks?: ProjectApiDocLink[];
  healthSnapshots?: ProjectHealthSnapshot[];
  aiContext?: ProjectAIContext;
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

export interface ExternalProjectLinkRequest {
  provider: 'github_projects' | 'linear' | 'jira';
  externalProjectId: string;
  externalProjectUrl: string;
  syncConfig?: Record<string, unknown>;
}

export interface ProjectDocLinkRequest {
  label: string;
  url: string;
  type: 'wiki' | 'spec' | 'design' | 'other';
  description?: string;
  aiIndexed?: boolean;
}

export interface ProjectApiDocLinkRequest {
  label: string;
  url: string;
  type: 'openapi' | 'apifox' | 'postman' | 'other';
  description?: string;
  aiIndexed?: boolean;
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

  // External project links
  getExternalLinks: (projectId: string) =>
    api.get<ExternalProjectLink[]>(`/projects/${projectId}/external-links`),

  addExternalLink: (projectId: string, data: ExternalProjectLinkRequest) =>
    api.post<ExternalProjectLink>(`/projects/${projectId}/external-links`, data),

  updateExternalLink: (projectId: string, linkId: string, data: Partial<ExternalProjectLinkRequest>) =>
    api.patch<ExternalProjectLink>(`/projects/${projectId}/external-links/${linkId}`, data),

  deleteExternalLink: (projectId: string, linkId: string) =>
    api.delete<void>(`/projects/${projectId}/external-links/${linkId}`),

  // Document links
  getDocLinks: (projectId: string) =>
    api.get<ProjectDocLink[]>(`/projects/${projectId}/doc-links`),

  addDocLink: (projectId: string, data: ProjectDocLinkRequest) =>
    api.post<ProjectDocLink>(`/projects/${projectId}/doc-links`, data),

  updateDocLink: (projectId: string, linkId: string, data: Partial<ProjectDocLinkRequest>) =>
    api.patch<ProjectDocLink>(`/projects/${projectId}/doc-links/${linkId}`, data),

  deleteDocLink: (projectId: string, linkId: string) =>
    api.delete<void>(`/projects/${projectId}/doc-links/${linkId}`),

  // API doc links
  getApiDocLinks: (projectId: string) =>
    api.get<ProjectApiDocLink[]>(`/projects/${projectId}/api-doc-links`),

  addApiDocLink: (projectId: string, data: ProjectApiDocLinkRequest) =>
    api.post<ProjectApiDocLink>(`/projects/${projectId}/api-doc-links`, data),

  updateApiDocLink: (projectId: string, linkId: string, data: Partial<ProjectApiDocLinkRequest>) =>
    api.patch<ProjectApiDocLink>(`/projects/${projectId}/api-doc-links/${linkId}`, data),

  deleteApiDocLink: (projectId: string, linkId: string) =>
    api.delete<void>(`/projects/${projectId}/api-doc-links/${linkId}`),

  // Health snapshots
  getHealthSnapshots: (projectId: string, days?: number) =>
    api.get<ProjectHealthSnapshot[]>(`/projects/${projectId}/health-snapshots`, { days }),

  // AI Context
  getAIContext: (projectId: string) =>
    api.get<ProjectAIContext>(`/projects/${projectId}/ai-context`),

  refreshAIContext: (projectId: string) =>
    api.post<ProjectAIContext>(`/projects/${projectId}/ai-context/refresh`, {}),
};

