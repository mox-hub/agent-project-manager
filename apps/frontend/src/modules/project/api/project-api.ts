import { api } from '@/infrastructure/api-client';

export type ProjectType = 'personal' | 'team' | 'experiment' | 'enterprise';
export type ProjectVisibility = 'private' | 'internal' | 'public';
export type ProjectStatus = 'active' | 'archived';
export type ProjectSource = 'local' | 'github_projects' | 'linear' | 'jira';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectWorkflowStatus =
  | 'backlog'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'canceled';
export type ProjectHealthStatus = 'on_track' | 'at_risk' | 'off_track';
export type ProjectRiskLevel = 'low' | 'medium' | 'high' | 'critical';

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

export interface ProjectOwner {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
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

export interface ProjectIterationSummary {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface ProjectMilestoneSummary {
  id: string;
  name: string;
  status: string;
  targetDate?: string | null;
}

export interface ProjectDashboardSummary {
  projectMeta: {
    id: string;
    name: string;
    description?: string | null;
    type: ProjectType;
    status: ProjectStatus;
    priority?: ProjectPriority;
    visibility: ProjectVisibility;
    healthStatus?: ProjectHealthStatus;
    riskLevel?: ProjectRiskLevel;
    color?: string | null;
    icon?: string | null;
    startDate?: string | null;
    targetDate?: string | null;
    owner?: ProjectOwner | null;
    members: ProjectMember[];
  };
  taskStats: {
    total: number;
    todo: number;
    inProgress: number;
    inReview: number;
    done: number;
    overdue: number;
  };
  boardPreview: Array<{
    id: 'todo' | 'in_progress' | 'in_review' | 'done';
    title: string;
    count: number;
    tasks: Array<{
      id: string;
      title: string;
      priority: TaskPriority;
      assignee: {
        id: string;
        displayName: string;
        avatarUrl: string | null;
      } | null;
      dueDate: string | null;
    }>;
  }>;
  health: {
    currentScore: number;
    trend30d: number;
    latestBreakdown: Record<string, number> | null;
    details?: HealthDetailMetric[];
    lastEvaluatedAt?: string | null;
  };
  ai: {
    score: number;
    complexity: string | null;
    lifecycle: string | null;
    teamSize: string | null;
    summary: string | null;
    lastComputedAt: string | null;
    details?: AiDetailBreakdown;
  };
  analytics?: ProjectAnalytics;
  teamWorkload: Array<{
    memberId: string;
    memberName: string;
    avatarUrl: string | null;
    taskCount: number;
    percentage: number;
    status: 'normal' | 'high' | 'low';
  }>;
  activityFeed: Array<{
    id: string;
    type: string;
    summary: string;
    source: string;
    timestamp: string;
    taskId: string;
  }>;
  milestones: ProjectMilestoneSummary[];
  iterations: ProjectIterationSummary[];
  integrations: {
    repositories: Array<{
      id: string;
      name: string;
      provider?: string | null;
      remoteUrl?: string | null;
      validationStatus: string;
    }>;
    externalLinksCount: number;
    docLinksCount: number;
    apiDocLinksCount: number;
  };
}

export interface HealthDetailMetric {
  key: string;
  label: string;
  score: number;
  weight: number;
  status: 'on_track' | 'stable' | 'high' | 'action_needed' | 'pending';
  trend?: number;
  source: 'health_snapshot' | 'task_aggregation' | 'doc_links' | 'ai_context' | 'pending_integration';
  available: boolean;
}

export interface AnalyticsDistributionItem {
  key: string;
  label: string;
  value: number;
}

export interface ProjectAnalytics {
  deliveryTimeline: Array<{
    date: string;
    healthScore: number;
    deliveryScore: number;
    completionRate: number;
  }>;
  workloadDistribution: AnalyticsDistributionItem[];
  aiRiskDistribution: AnalyticsDistributionItem[];
  aiComplexityDistribution: AnalyticsDistributionItem[];
}

export interface AiDetailBreakdown {
  riskBreakdown: AnalyticsDistributionItem[];
  complexityBreakdown: AnalyticsDistributionItem[];
}

export interface CreateMilestoneRequest {
  name: string;
  description?: string;
  targetDate?: string | null;
  iterationId?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
}

type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

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
  projectCode?: string | null;
  icon?: string | null;
  color?: string | null;
  type: ProjectType;
  visibility: ProjectVisibility;
  status: ProjectStatus;
  source?: ProjectSource;
  priority?: ProjectPriority;
  workflowStatus?: ProjectWorkflowStatus;
  healthStatus?: ProjectHealthStatus;
  riskLevel?: ProjectRiskLevel;
  progress?: number;
  ownerId?: string | null;
  owner?: ProjectOwner | null;
  startDate?: string | null;
  targetDate?: string | null;
  completedAt?: string | null;
  category?: string | null;
  estimatePoints?: number | null;
  lastActivityAt?: string | null;
  blockedReason?: string | null;
  healthScore?: number;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  /** 所属团队（列表接口由 TeamProject 联表拼装返回） */
  teams?: Array<{ id: string; name: string; color?: string | null }>;
  _count?: ProjectCounts;
  externalProjectLinks?: ExternalProjectLink[];
  docLinks?: ProjectDocLink[];
  apiDocLinks?: ProjectApiDocLink[];
  healthSnapshots?: ProjectHealthSnapshot[];
  aiContext?: ProjectAIContext;
  /** 任务提供商字段 (Linear / Jira) */
  externalProvider?: string | null;
  externalProjectId?: string | null;
  syncStatus?: 'synced' | 'pending' | 'error' | 'never_synced' | null;
  lastSyncAt?: string | null;
  syncErrorMessage?: string | null;
  fieldsLockedExternally?: boolean;
}

export interface ProjectListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  filters?: {
    status?: ProjectStatus[];
    type?: ProjectType[];
    memberId?: string[];
    priority?: ProjectPriority[];
    workflowStatus?: ProjectWorkflowStatus[];
    riskLevel?: ProjectRiskLevel[];
    ownerId?: string[];
  };
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  type: ProjectType;
  visibility: ProjectVisibility;
  templateId?: string;
  projectCode?: string;
  icon?: string;
  color?: string;
  priority?: ProjectPriority;
  workflowStatus?: ProjectWorkflowStatus;
  healthStatus?: ProjectHealthStatus;
  riskLevel?: ProjectRiskLevel;
  progress?: number;
  ownerId?: string;
  startDate?: string;
  targetDate?: string;
  category?: string;
  estimatePoints?: number;
  blockedReason?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  type?: ProjectType;
  visibility?: ProjectVisibility;
  status?: ProjectStatus;
  projectCode?: string;
  icon?: string;
  color?: string;
  priority?: ProjectPriority;
  workflowStatus?: ProjectWorkflowStatus;
  healthStatus?: ProjectHealthStatus;
  riskLevel?: ProjectRiskLevel;
  progress?: number;
  ownerId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  completedAt?: string | null;
  category?: string | null;
  estimatePoints?: number | null;
  blockedReason?: string | null;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
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

  getDashboardSummary: (projectId: string) =>
    api.get<ProjectDashboardSummary>(`/projects/${projectId}/dashboard-summary`),

  create: (data: CreateProjectRequest) =>
    api.post<Project>('/projects', data),

  update: (projectId: string, data: UpdateProjectRequest) =>
    api.patch<Project>(`/projects/${projectId}`, data),

  archive: (projectId: string) =>
    api.post<Project>(`/projects/${projectId}/archive`, {}),

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

  getIterations: (projectId: string) =>
    api.get<ProjectIterationSummary[]>(`/projects/${projectId}/iterations`),

  getMilestones: (projectId: string) =>
    api.get<ProjectMilestoneSummary[]>(`/projects/${projectId}/milestones`),

  createMilestone: (projectId: string, data: CreateMilestoneRequest) =>
    api.post<ProjectMilestoneSummary>(`/projects/${projectId}/milestones`, data),

  // AI Context
  getAIContext: (projectId: string) =>
    api.get<ProjectAIContext>(`/projects/${projectId}/ai-context`),

  refreshAIContext: (projectId: string) =>
    api.post<ProjectAIContext>(`/projects/${projectId}/ai-context/refresh`, {}),
};

