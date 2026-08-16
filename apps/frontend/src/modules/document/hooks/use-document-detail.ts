import { useQuery } from '@tanstack/react-query';
import { documentApi } from '../api/document-api';

export function useDocumentDetail(documentId: string) {
  return useQuery({
    queryKey: ['documents', 'detail', documentId],
    enabled: Boolean(documentId),
    queryFn: () => documentApi.getDetail(documentId),
  });
}
