import { api } from '@/infrastructure/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** 记忆 Store B 前端面：人可检视/修正/钉住/归档/删除（跨模型的应用侧记忆） */

export interface MemoryAtomRecord {
  id: string;
  scope: string;
  type: string;
  content: string;
  confidence: number;
  sourceType?: string;
  lifecycle: string;
  pinned: boolean;
  hits: number;
  lastUsedAt?: string;
  createdAt: string;
}

export interface MemoryListResponse {
  items: MemoryAtomRecord[];
  total: number;
}

export const memoryApi = {
  list: (params?: { projectId?: string; type?: string; limit?: number }) =>
    api.get<MemoryListResponse>('/memory', {
      ...(params?.projectId ? { projectId: params.projectId } : {}),
      ...(params?.type ? { type: params.type } : {}),
      limit: params?.limit ?? 100,
    }),
  update: (
    id: string,
    data: { pinned?: boolean; lifecycle?: string; confidence?: number },
  ) => api.patch<MemoryAtomRecord>(`/memory/${id}`, data),
  remove: (id: string) => api.delete<MemoryAtomRecord>(`/memory/${id}`),
};

export const memoryKeys = {
  all: ['memory'] as const,
  list: (projectId?: string) => ['memory', 'list', projectId ?? 'global'] as const,
};

export function useMemoryList(projectId?: string) {
  return useQuery({
    queryKey: memoryKeys.list(projectId),
    queryFn: () => memoryApi.list({ projectId }),
  });
}

export function useMemoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: memoryKeys.all });

  const pin = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      memoryApi.update(id, { pinned }),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) => memoryApi.update(id, { lifecycle: 'archived' }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => memoryApi.remove(id),
    onSuccess: invalidate,
  });

  return { pin, archive, remove };
}
