import { useQuery } from '@tanstack/react-query';
import { api, type PaginatedData } from '@/infrastructure/api-client';

export interface AcceptanceCriteria {
  id: string;
  acceptanceId: string;
  criteriaType: 'functional' | 'technical';
  category?: string;
  content: string;
  source: string;
  weight: number;
  status: 'pending' | 'passed' | 'failed' | 'blocked';
  severity: 'critical' | 'high' | 'medium' | 'low';
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptanceEvidence {
  id: string;
  criteriaId: string;
  evidenceType: string;
  content?: string;
  storageRef?: string;
  submittedBy: string;
  createdAt: string;
}

export interface AuditReport {
  id: string;
  acceptanceId: string;
  checklistId?: string;
  riskLevel: 'red' | 'yellow' | 'green';
  blockedItems: AuditItem[];
  suggestedItems: AuditItem[];
  passedItems: AuditItem[];
  summary?: string;
  auditDate: string;
  checklist?: {
    id: string;
    name: string;
    techStack: string;
  };
}

export interface AuditItem {
  type: 'dependency' | 'engineering';
  id: string;
  content: string;
  category?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface Acceptance {
  id: string;
  taskId: string;
  status: 'draft' | 'pending' | 'in_review' | 'passed' | 'failed' | 'waived';
  type: 'functional' | 'technical' | 'mixed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title?: string;
  description?: string;
  totalCost?: number;
  totalTokens?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  task?: {
    id: string;
    title: string;
  };
  criteria?: AcceptanceCriteria[];
  executions?: {
    id: string;
    status: string;
    totalCost?: number;
    totalTokens?: number;
    createdAt: string;
    completedAt?: string;
  }[];
  auditReport?: AuditReport;
}

export interface CreateAcceptanceDto {
  taskId: string;
  type?: 'functional' | 'technical' | 'mixed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  title?: string;
  description?: string;
  criteria?: {
    criteriaType: 'functional' | 'technical';
    category?: string;
    content: string;
    source?: string;
    weight?: number;
    severity?: 'critical' | 'high' | 'medium' | 'low';
  }[];
  autoCreateExecution?: boolean;
}

export interface CreateCriteriaDto {
  criteriaType: 'functional' | 'technical';
  category?: string;
  content: string;
  source?: string;
  weight?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  projectType: string;
  techStack: string;
  isSystem: boolean;
  checklist: any[];
  version: number;
}

// TanStack Query hooks
export function useAcceptanceList(params?: {
  taskId?: string;
  projectId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['acceptance', 'list', params],
    queryFn: async () => acceptanceApi.list(params),
  });
}

// API functions
export const acceptanceApi = {
  // Acceptance CRUD
  list: (params?: {
    taskId?: string;
    projectId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.taskId) searchParams.set('taskId', params.taskId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

    return api.getPaginated<Acceptance>(`/acceptance?${searchParams.toString()}`);
  },

  get: (id: string) =>
    api.get<Acceptance>(`/acceptance/${id}`),

  create: (data: CreateAcceptanceDto) =>
    api.post<Acceptance>('/acceptance', data),

  update: (id: string, data: Partial<Acceptance>) =>
    api.patch<Acceptance>(`/acceptance/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/acceptance/${id}`),

  // Criteria
  addCriteria: (acceptanceId: string, data: CreateCriteriaDto) =>
    api.post<AcceptanceCriteria>(`/acceptance/${acceptanceId}/criteria`, data),

  addCriteriaBatch: (acceptanceId: string, data: CreateCriteriaDto[]) =>
    api.post<AcceptanceCriteria[]>(`/acceptance/${acceptanceId}/criteria/batch`, data),

  getCriteria: (acceptanceId: string) =>
    api.get<AcceptanceCriteria[]>(`/acceptance/${acceptanceId}/criteria`),

  updateCriteria: (
    criteriaId: string,
    data: { content?: string; status?: string; severity?: string },
  ) =>
    api.patch<AcceptanceCriteria>(`/acceptance/criteria/${criteriaId}`, data),

  deleteCriteria: (criteriaId: string) =>
    api.delete<void>(`/acceptance/criteria/${criteriaId}`),

  // Audit
  audit: (acceptanceId: string, checklistId?: string) =>
    api.post<{ report: AuditReport; result: any }>(
      `/acceptance/${acceptanceId}/audit`,
      { checklistId },
    ),

  getAuditReport: (acceptanceId: string) =>
    api.get<AuditReport | null>(`/acceptance/${acceptanceId}/audit-report`),

  applySuggestions: (acceptanceId: string, itemIds: string[]) =>
    api.post<{ report: AuditReport; result: any }>(
      `/acceptance/${acceptanceId}/apply-suggestions`,
      { itemIds },
    ),

  // Checklists
  getAllChecklists: (params?: {
    projectType?: string;
    techStack?: string;
    isSystem?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.projectType) searchParams.set('projectType', params.projectType);
    if (params?.techStack) searchParams.set('techStack', params.techStack);
    if (params?.isSystem !== undefined)
      searchParams.set('isSystem', String(params.isSystem));

    return api.get<Checklist[]>(`/acceptance/checklists/all?${searchParams.toString()}`);
  },

  getSystemChecklists: () =>
    api.get<Checklist[]>('/acceptance/checklists/system'),

  getChecklist: (id: string) =>
    api.get<Checklist>(`/acceptance/checklists/${id}`),

  applyChecklist: (checklistId: string, acceptanceId: string) =>
    api.post<{ checklist: Checklist; createdCount: number; criteria: any[] }>(
      `/acceptance/checklists/${checklistId}/apply?acceptanceId=${acceptanceId}`,
    ),

  // Task
  getByTask: (taskId: string) =>
    api.get<Acceptance[]>(`/acceptance/task/${taskId}`),

  // Audit Gate
  checkAuditGate: (taskId: string) =>
    api.get<{
      allowed: boolean;
      report?: AuditReport;
      message?: string;
    }>(`/acceptance/task/${taskId}/audit-gate`),
};
