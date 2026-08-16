import { useQuery } from '@tanstack/react-query';
import { documentApi, type DocumentListQuery, type DocumentListItem } from '../api/document-api';

function unwrapList(payload: unknown): DocumentListItem[] {
  if (Array.isArray(payload)) return payload as DocumentListItem[];
  if (!payload || typeof payload !== 'object') return [];
  // 兼容后端双层包裹: TransformInterceptor 包 { data: <ServiceResult> }, ServiceResult 本身又返回 { data, meta }
  // 因此 axios body 是 { data: { data: [...], meta } }, api-client 剥外层后是 { data: { data, meta } }
  let cursor: any = payload;
  while (cursor && typeof cursor === 'object' && !Array.isArray(cursor)) {
    if (Array.isArray(cursor.data)) return cursor.data as DocumentListItem[];
    if (cursor.data && typeof cursor.data === 'object') {
      cursor = cursor.data;
      continue;
    }
    break;
  }
  return [];
}

export function useDocuments(query?: DocumentListQuery) {
  return useQuery<DocumentListItem[]>({
    queryKey: ['documents', query],
    queryFn: async () => {
      const res: any = await documentApi.getList(query);
      return unwrapList(res);
    },
    staleTime: 30000,
  });
}
