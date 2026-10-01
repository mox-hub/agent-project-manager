/**
 * 设置·「备份与恢复」区块（CAP-A-03 / G7-a；2026-10-01 按设置页规范改造：
 * PageShell standard 骨架对齐 26 个既有 sections——页面级 icon/标题/收藏槽收归
 * PageHeader，Card 分区只承担内容分组；数据 hooks 与恢复确认对话框留 workspace 域）。
 *
 * 结构：备份分区（全库立即备份 + 按工作区备份选择器）+ 备份列表（时间/范围/大小）
 * + 恢复入口（RestoreConfirmDialog 强确认，destructive 语义）；无备份空态给诚实文案。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DatabaseBackup, HardDriveDownload, Inbox, RefreshCw } from 'lucide-react';

import { PageShell } from '@/components/semantic/page-shell';
import { nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { SelectField } from '@/components/ui/select-field';
import { SkeletonList } from '@/components/ui/skeleton';
import { useWorkspaceList } from '@/modules/workspace/hooks/use-workspace-list';
import {
  useCreateWorkspaceBackup,
  useWorkspaceBackups,
} from '@/modules/workspace/hooks/use-workspace-backups';
import type { WorkspaceBackup } from '@/modules/workspace/api/workspace-api';
import { RestoreConfirmDialog } from '@/modules/workspace/components/restore-confirm-dialog';

/** 字节数人性化展示（本区块专用，避免为一次展示引入共享工具） */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function BackupsSection() {
  const { t } = useTranslation();
  const { data: backups, isLoading, refetch, isFetching } = useWorkspaceBackups();
  const { data: workspacesRes } = useWorkspaceList();
  const createBackup = useCreateWorkspaceBackup();

  // 单区备份目标（含 default）；空串 = 未选择
  const [workspaceTarget, setWorkspaceTarget] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<WorkspaceBackup | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const openRestore = (backup: WorkspaceBackup) => {
    setRestoreTarget(backup);
    setRestoreOpen(true);
  };

  return (
    <PageShell
      variant="standard"
      icon={DatabaseBackup}
      iconColor="text-accent-blue"
      title={t('workspace.backups.title')}
      favorites={<FavoriteToggle label={nodeToText(t('workspace.backups.title')).trim()} />}
      contentClassName="space-y-6"
    >
      <RestoreConfirmDialog
        backup={restoreTarget}
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('workspace.backups.backupAllTitle')}</CardTitle>
          <CardDescription>{t('workspace.backups.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 全库备份 */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {t('workspace.backups.backupAllDesc')}
            </p>
            <Button
              onClick={() => createBackup.mutate({ scope: 'all' })}
              disabled={createBackup.isPending}
              className="shrink-0 gap-2"
            >
              {createBackup.isPending ? (
                <Spinner className="text-inherit" />
              ) : (
                <DatabaseBackup className="h-4 w-4" />
              )}
              {t('workspace.backups.backupNow')}
            </Button>
          </div>

          {/* 按工作区备份：设置页无工作区管理列表，用选择器 + 行内按钮承担同职责 */}
          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="text-sm font-medium text-foreground">
              {t('workspace.backups.backupWsTitle')}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <SelectField
                value={workspaceTarget}
                onChange={(e) => setWorkspaceTarget(e.target.value)}
                className="max-w-64"
                aria-label={t('workspace.backups.wsSelectLabel')}
              >
                <option value="">{t('workspace.backups.wsSelectPlaceholder')}</option>
                {(workspacesRes?.workspaces ?? []).map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.id === 'default' ? t('workspace.backups.defaultWsName') : ws.name}
                  </option>
                ))}
              </SelectField>
              <Button
                variant="outline"
                disabled={!workspaceTarget || createBackup.isPending}
                onClick={() =>
                  workspaceTarget &&
                  createBackup.mutate({ scope: 'workspace', workspaceId: workspaceTarget })
                }
                className="gap-2"
              >
                {createBackup.isPending ? (
                  <Spinner className="text-inherit" />
                ) : (
                  <DatabaseBackup className="h-4 w-4" />
                )}
                {t('workspace.backups.backupWsButton')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 备份列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('workspace.backups.listTitle')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              {isFetching ? <Spinner className="text-inherit" /> : <RefreshCw className="h-4 w-4" />}
              {t('common.refresh')}
            </Button>
          </div>
          <CardDescription>
            {t('workspace.backups.listDesc', { count: 10 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonList count={3} />
          ) : !backups || backups.length === 0 ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Inbox className="h-4 w-4" />
              {t('workspace.backups.empty')}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {backups.map((backup) => (
                <li
                  key={backup.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {new Date(backup.createdAt).toLocaleString()}
                      </span>
                      <Badge variant="outline">
                        {backup.scope === 'all'
                          ? t('workspace.backups.scopeAll')
                          : (backup.workspaceName ?? backup.workspaceId)}
                      </Badge>
                      {backup.reason === 'pre-restore' && (
                        <Badge variant="secondary">
                          {t('workspace.backups.reasonPreRestore')}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t('workspace.backups.fileSummary', {
                        count: backup.files.length,
                        size: formatBytes(backup.totalBytes),
                      })}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openRestore(backup)}
                  >
                    {t('workspace.backups.restoreButton')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
