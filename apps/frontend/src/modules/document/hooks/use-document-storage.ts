import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  documentStorageApi,
  type StorageConfig,
  type StoredFileMeta,
} from '@/modules/document/api/document-storage-api';
import { useToastMutation } from '@/shared/hooks';

const QUERY_KEYS = {
  config: ['document', 'storage', 'config'] as const,
  files: ['document', 'storage', 'files'] as const,
};

export function useStorageConfig() {
  return useQuery<StorageConfig>({
    queryKey: QUERY_KEYS.config,
    queryFn: () => documentStorageApi.getConfig(),
    staleTime: 30_000,
  });
}

export function useUpdateStorageConfig() {
  const queryClient = useQueryClient();
  return useToastMutation<StorageConfig, Error, Partial<StorageConfig>>({
    successMessage: '存储配置已更新',
    errorPrefix: '更新存储配置',
    mutationFn: (updates) => documentStorageApi.updateConfig(updates),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.config, data);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files });
    },
  });
}

export function useDetectDefaultStoragePath() {
  return useQuery<{ path: string }>({
    queryKey: ['document', 'storage', 'default-path'] as const,
    queryFn: async () => {
      const path = await documentStorageApi.detectDefaultPath();
      return { path };
    },
    enabled: false,
  });
}

export function useStorageFiles() {
  return useQuery<StoredFileMeta[]>({
    queryKey: QUERY_KEYS.files,
    queryFn: () => documentStorageApi.listFiles(),
    enabled: false,
  });
}

export function useSyncDocumentToFile() {
  const queryClient = useQueryClient();
  return useToastMutation<unknown, Error, { id: string; content: string }>({
    successMessage: '文档已同步到本地文件',
    errorPrefix: '同步文档到文件',
    mutationFn: ({ id, content }) => documentStorageApi.saveDocument(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files });
    },
  });
}

export function useLoadDocumentFromFile() {
  return useToastMutation<string, Error, string>({
    successMessage: '已从本地文件加载',
    errorPrefix: '从文件加载文档',
    mutationFn: (id) => documentStorageApi.loadDocument(id),
  });
}

export function useDeleteDocumentFile() {
  const queryClient = useQueryClient();
  return useToastMutation<unknown, Error, string>({
    successMessage: '本地文件已删除',
    errorPrefix: '删除本地文件',
    mutationFn: (id) => documentStorageApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files });
    },
  });
}

export function useAutoSync(enabled: boolean) {
  return useQuery<StorageConfig>({
    queryKey: QUERY_KEYS.config,
    queryFn: () => documentStorageApi.getConfig(),
    enabled,
    refetchInterval: 60_000,
  });
}
