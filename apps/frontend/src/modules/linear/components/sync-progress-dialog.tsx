"use client";

import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const isError = progress?.phase === 'error';
  const isSuccess = isCompleted && !isError && progress?.phase === 'completed';

  const getStatusIcon = () => {
    if (isSuccess) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (isError) return <XCircle className="w-5 h-5 text-red-500" />;
    if (isCompleted) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
  };

  const getStatusText = () => {
    if (isSuccess) return 'Sync Completed';
    if (isError) return 'Sync Failed';
    if (progress?.phase === 'fetching') return 'Fetching Issues...';
    if (progress?.phase === 'syncing') return 'Syncing Tasks...';
    if (isCompleted) return 'Completed';
    return 'Starting...';
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
            Linear sync progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          {!isCompleted && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress?.message || 'Initializing...'}</span>
                <span>{progress?.current ?? 0}%</span>
              </div>
              <Progress value={progress?.current ?? 0} className="h-2" />
              {progress?.currentItem && (
                <p className="text-xs text-muted-foreground truncate">
                  Current: {progress.currentItem}
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
                  <span className="text-muted-foreground">Added:</span>
                  <span className="font-medium">{summary.added}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium">{summary.updated}</span>
                </div>
                {summary.conflicts > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-muted-foreground">Conflicts:</span>
                    <span className="font-medium text-yellow-600">{summary.conflicts}</span>
                  </div>
                )}
                {summary.errors > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-muted-foreground">Errors:</span>
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
                Minimize to Button
              </Button>
            )}
            <Button
              size="sm"
              variant={isCompleted ? 'default' : 'outline'}
              onClick={() => onOpenChange(false)}
            >
              {isCompleted ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline sync button with mini progress indicator
 */
interface SyncButtonProgressProps {
  isPending: boolean;
  progress: SyncProgress | null;
  onClick: () => void;
  disabled?: boolean;
}

export function SyncButtonProgress({
  isPending,
  progress,
  onClick,
  disabled,
}: SyncButtonProgressProps) {
  const showProgress = isPending && progress;
  const percentage = progress?.current ?? 0;

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 text-xs relative overflow-hidden"
      disabled={disabled || isPending}
      onClick={onClick}
    >
      {/* Mini progress overlay */}
      {showProgress && (
        <div
          className="absolute inset-0 bg-blue-500/20 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      )}
      
      <RefreshCw
        size={12}
        className={cn(
          'relative z-10',
          isPending && 'animate-spin',
        )}
      />
      <span className="relative z-10">
        {isPending ? (percentage > 0 ? `${percentage}%` : 'Syncing...') : 'Sync Linear'}
      </span>
    </Button>
  );
}
