import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  issueTypeApi,
  type CreateIssueTypeRequest,
  type UpdateIssueTypeRequest,
} from '../api/issue-type-api';

const QUERY_KEY = ['issue-types'];

/**
 * 工单类型列表（适配引擎元数据源）。
 * 按 id / key 各建一张映射，供列表、详情、创建入口等处渲染图标与颜色。
 */
export function useIssueTypes() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => issueTypeApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const types = query.data ?? [];
  const byId = new Map(types.map((t) => [t.id, t]));
  const byKey = new Map(types.map((t) => [t.key, t]));

  return { ...query, types, byId, byKey };
}

export function useCreateIssueType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateIssueTypeRequest) => issueTypeApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateIssueType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIssueTypeRequest }) =>
      issueTypeApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteIssueType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => issueTypeApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
