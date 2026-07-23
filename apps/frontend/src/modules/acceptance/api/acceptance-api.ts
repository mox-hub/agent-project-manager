import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';

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
    queryFn: async () => {
      const response = await acceptanceApi.list(params);
      return response.data.data;
    },
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
    
    return apiClient.get<{ data: Acceptance[]; meta: any }>(
      `/_api/acceptance?${searchParams.toString()}`
    );
  },

  get: (id: string) =>
    apiClient.get<Acceptance>(`/_api/acceptance/${id}`),

  create: (data: CreateAcceptanceDto) =>
    apiClient.post<Acceptance>('/_api/acceptance', data),

  update: (id: string, data: Partial<Acceptance>) =>
    apiClient.patch<Acceptance>(`/_api/acceptance/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/_api/acceptance/${id}`),

  // Criteria
  addCriteria: (acceptanceId: string, data: CreateCriteriaDto) =>
    apiClient.post<AcceptanceCriteria>(
      `/_api/acceptance/${acceptanceId}/criteria`,
      data
    ),

  addCriteriaBatch: (acceptanceId: string, data: CreateCriteriaDto[]) =>
    apiClient.post<AcceptanceCriteria[]>(
      `/_api/acceptance/${acceptanceId}/criteria/batch`,
      data
    ),

  getCriteria: (acceptanceId: string) =>
    apiClient.get<AcceptanceCriteria[]>(
      `/_api/acceptance/${acceptanceId}/criteria`
    ),

  updateCriteria: (
    criteriaId: string,
    data: { content?: string; status?: string; severity?: string }
  ) =>
    apiClient.patch<AcceptanceCriteria>(
      `/_api/acceptance/criteria/${criteriaId}`,
      data
    ),

  deleteCriteria: (criteriaId: string) =>
    apiClient.delete<{ success: boolean }>(
      `/_api/acceptance/criteria/${criteriaId}`
    ),

  // Audit
  audit: (acceptanceId: string, checklistId?: string) =>
    apiClient.post<{ report: AuditReport; result: any }>(
      `/_api/acceptance/${acceptanceId}/audit`,
      { checklistId }
    ),

  getAuditReport: (acceptanceId: string) =>
    apiClient.get<AuditReport | null>(
      `/_api/acceptance/${acceptanceId}/audit-report`
    ),

  applySuggestions: (acceptanceId: string, itemIds: string[]) =>
    apiClient.post<{ report: AuditReport; result: any }>(
      `/_api/acceptance/${acceptanceId}/apply-suggestions`,
      { itemIds }
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

    return apiClient.get<Checklist[]>(
      `/_api/acceptance/checklists/all?${searchParams.toString()}`
    );
  },

  getSystemChecklists: () =>
    apiClient.get<Checklist[]>('/_api/acceptance/checklists/system'),

  getChecklist: (id: string) =>
    apiClient.get<Checklist>(`/_api/acceptance/checklists/${id}`),

  applyChecklist: (checklistId: string, acceptanceId: string) =>
    apiClient.post<{ checklist: Checklist; createdCount: number; criteria: any[] }>(
      `/_api/acceptance/checklists/${checklistId}/apply?acceptanceId=${acceptanceId}`
    ),

  // Task
  getByTask: (taskId: string) =>
    apiClient.get<Acceptance[]>(`/_api/acceptance/task/${taskId}`),

  // Audit Gate
  checkAuditGate: (taskId: string) =>
    apiClient.get<{
      allowed: boolean;
      report?: AuditReport;
      message?: string;
    }>(`/_api/acceptance/task/${taskId}/audit-gate`),
};
