import { useQuery } from '@tanstack/react-query';
import { documentApi, type DocumentListQuery } from '../api/document-api';

export function useDocuments(query?: DocumentListQuery) {
  return useQuery({
    queryKey: ['documents', query],
    queryFn: () => documentApi.getList(query).then((res) => res.data),
  });
}

