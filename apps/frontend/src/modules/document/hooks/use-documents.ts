import { useQuery } from '@tanstack/react-query';
import { documentApi, type DocumentListQuery, type DocumentListItem } from '../api/document-api';

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
