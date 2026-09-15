import { useQuery } from '@tanstack/react-query';
import {
  documentApi,
  type DocumentListQuery,
  type DocumentListItem,
  type DocumentStats,
} from '../api/document-api';

export function useDocuments(query?: DocumentListQuery) {
  return useQuery<DocumentListItem[]>({
    queryKey: ['documents', query],
    // findAll 契约为分页信封 { data, meta }（api-client 已剥 TransformInterceptor 外层）
    queryFn: async () => {
      const page = await documentApi.getList(query);
      return page.data;
    },
    staleTime: 30000,
  });
}

/**
 * 文档统计（`GET /documents/stats`）——一次拿到 `total` 与 `byCategory` 计数。
 *
 * 起因（AI 表面 S2-c）：`useDocuments` 只 `return page.data`，把分页信封的 `meta`
 * 整个丢掉，故任何「文档总数」都只能退化成「当前页长度」。需要真值的地方
 * 应当走这个端点，而不是把 `pageSize` 调到很大去凑。
 */
export function useDocumentStats(projectId?: string) {
  return useQuery<DocumentStats>({
    queryKey: ['documents', 'stats', projectId ?? 'workspace'],
    queryFn: () => documentApi.getStats(projectId),
    staleTime: 30000,
  });
}
