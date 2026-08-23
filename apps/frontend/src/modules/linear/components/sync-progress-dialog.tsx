"use client";

import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export interface SyncProgress {
  phase: 'fetching' | 'syncing' | 'completed' | 'error';
  current: number;
  total: number;
  message: string;
  currentItem?: string;
}

interface SyncProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: SyncProgress | null;
  isCompleted: boolean;
  summary?: {
    added: number;
    updated: number;
    conflicts: number;
    errors: number;
  };
  onMinimize?: () => void;
  compact?: boolean;
}

export function SyncProgressDialog({
  open,
  onOpenChange,
  progress,
  isCompleted,
  summary,
  onMinimize,
}: SyncProgressDialogProps) {
  const { t } = useTranslation();
  const isError = progress?.phase === 'error';
  const isSuccess = isCompleted && !isError && progress?.phase === 'completed';

  const getStatusIcon = () => {
    if (isSuccess) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (isError) return <XCircle className="w-5 h-5 text-red-500" />;
    if (isCompleted) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
  };

  const getStatusText = () => {
    if (isSuccess) return t('linearSync.completed');
    if (isError) return t('linearSync.failed');
    if (progress?.phase === 'fetching') return t('linearSync.fetching');
    if (progress?.phase === 'syncing') return t('linearSync.syncingTasks');
    if (isCompleted) return t('linearSync.done');
    return t('linearSync.starting');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={isCompleted}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <DialogTitle>{getStatusText()}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {t('linearSync.completed')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          {!isCompleted && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress?.message || t('linearSync.initializing')}</span>
                <span>{progress?.current ?? 0}%</span>
              </div>
              <Progress value={progress?.current ?? 0} className="h-2" />
              {progress?.currentItem && (
                <p className="text-xs text-muted-foreground truncate">
                  {t('linearSync.current')} {progress.currentItem}
                </p>
              )}
            </div>
          )}

          {/* Summary */}
          {isCompleted && summary && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">{t('linearSync.added')}</span>
                  <span className="font-medium">{summary.added}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">{t('linearSync.updated')}</span>
                  <span className="font-medium">{summary.updated}</span>
                </div>
                {summary.conflicts > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-muted-foreground">{t('linearSync.conflicts')}</span>
                    <span className="font-medium text-yellow-600">{summary.conflicts}</span>
                  </div>
                )}
                {summary.errors > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-muted-foreground">{t('linearSync.errors')}</span>
                    <span className="font-medium text-red-600">{summary.errors}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {isError && progress?.message && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{progress.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {!isCompleted && onMinimize && (
              <Button variant="outline" size="sm" onClick={onMinimize}>
                {t('linearSync.minimize')}
              </Button>
            )}
            <Button
              size="sm"
              variant={isCompleted ? 'default' : 'outline'}
              onClick={() => onOpenChange(false)}
            >
              {isCompleted ? t('linearSync.done') : t('linearSync.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
