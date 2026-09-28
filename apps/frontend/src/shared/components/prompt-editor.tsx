/**
 * PromptEditor - 提示词编辑/查看复用组件（CAP-A-24 + 增强 A/B）
 *
 * 分层提示词（系统/项目/执行者/团队/任务）的统一编辑与查看形态：
 * - 编辑态：MarkdownLiveEditor 块级「输入即渲染」所见即所得（点哪编哪，
 *   非活跃块恒为渲染态）；底部字数与保存/撤销动作槽。
 * - 只读态（readOnly）：MarkdownView 纯渲染 + 字数——系统级提示词
 *   内置资产唯一查看形态（无写端点，前端不提供改写通道）。
 * - AI 起草槽（增强 B，onDraft）：底部出现「AI 起草」按钮，调用方负责
 *   取回草稿全文；弹层与当前内容对照，「采用」把草稿写进编辑框——
 *   生效仍走调用方既有保存链路（AI 只代写，人确认）。
 * - 受控组件：value/onChange 由调用方持有，保存时机（自动/手动）由调用方定。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { MarkdownLiveEditor } from './markdown-live-editor';
import { MarkdownView } from './markdown-view';

export interface PromptEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  /** 空内容占位输入区的初始行数 */
  rows?: number;
  className?: string;
  /** 编辑器/查看器最大高度（数值 px 或 CSS 长度串，例如 360、'360px'、'24rem'；传入 false 或 'none' 为不限制），超限时在组件内滚动；缺省为 360px */
  maxHeight?: number | string | false | null;
  /** 编辑器/查看器最小高度（数值 px 或 CSS 长度串） */
  minHeight?: number | string;
  /** 底部动作区（保存/撤销等，仅编辑态显示） */
  actions?: React.ReactNode;
  /** AI 起草：返回草稿全文（null = 用户放弃/生成失败）；不传则不显示起草按钮 */
  onDraft?: () => Promise<string | null>;
}

export function PromptEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  rows = 5,
  className,
  maxHeight = 360,
  minHeight,
  actions,
  onDraft,
}: PromptEditorProps) {
  const { t } = useTranslation();
  const charCount = value.length;
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const [draftText, setDraftText] = useState<string | null>(null);

  const resolvedMaxHeight =
    maxHeight === false || maxHeight === null || maxHeight === 'none'
      ? undefined
      : typeof maxHeight === 'number'
        ? `${maxHeight}px`
        : maxHeight;

  const resolvedMinHeight =
    typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  const contentStyle: React.CSSProperties = {
    maxHeight: resolvedMaxHeight,
    minHeight: resolvedMinHeight,
  };

  const openDraftDialog = async () => {
    setDraftOpen(true);
    setDraftError(false);
    if (draftText !== null) return; // 已有草稿直接对照，可点「重新生成」刷新
    setDraftLoading(true);
    try {
      const draft = await onDraft?.();
      setDraftText(draft);
    } catch {
      setDraftText(null);
      setDraftError(true);
    } finally {
      setDraftLoading(false);
    }
  };

  const regenerate = async () => {
    setDraftLoading(true);
    setDraftError(false);
    try {
      setDraftText(await onDraft?.());
    } catch {
      setDraftText(null);
      setDraftError(true);
    } finally {
      setDraftLoading(false);
    }
  };

  const applyDraft = () => {
    if (draftText) onChange?.(draftText);
    setDraftOpen(false);
    setDraftText(null);
  };

  if (readOnly) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-muted/20 px-3 py-2.5',
          className,
        )}
        data-ai-component="shared.prompt-editor.readonly"
      >
        <div
          className="min-w-0 overflow-y-auto overscroll-contain pr-1"
          style={contentStyle}
        >
          {value.trim() ? (
            <MarkdownView content={value} />
          ) : (
            <p className="text-sm text-muted-foreground/60">
              {placeholder ?? t('promptEditor.empty')}
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground/60">
          {t('promptEditor.charCount', { count: charCount })}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)} data-ai-component="shared.prompt-editor">
      <MarkdownLiveEditor
        value={value}
        onChange={onChange ?? (() => {})}
        placeholder={placeholder}
        rows={rows}
        maxHeight={maxHeight}
        minHeight={minHeight}
        className="bg-background"
      />
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/60">
            {t('promptEditor.charCount', { count: charCount })}
          </span>
          {onDraft ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground"
              disabled={draftLoading}
              onClick={() => void openDraftDialog()}
              data-ai-component="shared.prompt-editor.draft"
              data-ai-action="shared.prompt-editor.draft.click"
            >
              {draftLoading ? (
                <Spinner className="size-3" />
              ) : (
                <Sparkles className="size-3" />
              )}
              {t('promptEditor.draft')}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-1">{actions}</div>
      </div>

      {/* AI 起草对照弹层：原文 vs 草稿；采用才写入编辑框（人确认红线） */}
      <Dialog open={draftOpen} onOpenChange={(next) => {
        setDraftOpen(next);
        if (!next) setDraftText(null);
      }}>
        <DialogContent
          className="sm:max-w-2xl"
          data-ai-component="shared.prompt-editor.draft-dialog"
        >
          <DialogHeader>
            <DialogTitle>{t('promptEditor.draftTitle')}</DialogTitle>
            <DialogDescription>
              {t('promptEditor.draftDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {t('promptEditor.draftCurrent')}
              </p>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-muted/20 px-3 py-2">
                {value.trim() ? (
                  <MarkdownView content={value} />
                ) : (
                  <p className="text-sm text-muted-foreground/60">
                    {t('promptEditor.empty')}
                  </p>
                )}
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {t('promptEditor.draftSuggestion')}
              </p>
              <div
                className="max-h-80 overflow-y-auto rounded-lg border border-accent-blue/30 bg-accent-blue/5 px-3 py-2"
                data-ai-component="shared.prompt-editor.draft-body"
              >
                {draftLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-3.5" />
                    {t('promptEditor.draftLoading')}
                  </p>
                ) : draftText?.trim() ? (
                  <MarkdownView content={draftText} />
                ) : (
                  <p className="text-sm text-muted-foreground/60">
                    {draftError
                      ? t('promptEditor.draftFailed')
                      : t('promptEditor.draftEmpty')}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={draftLoading}
              onClick={() => void regenerate()}
            >
              {t('promptEditor.draftRegenerate')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={draftLoading || !draftText?.trim()}
              onClick={applyDraft}
              data-ai-action="shared.prompt-editor.draft.apply"
            >
              {t('promptEditor.draftApply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
