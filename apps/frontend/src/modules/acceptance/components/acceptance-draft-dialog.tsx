/**
 * AI 代写验收标准对话框（兜底改造批 3）。
 * 打开即调静默场景 acceptance-draft 生成草案 → 人勾选/查看 → 确认后
 * 经 apply-criteria 落契约（服务端增量写入同文去重，绝不覆盖已有标准）。
 * 覆盖场景：任务详情验收卡「缺标准」黄条入口 / 手动补全顺滑化。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { assistantApi } from '@/modules/assistant/api/assistant-api';
import { acceptanceApi } from '@/modules/acceptance/api/acceptance-api';
import { parseAcceptanceDraft } from '@/modules/assistant/hooks/use-silent-ai';
import type { AcceptanceCriteriaDraft } from '@/modules/assistant/hooks/use-silent-ai';

interface AcceptanceDraftDialogProps {
  issueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const SEVERITY_TONE: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive',
  high: 'bg-accent-orange/10 text-accent-orange',
  medium: 'bg-accent-blue/10 text-accent-blue',
  low: 'bg-muted text-muted-foreground',
};

export function AcceptanceDraftDialog({
  issueId,
  open,
  onOpenChange,
  onSuccess,
}: AcceptanceDraftDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<AcceptanceCriteriaDraft[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // 打开时生成草案（不缓存——工单内容可能已更新）
  useEffect(() => {
    if (!open || !issueId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setItems([]);
    setSelected(new Set());
    assistantApi
      .silent('acceptance-draft', { context: { issueId } })
      .then((res) => {
        if (cancelled) return;
        const parsed = parseAcceptanceDraft(res.data);
        setItems(parsed);
        setSelected(new Set(parsed.map((_, idx) => idx)));
        if (parsed.length === 0) {
          setLoadError(
            'AI 没能生成有效的验收标准草案：工单描述可能过于简单，请先补充描述后重试',
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : 'AI 生成失败，请稍后重试',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, issueId]);

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleApply = async () => {
    const chosen = items.filter((_, idx) => selected.has(idx));
    if (chosen.length === 0) return;
    setSubmitting(true);
    try {
      const result = await acceptanceApi.applyCriteriaForIssue(
        issueId,
        chosen.map((c) => ({
          content: c.content,
          criteriaType: c.criteriaType,
          severity: c.severity,
          category: c.category,
        })),
      );
      toast.success(
        t('acceptance.draft.applied', {
          added: result.added,
          skipped: result.skipped,
          defaultValue: `已落库 ${result.added} 条验收标准${result.skipped ? `（去重跳过 ${result.skipped} 条）` : ''}`,
        }),
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '落库失败，请稍后重试',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-ai-component="acceptance.draft-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-accent-purple" />
            {t('acceptance.draft.title', 'AI 代写验收标准')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'acceptance.draft.description',
              'AI 按工单内容起草可检查的验收标准，勾选确认后落入验收契约（已有标准不会被覆盖）',
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {t('acceptance.draft.generating', 'AI 正在起草验收标准…')}
          </div>
        ) : loadError ? (
          <div className="rounded-lg bg-muted/50 px-3 py-4 text-xs text-muted-foreground">
            {loadError}
          </div>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <label
                key={idx}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-border has-[[data-state=checked]]:bg-muted/40"
              >
                <Checkbox
                  checked={selected.has(idx)}
                  onCheckedChange={() => toggle(idx)}
                  className="mt-0.5"
                />
                <span className="flex-1 text-xs leading-relaxed">
                  {item.content}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <Badge
                    variant="outline"
                    className={`border-transparent px-1 text-10 ${SEVERITY_TONE[item.severity] ?? SEVERITY_TONE.medium}`}
                  >
                    {item.severity}
                  </Badge>
                  <span className="text-10 text-muted-foreground">
                    {item.criteriaType === 'technical'
                      ? t('acceptance.draft.technical', '技术')
                      : t('acceptance.draft.functional', '功能')}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            disabled={loading || submitting || selected.size === 0}
            onClick={() => void handleApply()}
          >
            {submitting ? (
              <Spinner className="size-3 text-inherit" />
            ) : (
              t('acceptance.draft.apply', { defaultValue: '确认落库' })
            )}
            {!submitting && ` (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
