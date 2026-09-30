/**
 * PromptEditor - 提示词编辑/查看复用组件（CAP-A-24 + 增强 A/B + 2026-09-30 形态修订）
 *
 * 分层提示词（系统/项目/执行者/团队/任务）的统一编辑与查看形态：
 * - 编辑态：固定宽度 + 固定高度（初始高度可传，标准缺省 240px），底部拖拽手柄
 *   调高（160~800px），只竖向滚动、永不横向滚动（长行/代码块自动换行不截断）。
 *   内部为 MarkdownLiveEditor 块级「输入即渲染」所见即所得（点哪编哪，
 *   非活跃块恒为渲染态）。
 * - 左上角 meta 行：注入状态徽标（传 injectionKey 时读系统提示词注入开关，
 *   即设置页「提示词总控」的同一份数据）+ 字符数 · 预计 token（字符/4 粗估，
 *   与 server ai-hub 同口径）。
 * - 默认提示词（defaultValue）：value 为空时回落展示 defaultValue（不做任何
 *   设置即保留默认提示词）；清空内容即回到默认。编辑回写的仍是实值。
 * - 只读态（readOnly）：MarkdownView 纯渲染 + meta 行——系统级提示词
 *   内置资产唯一查看形态（无写端点，前端不提供改写通道）；maxHeight 限高内滚。
 * - AI 起草槽（增强 B，onDraft）：底部出现「AI 起草」按钮，调用方负责
 *   取回草稿全文；弹层与当前内容对照，「采用」把草稿写进编辑框——
 *   生效仍走调用方既有保存链路（AI 只代写，人确认）。
 * - 受控组件：value/onChange 由调用方持有，保存时机（自动/手动）由调用方定。
 */
import { useEffect, useRef, useState } from 'react';
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
import {
  usePromptConfig,
  type PromptInjectionToggles,
} from '@/modules/prompt/api/prompt-api';
import { MarkdownLiveEditor } from './markdown-live-editor';
import { MarkdownView } from './markdown-view';

/** 注入段 key（设置页「提示词总控」七段开关的同一口径） */
export type PromptInjectionKey = keyof PromptInjectionToggles;

/**
 * token 粗估：字符/4 向上取整——与 server ai-hub context-enrichment 的
 * estimateTokens 同口径（预览数值仅供感知量级，不是精确计费）。
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** 编辑态标准固定高度（height prop 缺省值，也是「按标准做」的基准档） */
const DEFAULT_EDITOR_HEIGHT = 240;
/** 拖拽调高的下限/上限 */
const MIN_EDITOR_HEIGHT = 160;
const MAX_EDITOR_HEIGHT = 800;

/** 代码块/长行强制换行的容器级覆盖：PromptEditor 内永不出现横向滚动 */
const NO_HORIZONTAL_SCROLL =
  'min-w-0 overflow-x-hidden [&_pre]:break-words [&_pre]:overflow-x-hidden [&_pre]:whitespace-pre-wrap';

export interface PromptEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  /** 默认提示词：value 为空时回落展示（不做任何设置即保留默认）；清空即回到默认 */
  defaultValue?: string;
  /** 空内容占位输入区的初始行数 */
  rows?: number;
  className?: string;
  /**
   * 编辑态初始固定高度（数值 px，标准缺省 240）；底部拖拽手柄可调高。
   * 只读态高度仍由 maxHeight 控制（maxHeight 仅作用于只读态）。
   */
  height?: number;
  /** 只读态查看器最大高度（数值 px 或 CSS 长度串；false/'none' 不限制；缺省 360px） */
  maxHeight?: number | string | false | null;
  /** 注入段 key：传入时左上角读取系统注入开关，显示该段提示词启用状态徽标 */
  injectionKey?: PromptInjectionKey;
  /** 底部动作区（保存/撤销等，仅编辑态显示） */
  actions?: React.ReactNode;
  /** AI 起草：返回草稿全文（null = 用户放弃/生成失败）；不传则不显示起草按钮 */
  onDraft?: () => Promise<string | null>;
}

/** 左上角 meta 行：注入状态徽标（可选）+ 字符数 · 预计 token。
 * 不传 injectionKey 时零请求——带 usePromptConfig 的徽标单独成组件按需挂载。 */
function PromptEditorMeta({
  injectionKey,
  value,
}: {
  injectionKey?: PromptInjectionKey;
  value: string;
}) {
  if (!injectionKey) return <StatsLine value={value} />;
  return <StatsWithInjection injectionKey={injectionKey} value={value} />;
}

