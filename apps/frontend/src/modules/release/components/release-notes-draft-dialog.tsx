/**
 * 发布说明 AI 起草对话框（CAP-A-18 样板推广第二实例，v0.7.13）。
 *
 * 「AI 建议 → 人确认 → 可展开细节」范式在 release 域的落地（范式一/三：
 * acceptance-draft-dialog / decision-card IntegrationBody）：
 * - 打开即调静默场景 release-notes-draft 生成叙事性草稿（面向内测用户）；
 * - 草稿进可编辑框，人修订后确认才经既有 PATCH /releases/:id 写回 notes；
 * - AI 的诚实缺口（gaps）与输入来源明细（范围工单/交付物/已有说明）收进
 *   可展开层——默认层讲目标与后果，技术细节主动展开才看（渐进展开纪律）；
 * - 生成失败保留旧 notes（页面不动）+ 可就地重试；保存失败编辑内容不丢。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Package, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { assistantApi } from '@/modules/assistant/api/assistant-api';
import { useUpdateRelease } from '../hooks/use-releases';
import type { ReleaseRecord } from '../api/release-api';

interface ReleaseNotesDraftDialogProps {
  release: ReleaseRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReleaseNotesDraftDialog({
  release,
  open,
  onOpenChange,
  onSuccess,
}: ReleaseNotesDraftDialogProps) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [gaps, setGaps] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const updateNotes = useUpdateRelease(release.id);

  const generate = () => {
    let cancelled = false;
    setGenerating(true);
    setLoadError(null);
    assistantApi
      .silent('release-notes-draft', {
        projectId: release.projectId,
        context: { releaseId: release.id },
      })
      .then((res) => {
        if (cancelled) return;
        const draft = String(res.data?.notes ?? '').trim();
        const nextGaps = Array.isArray(res.data?.gaps)
          ? (res.data.gaps as unknown[]).filter(
              (g): g is string => typeof g === 'string' && g.trim().length > 0,
            )
          : [];
        if (!draft) {
          setLoadError(t('release.detail.notesDraft.emptyDraft'));
          return;
        }
        setNotes(draft);
        setGaps(nextGaps);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : t('release.detail.notesDraft.generateFailed'),
        );
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  };

  // 打开即生成（不缓存——范围/交付物可能已更新）；关闭即中止（取消不落任何库）
  useEffect(() => {
    if (!open) return;
    const cancel = generate();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, release.id]);

  const handleConfirm = () => {
    const draft = notes.trim();
    if (!draft) return;
    updateNotes.mutate(
      { notes: draft },
      {
        onSuccess: () => {
          toast.success(t('release.detail.notesSaved'));
          onSuccess?.();
          onOpenChange(false);
        },
        onError: (err) =>
          // 保存失败：对话框不关、编辑内容保留，人可再试或复制草稿
          toast.error(
            err instanceof Error
              ? err.message
              : t('release.detail.notesDraft.saveFailed'),
          ),
      },
    );
  };

  const scopeCount = release.scope?.issueIds?.length ?? 0;
  const deliverableItems = release.deliverables?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-ai-component="release.notes-draft-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-accent-purple" />
            {t('release.detail.notesDraft.title')}
          </DialogTitle>
          <DialogDescription>
            {t('release.detail.notesDraft.description')}
          </DialogDescription>
        </DialogHeader>

        {generating ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {t('release.detail.notesDraft.generating')}
          </div>
        ) : loadError ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 px-3 py-4 text-xs text-muted-foreground">
              {loadError}
            </div>
            {/* 生成失败：旧 notes 不受影响（页面原样），可就地重试 */}
            <Button variant="outline" size="sm" onClick={generate}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* AI 的诚实缺口（六问「失败与降级」：信息不足明说，不硬编） */}
            {gaps.length > 0 ? (
              <div
                className="rounded-lg bg-accent-yellow-light/30 px-3 py-2 text-xs leading-relaxed"
                data-ai="notes-draft-gaps"
              >
                <p className="font-medium">
                  {t('release.detail.notesDraft.gapsTitle')}
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                  {gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* 层1+层2：AI 建议正文即草稿，可编辑确认 */}
            <div className="space-y-1.5">
              <p className="text-2xs text-muted-foreground">
                {t('release.detail.notesDraft.editableHint')}
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                data-ai="notes-draft-editor"
              />
            </div>

            {/* 层3：可展开的输入来源明细（IntegrationBody 两层展开样板） */}
            <div className="rounded-lg border border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full justify-start text-2xs font-medium text-muted-foreground"
                data-ai="notes-draft-sources-toggle"
              >
                <ChevronDown
                  className={`size-3 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                />
                {detailsOpen
                  ? t('release.detail.notesDraft.sourcesCollapse')
                  : t('release.detail.notesDraft.sourcesToggle', {
                      count: scopeCount,
                      items: deliverableItems.length,
                    })}
              </Button>
              {detailsOpen ? (
                <div className="space-y-2 border-t border-border/60 px-2.5 py-2">
                  <div>
                    <p className="text-2xs font-medium">
                      {t('release.detail.notesDraft.sourceScope')}
                    </p>
                    {scopeCount > 0 ? (
                      <p className="text-2xs text-muted-foreground">
                        {t('release.detail.notesDraft.sourceScopeSummary', {
                          count: scopeCount,
                        })}
                      </p>
                    ) : (
                      <p className="text-2xs text-muted-foreground">
                        {t('release.detail.notesDraft.sourceScopeEmpty')}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-2xs font-medium">
                      <Package className="size-3" />
                      {t('release.detail.notesDraft.sourceDeliverables')}
                    </p>
                    {deliverableItems.length > 0 ? (
                      <ul className="mt-0.5 space-y-0.5">
                        {deliverableItems.map((item, idx) => (
                          <li
                            key={`${item.name}-${idx}`}
                            className="text-2xs leading-relaxed text-muted-foreground"
                          >
                            <span className="font-medium text-foreground">
                              {item.name}
                            </span>
                            {' · '}
                            {item.location}
                            {' · '}
                            {item.howToVerify}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-2xs text-muted-foreground">
                        {t('release.detail.notesDraft.sourceDeliverablesEmpty')}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-2xs font-medium">
                      {t('release.detail.notesDraft.sourceCurrentNotes')}
                    </p>
                    {release.notes?.trim() ? (
                      <Badge variant="outline" className="mt-0.5 text-3xs">
                        {t('release.detail.notesDraft.sourceCurrentNotesYes')}
                      </Badge>
                    ) : (
                      <p className="text-2xs text-muted-foreground">
                        {t('release.detail.notesDraft.sourceCurrentNotesNone')}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            disabled={generating || !!loadError || updateNotes.isPending || !notes.trim()}
            onClick={handleConfirm}
          >
            {updateNotes.isPending ? (
              <Spinner className="size-3 text-inherit" />
            ) : null}
            {updateNotes.isPending
              ? t('release.detail.notesDraft.saving')
              : t('release.detail.notesDraft.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
