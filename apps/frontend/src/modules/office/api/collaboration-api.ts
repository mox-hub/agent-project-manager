import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** 接口协作卡（交接试点）：前后端 AI 工件化协作的状态机载体，人闸口监督 */

export type CollaborationStatus =
  | 'requested'
  | 'committed'
  | 'in_progress'
  | 'delivered'
  | 'verified'
  | 'rejected'
  | 'cancelled'
  | 'escalated';

export interface CollaborationCard {
  id: string;
  projectId: string;
  title: string;
  requesterMemberId: string;
  providerMemberId: string;
  requesterName?: string;
  providerName?: string;
  relatedTaskId?: string;
  payload: Record<string, unknown>;
  status: CollaborationStatus;
  rounds: number;
  events?: Array<{
    status: string;
    byMemberId?: string;
    note?: string;
    at: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const collaborationApi = {
  list: (params?: { projectId?: string; status?: string }) =>
    api.get<{ items: CollaborationCard[]; total: number }>('/collaboration', {
      ...(params?.projectId ? { projectId: params.projectId } : {}),
      ...(params?.status ? { status: params.status } : {}),
    }),
  verify: (id: string, data: RequestBodyOf<'CollaborationController_verify'>) =>
    api.patch<CollaborationCard>(`/collaboration/${id}/verify`, data),
  // cancel 的 note body 在契约中 requestBody 为 never，维持手写 inline 类型
  cancel: (id: string, data?: { note?: string }) =>
    api.delete<CollaborationCard>(`/collaboration/${id}`, { data }),
};

export const collaborationKeys = {
  all: ['collaboration'] as const,
  list: (projectId?: string) =>
    ['collaboration', 'list', projectId ?? 'all'] as const,
};

export function useCollaborationList(projectId?: string) {
  return useQuery({
    queryKey: collaborationKeys.list(projectId),
    queryFn: () => collaborationApi.list({ projectId }),
  });
}

/** 人闸口动作：验证通过 / 打回 / 取消 */
export function useCollaborationActions() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: collaborationKeys.all });

  const verify = useMutation({
    mutationFn: (input: {
      id: string;
      verdict: 'verified' | 'changes_requested';
      note?: string;
    }) => collaborationApi.verify(input.id, input),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => collaborationApi.cancel(id),
    onSuccess: invalidate,
  });

  return { verify, cancel };
}
