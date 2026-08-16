'use client';

import { useMemo, useState } from 'react';
import { History, RotateCcw, GitCompare, Eye, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useDocumentVersions,
  useLatestVersion,
  useVersionStats,
  useRollbackVersion,
  useRenameVersion,
} from '@/modules/document/hooks/use-document-versions';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useConfirm } from '@/shared/confirm/confirm-provider';
import { VersionDiffView } from './version-diff-view';

interface VersionHistoryPanelProps {
  documentId: string;
  onPreview?: (content: string) => void;
}

export function VersionHistoryPanel({ documentId, onPreview }: VersionHistoryPanelProps) {
  const { data: versions = [], isLoading } = useDocumentVersions(documentId);
  const { data: latest } = useLatestVersion(documentId);
  const { data: stats } = useVersionStats(documentId);
  const rollback = useRollbackVersion(documentId);
  const renameVersion = useRenameVersion(documentId);
  const currentUserId = useAppStore((s) => s.currentUser?.id ?? '');

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [compareBaseId, setCompareBaseId] = useState<string | undefined>();
  const [compareTargetId, setCompareTargetId] = useState<string | undefined>();
  const [renamingId, setRenamingId] = useState<string | undefined>();
  const [renameDraft, setRenameDraft] = useState('');

  const orderedVersions = useMemo(
    () => [...versions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [versions],
  );

  const selectedVersion = useMemo(
    () => orderedVersions.find((v) => v.id === selectedId),
    [orderedVersions, selectedId],
  );

  const confirmDialog = useConfirm();
  const handleRollback = async (versionId: string) => {
    if (!currentUserId) return;
    const ok = await confirmDialog({
      title: '回滚版本',
      description: '确认回滚到此版本？这将基于此版本内容创建新版本。',
      variant: 'destructive',
    });
    if (!ok) return;
    rollback.mutate({ versionId, createdBy: currentUserId });
  };

  const handleStartCompare = (versionId: string) => {
    setCompareTargetId(versionId);
  };

  const handleStartRename = (versionId: string, currentLabel: string) => {
    setRenamingId(versionId);
    setRenameDraft(currentLabel);
  };

  const handleSubmitRename = (versionId: string) => {
    if (!renameDraft.trim()) return;
    renameVersion.mutate(
      { versionId, label: renameDraft.trim() },
      {
        onSuccess: () => {
          setRenamingId(undefined);
          setRenameDraft('');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        加载版本历史…
      </div>
    );
  }

  if (orderedVersions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <History size={20} className="opacity-50" />
        <p>暂无版本记录</p>
        <p className="text-xs opacity-70">编辑文档后会自动创建版本快照</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* 统计卡片 */}
      {stats && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">总版本数</span>
            <span className="font-mono font-medium">{stats.totalVersions}</span>
          </div>
          {latest && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">最新版本</span>
              <span className="font-mono">v{latest.version}</span>
            </div>
          )}
          {stats.wordCountChange !== 0 && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">字数变化</span>
              <span
                className={cn(
                  'font-mono',
                  stats.wordCountChange > 0 ? 'text-accent-green' : 'text-accent-red',
                )}
              >
                {stats.wordCountChange > 0 ? '+' : ''}
                {stats.wordCountChange}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 对比视图 */}
      {compareBaseId && compareTargetId && (
        <div className="rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
            <span className="font-medium">版本对比</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCompareBaseId(undefined);
                setCompareTargetId(undefined);
              }}
            >
              关闭
            </Button>
          </div>
          <div className="max-h-[500px] overflow-auto">
            <VersionDiffView
              documentId={documentId}
              baseVersionId={compareBaseId}
              targetVersionId={compareTargetId}
            />
          </div>
        </div>
      )}

      {/* 时间轴 */}
      <ol className="relative space-y-2 border-l border-border pl-4">
        {orderedVersions.map((version) => {
          const isLatest = latest?.id === version.id;
          const isSelected = selectedId === version.id;
          const isCompareBase = compareBaseId === version.id;
          return (
            <li
              key={version.id}
              className="relative"
            >
              <span
                className={cn(
                  'absolute -left-[21px] top-3 flex h-3 w-3 items-center justify-center rounded-full border-2',
                  isLatest ? 'border-accent-blue bg-accent-blue' : 'border-border bg-background',
                )}
              />
              <div
                className={cn(
                  'group rounded-lg border p-3 transition-colors',
                  isSelected
                    ? 'border-accent-blue bg-accent-blue/5'
                    : isCompareBase
                    ? 'border-accent-yellow bg-accent-yellow/5'
                    : 'border-border hover:bg-muted/30',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {renamingId === version.id ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">v</span>
                          <Input
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmitRename(version.id);
                              } else if (e.key === 'Escape') {
                                setRenamingId(undefined);
                                setRenameDraft('');
                              }
                            }}
                            className="h-6 w-32 font-mono text-xs"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleSubmitRename(version.id)}
                            disabled={!renameDraft.trim() || renameVersion.isPending}
                            aria-label="保存版本名"
                          >
                            <Save size={12} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              setRenamingId(undefined);
                              setRenameDraft('');
                            }}
                            aria-label="取消"
                          >
                            <X size={12} />
                          </Button>
                        </span>
                      ) : (
                        <>
                          <span className="font-mono text-sm font-medium">v{version.version}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => handleStartRename(version.id, version.version)}
                            aria-label="重命名版本"
                            title="重命名版本"
                          >
                            <Pencil size={11} />
                          </Button>
                        </>
                      )}
                      {isLatest && (
                        <span className="rounded-full bg-accent-blue/10 px-1.5 py-0 text-[10px] font-medium text-accent-blue">
                          最新
                        </span>
                      )}
                      {isCompareBase && (
                        <span className="rounded-full bg-accent-yellow/10 px-1.5 py-0 text-[10px] font-medium text-accent-yellow">
                          基准
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{new Date(version.createdAt).toLocaleString('zh-CN')}</span>
                      <span>·</span>
                      <span>{version.wordCount} 字</span>
                    </div>
                    {version.summary && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-foreground/80">{version.summary}</p>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedId(version.id === selectedId ? undefined : version.id);
                      onPreview?.(version.content);
                    }}
                    className="h-7 gap-1 px-2 text-xs"
                  >
                    <Eye size={12} /> 预览
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (!compareTargetId) {
                        setCompareBaseId(version.id);
                      } else if (compareBaseId && compareBaseId !== version.id) {
                        setCompareTargetId(version.id);
                      } else {
                        setCompareBaseId(version.id);
                        setCompareTargetId(undefined);
                      }
                    }}
                    className="h-7 gap-1 px-2 text-xs"
                  >
                    <GitCompare size={12} /> 对比
                  </Button>
                  {!isLatest && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRollback(version.id)}
                      disabled={rollback.isPending}
                      className="h-7 gap-1 px-2 text-xs text-accent-yellow hover:bg-accent-yellow/10"
                    >
                      <RotateCcw size={12} /> 回滚
                    </Button>
                  )}
                </div>

                {isSelected && selectedVersion && (
                  <div className="mt-2 rounded border border-border bg-background p-2 text-xs">
                    <p className="text-muted-foreground">
                      由 {selectedVersion.createdBy} 于 {new Date(selectedVersion.createdAt).toLocaleString('zh-CN')} 创建
                    </p>
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/40 p-2 font-mono text-[11px] leading-relaxed">
                      {selectedVersion.content.slice(0, 800)}
                      {selectedVersion.content.length > 800 ? '\n...' : ''}
                    </pre>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
