import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentSyncApi, type DocumentSyncWarning } from '../api/document-api';
import { useToastMutation } from '@/shared/hooks';

function unwrapList(payload: unknown): DocumentSyncWarning[] {
  if (Array.isArray(payload)) return payload as DocumentSyncWarning[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as DocumentSyncWarning[];
  }
  return [];
}

const SYNC_WARNINGS_KEY = ['documents', 'sync', 'warnings'];

export function useSyncWarnings() {
  return useQuery<DocumentSyncWarning[]>({
    queryKey: SYNC_WARNINGS_KEY,
    queryFn: async () => {
      const res: any = await documentSyncApi.getWarnings();
      return unwrapList(res);
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}

export function useClearSyncWarning() {
  const queryClient = useQueryClient();
  return useToastMutation<unknown, Error, string>({
    successMessage: '同步警告已清除',
    errorPrefix: '清除同步警告',
    mutationFn: async (documentId) => {
      const res: any = await documentSyncApi.clearWarning(documentId);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SYNC_WARNINGS_KEY });
    },
  });
}
