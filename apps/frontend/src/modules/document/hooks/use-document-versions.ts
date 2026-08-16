import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchVersions,
  fetchVersion,
  fetchLatestVersion,
  fetchVersionStats,
  createVersion,
  rollbackToVersion,
  renameVersion,
  type CreateVersionDto,
  type DocumentVersion,
  type VersionStats,
} from '@/modules/document/api/document-version-api';
import { useToastMutation } from '@/shared/hooks';

const KEYS = {
  list: (documentId: string) => ['document-versions', documentId] as const,
  latest: (documentId: string) => ['document-versions', documentId, 'latest'] as const,
  stats: (documentId: string) => ['document-versions', documentId, 'stats'] as const,
  detail: (documentId: string, versionId: string) =>
    ['document-versions', documentId, 'detail', versionId] as const,
};

export function useDocumentVersions(documentId: string) {
  return useQuery<DocumentVersion[]>({
    queryKey: KEYS.list(documentId),
    queryFn: () => fetchVersions(documentId),
    enabled: !!documentId,
  });
}

export function useVersionDetail(documentId: string, versionId: string | undefined) {
  return useQuery<DocumentVersion>({
    queryKey: KEYS.detail(documentId, versionId ?? ''),
    queryFn: () => fetchVersion(versionId!, documentId),
    enabled: !!documentId && !!versionId,
  });
}

export function useLatestVersion(documentId: string) {
  return useQuery<DocumentVersion | null>({
    queryKey: KEYS.latest(documentId),
    queryFn: () => fetchLatestVersion(documentId),
    enabled: !!documentId,
  });
}

export function useVersionStats(documentId: string) {
  return useQuery<VersionStats>({
    queryKey: KEYS.stats(documentId),
    queryFn: () => fetchVersionStats(documentId),
    enabled: !!documentId,
  });
}

export function useCreateVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useToastMutation<DocumentVersion, Error, { data: CreateVersionDto; createdBy: string }>({
    successMessage: '版本已创建',
    errorPrefix: '创建版本',
    mutationFn: ({ data, createdBy }) => createVersion(documentId, data, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list(documentId) });
      queryClient.invalidateQueries({ queryKey: KEYS.latest(documentId) });
      queryClient.invalidateQueries({ queryKey: KEYS.stats(documentId) });
    },
  });
}

export function useRenameVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useToastMutation<DocumentVersion, Error, { versionId: string; label: string }>({
    successMessage: '版本已重命名',
    errorPrefix: '重命名版本',
    mutationFn: ({ versionId, label }) => renameVersion(documentId, versionId, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list(documentId) });
    },
  });
}

export function useRollbackVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useToastMutation<DocumentVersion, Error, { versionId: string; createdBy: string }>({
    successMessage: '已回滚到指定版本',
    errorPrefix: '回滚版本',
    mutationFn: ({ versionId, createdBy }) => rollbackToVersion(documentId, versionId, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list(documentId) });
      queryClient.invalidateQueries({ queryKey: KEYS.latest(documentId) });
      queryClient.invalidateQueries({ queryKey: KEYS.stats(documentId) });
    },
  });
}
