/**
 * 工作区备份与恢复 hooks（CAP-A-03）。
 * 列表走 TanStack Query；创建/恢复走 useToastMutation 统一反馈，
 * 消息文案在 hook 内经 i18n 解析（双语言键见 locales）。
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToastMutation } from '@/shared/hooks';
import {
  workspaceApi,
  type CreateBackupRequest,
  type RestoreBackupRequest,
  type WorkspaceBackup,
  type RestoreBackupResult,
} from '../api/workspace-api';

const QUERY_KEYS = {
  backups: ['workspace', 'backups'] as const,
};

export function useWorkspaceBackups() {
  return useQuery<WorkspaceBackup[]>({
    queryKey: QUERY_KEYS.backups,
    queryFn: async () => (await workspaceApi.backups.list()).backups,
  });
}

export function useCreateWorkspaceBackup() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useToastMutation<WorkspaceBackup, Error, CreateBackupRequest>({
    successMessage: t('workspace.backups.createSuccess'),
    errorPrefix: t('workspace.backups.createErrorPrefix'),
    mutationFn: (data) => workspaceApi.backups.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backups });
    },
  });
}

export function useRestoreWorkspaceBackup() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useToastMutation<
    RestoreBackupResult,
    Error,
    { backupId: string; data: RestoreBackupRequest }
  >({
    successMessage: t('workspace.backups.restoreSuccess'),
    errorPrefix: t('workspace.backups.restoreErrorPrefix'),
    mutationFn: ({ backupId, data }) => workspaceApi.backups.restore(backupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backups });
    },
  });
}
