import { api } from '@/infrastructure/api-client';

export type IntegrationScope = 'global' | 'project';

export interface IntegrationConfig {
  id: string;
  provider: string;
  scope: IntegrationScope;
  projectId?: string | null;
  name: string;
  enabled: boolean;
  status?: string | null;
  lastSyncAt?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface IntegrationListParams {
  provider?: string;
  projectId?: string;
}

export interface IntegrationListResponse {
  data: IntegrationConfig[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface CreateIntegrationConfigRequest {
  provider: string;
  scope: IntegrationScope;
  projectId?: string;
  name: string;
  enabled?: boolean;
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateIntegrationConfigRequest {
  name?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  status?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface ExternalIssueLink {
  id: string;
  projectId: string;
  taskId?: string | null;
  provider: string;
  externalId: string;
  url: string;
  summary?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalIssueLinkListParams {
  projectId?: string;
  taskId?: string;
  provider?: string;
  externalId?: string;
}

export interface ExternalIssueLinkListResponse {
  data: ExternalIssueLink[];
}

export interface CreateExternalIssueLinkRequest {
  projectId: string;
  taskId?: string;
  provider: string;
  externalId: string;
  url: string;
  summary?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export const integrationApi = {
  getConfigs: (params?: IntegrationListParams) =>
    api.get<{ data: IntegrationConfig[]; meta?: { page?: number; pageSize?: number; total?: number; } }>('/integrations', params) as unknown as Promise<IntegrationListResponse>,

  getConfig: (id: string) =>
    api.get<IntegrationConfig>(`/integrations/${id}`),

  createConfig: (data: CreateIntegrationConfigRequest) =>
    api.post<IntegrationConfig>('/integrations', data),

  updateConfig: (id: string, data: UpdateIntegrationConfigRequest) =>
    api.put<IntegrationConfig>(`/integrations/${id}`, data),

  deleteConfig: (id: string) =>
    api.delete(`/integrations/${id}`),

  getExternalIssueLinks: (params?: ExternalIssueLinkListParams) =>
    api.get<ExternalIssueLinkListResponse>('/integrations/external-issues', params),

  createExternalIssueLink: (data: CreateExternalIssueLinkRequest) =>
    api.post<ExternalIssueLink>('/integrations/external-issues', data),
};
