/**
 * 恢复强确认弹窗（CAP-A-03）。
 *
 * 恢复是高危操作：要求用户手动输入指定文案（scope=workspace 输工作区名称、
 * scope=all 输 RESTORE ALL），输入精确匹配才允许点确认；
 * 确认按钮使用 destructive 语义色。弹窗内明示「恢复前会自动创建全量备份」。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRestoreWorkspaceBackup } from '../hooks/use-workspace-backups';
import type { WorkspaceBackup } from '../api/workspace-api';

export function RestoreConfirmDialog({
  backup,
  open,
  onOpenChange,
}: {
  backup: WorkspaceBackup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const restore = useRestoreWorkspaceBackup();

  // 与服务端强确认口径一致：scope=workspace 输工作区名称；scope=all 输 RESTORE ALL
  const requiredText =
    backup?.scope === 'workspace'
      ? (backup.workspaceName ?? backup.workspaceId ?? '')
      : 'RESTORE ALL';
  const canConfirm = open && backup !== null && confirmText === requiredText;

  // 渲染期比较：每次打开/切换目标备份时重置输入（等价 effect，避免级联渲染）
  const [lastInitKey, setLastInitKey] = useState('');
  const initKey = open ? `open:${backup?.id ?? ''}` : 'closed';
  if (initKey !== lastInitKey) {
    setLastInitKey(initKey);
    setConfirmText('');
  }

  const handleRestore = async () => {
    if (!backup || !canConfirm) return;
    try {
      await restore.mutateAsync({ backupId: backup.id, data: { confirm: confirmText } });
      onOpenChange(false);
    } catch {
      // toast 已在 hook 内统一处理
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-4 w-4" />
            {t('workspace.backups.restoreDialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('workspace.backups.restoreDialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {t('workspace.backups.backupTime')}
              </span>
              <span>
                {backup ? new Date(backup.createdAt).toLocaleString() : '-'}
              </span>
            </div>
            <div className="mt-1 flex justify-between gap-2">
              <span className="text-muted-foreground">
                {t('workspace.backups.backupScope')}
              </span>
              <span>
                {backup?.scope === 'workspace'
                  ? (backup.workspaceName ?? backup.workspaceId)
                  : t('workspace.backups.scopeAll')}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t('workspace.backups.confirmInputLabel', { text: requiredText })}
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredText}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {t('workspace.backups.restoreAutoBackupHint')}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={!canConfirm || restore.isPending}
            onClick={handleRestore}
          >
            {restore.isPending
              ? t('workspace.backups.restoring')
              : t('workspace.backups.restoreConfirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
