/**
 * Acceptance Hooks
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';
import { acceptanceApi, type Acceptance } from '@/modules/acceptance/api/acceptance-api';

export const acceptanceKeys = {
  all: ['acceptance'] as const,
  byTask: (taskId: string) => [...acceptanceKeys.all, 'task', taskId] as const,
  detail: (id: string) => [...acceptanceKeys.all, 'detail', id] as const,
  audit: (id: string) => [...acceptanceKeys.all, 'audit', id] as const,
  systemChecklists: () => [...acceptanceKeys.all, 'systemChecklists'] as const,
};

export function useAcceptancesByTask(taskId: string | undefined) {
  return useQuery<Acceptance[]>({
    queryKey: acceptanceKeys.byTask(taskId ?? ''),
    queryFn: () => acceptanceApi.listByTask(taskId!),
    enabled: !!taskId,
  });
}

/**
 * 全局 acceptance 列表查询（对应 /_api/acceptance）
 * 接受 status 等筛选，返回分页结构 { items, meta }
 */
export function useAcceptanceList(params: {
  status?: string;
  taskId?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  return useQuery<{ items: Acceptance[]; meta?: { page: number; pageSize: number; total: number; totalPages: number } }>({
    queryKey: [...acceptanceKeys.all, 'list', params],
    queryFn: async () => {
      const queryString = new URLSearchParams();
      if (params.status) queryString.set('status', params.status);
      if (params.taskId) queryString.set('taskId', params.taskId);
      if (params.projectId) queryString.set('projectId', params.projectId);
      if (params.page) queryString.set('page', String(params.page));
      if (params.pageSize) queryString.set('pageSize', String(params.pageSize));
      const url = `/acceptance${queryString.toString() ? '?' + queryString.toString() : ''}`;
      // unwrapEnvelope 已经解出 controller 的返回值 {data: Acceptance[], meta}
      const data = await api.get<{ data: Acceptance[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }>(url);
      return { items: data.data ?? [], meta: data.meta };
    },
  });
}

export function useAcceptanceDetail(id: string | undefined) {
  return useQuery<Acceptance>({
    queryKey: acceptanceKeys.detail(id ?? ''),
    queryFn: () => acceptanceApi.findOne(id!),
    enabled: !!id,
  });
}

export function useAudit(id: string) {
  return useMutation({
    mutationFn: (checklistId?: string) =>
      api.post(`/acceptance/${id}/audit`, { checklistId }),
  });
}

export function useApplySuggestions(id: string) {
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      api.post(`/acceptance/${id}/apply-suggestions`, { itemIds }),
  });
}

export function useSystemChecklists() {
  return useQuery({
    queryKey: acceptanceKeys.systemChecklists(),
    queryFn: () => api.get('/acceptance/checklists/system'),
  });
}
