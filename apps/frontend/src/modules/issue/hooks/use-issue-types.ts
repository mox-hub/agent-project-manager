import { useCallback } from 'react';
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
 * withUsage=true 时服务端附带 _count.tasks（类型管理面统计行用）。
 */
export function useIssueTypes(withUsage = false) {
  const query = useQuery({
    queryKey: [...QUERY_KEY, withUsage],
    queryFn: () => issueTypeApi.list(withUsage),
    staleTime: 5 * 60 * 1000,
  });

  const types = query.data ?? [];
  const byId = new Map(types.map((t) => [t.id, t]));
  const byKey = new Map(types.map((t) => [t.key, t]));

  return { ...query, types, byId, byKey };
}

/**
 * 类型解析器：Task → IssueTypeMeta（列表行/看板卡/表格的类型图标渲染用）。
 * typeId 为事实源；遗留行 typeId 为空时按旧 type 字符串桥接（缺省 task）。
 */
export function useIssueTypeOf() {
  const { byId, byKey } = useIssueTypes();
  return useCallback(
    (task: { typeId?: string | null; type?: string }) =>
      (task.typeId ? byId.get(task.typeId) : byKey.get(task.type ?? 'task')) ?? undefined,
    [byId, byKey],
  );
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