function StatsLine({ value }: { value: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-0.5"
      data-ai-component="shared.prompt-editor.meta"
    >
      <CharTokenStats value={value} />
    </div>
  );
}

function StatsWithInjection({
  injectionKey,
  value,
}: {
  injectionKey: PromptInjectionKey;
  value: string;
}) {
  const { t } = useTranslation();
  const config = usePromptConfig();
  const enabled = config.data?.toggles
    ? config.data.toggles[injectionKey]
    : null;

  return (
    <div
      className="flex items-center gap-2.5 px-0.5"
      data-ai-component="shared.prompt-editor.meta"
    >
      {enabled !== null && enabled !== undefined ? (
        <span
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          data-ai-component="shared.prompt-editor.injection"
          data-state={enabled ? 'on' : 'off'}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              enabled ? 'bg-accent-green' : 'bg-muted-foreground/40',
            )}
          />
          {enabled
            ? t('promptEditor.injectionOn')
            : t('promptEditor.injectionOff')}
        </span>
      ) : null}
      <CharTokenStats value={value} />
    </div>
  );
}

function CharTokenStats({ value }: { value: string }) {
  const { t } = useTranslation();
  return (
    <span className="text-xs tabular-nums text-muted-foreground/60">
      {t('promptEditor.metaStats', {
        chars: value.length,
        tokens: estimateTokens(value),
      })}
    </span>
  );
}

export function PromptEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  defaultValue,
  rows = 5,
  className,
  height = DEFAULT_EDITOR_HEIGHT,
  maxHeight = 360,
  injectionKey,
  actions,
  onDraft,
}: PromptEditorProps) {
  const { t } = useTranslation();
  const effectiveValue = value.trim() ? value : (defaultValue ?? '');
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const [draftText, setDraftText] = useState<string | null>(null);

  // 编辑态高度：初始 = height prop，拖拽后为用户值（clamp 160~800）
  const [editorHeight, setEditorHeight] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ y: 0, h: height });

  const resolvedMaxHeight =
    maxHeight === false || maxHeight === null || maxHeight === 'none'
      ? undefined
      : typeof maxHeight === 'number'
        ? `${maxHeight}px`
        : maxHeight;

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    dragStartRef.current = { y: e.clientY, h: editorHeight ?? height };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const delta = Number(e.clientY) - dragStartRef.current.y;
      if (Number.isNaN(delta)) return;
      const next = dragStartRef.current.h + delta;
      setEditorHeight(
        Math.min(MAX_EDITOR_HEIGHT, Math.max(MIN_EDITOR_HEIGHT, next)),
      );
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

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
        <PromptEditorMeta injectionKey={injectionKey} value={effectiveValue} />
        <div
          className={cn('overflow-y-auto overscroll-contain pr-1', NO_HORIZONTAL_SCROLL)}
          style={{ maxHeight: resolvedMaxHeight }}
        >
          {effectiveValue.trim() ? (
            <MarkdownView content={effectiveValue} />
          ) : (
            <p className="text-sm text-muted-foreground/60">
              {placeholder ?? t('promptEditor.empty')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)} data-ai-component="shared.prompt-editor">
      <PromptEditorMeta injectionKey={injectionKey} value={effectiveValue} />
      {/* 固定高度编辑器：只竖向滚动，底部手柄拖拽调高 */}
      <div
        className={cn(
          'min-w-0 overflow-y-auto overscroll-contain rounded-xl border border-border bg-background px-3 py-2.5',
          NO_HORIZONTAL_SCROLL,
        )}
        style={{ height: `${editorHeight ?? height}px` }}
        data-ai-component="shared.prompt-editor.body"
      >
        <MarkdownLiveEditor
          value={effectiveValue}
          onChange={onChange ?? (() => {})}
          placeholder={placeholder}
          rows={rows}
          maxHeight={false}
          className="bg-background"
        />
      </div>
      <div
        role="separator"
        aria-label={t('promptEditor.resizeHandle')}
        aria-orientation="horizontal"
        onPointerDown={startDrag}
        className="group -mt-0.5 flex h-2.5 cursor-row-resize touch-none items-center justify-center"
        data-ai-component="shared.prompt-editor.resize"
        data-ai-action="shared.prompt-editor.resize.drag"
      >
        <span className="h-0.5 w-10 rounded-full bg-border transition-colors group-hover:bg-muted-foreground/60" />
      </div>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
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
                {effectiveValue.trim() ? (
                  <MarkdownView content={effectiveValue} />
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
