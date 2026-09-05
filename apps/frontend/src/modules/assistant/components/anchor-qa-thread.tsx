/**
 * 行内锚点问答线程（候选 B 试点 · 任务详情页）：
 * 「就地展开 > 弹层」——下沉展开行不遮邻居；提示=承诺兑现速度（silent 快捷问答）。
 * 交互三要点：锚点=显式上下文（服务端按任务事实 grounding）、
 * 操作按钮贴答案（点一下走既有任务接口落库）、必有升级出口（细聊/进办公室）。
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, DoorOpen, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownView } from '@/shared/components/markdown-view';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useAnchorQa, type AnchorQaAction, type AnchorQaResult } from '../hooks/use-anchor-qa';

interface QaEntry {
  question: string;
  result: AnchorQaResult;
  appliedActions: string[];
}

export interface AnchorQaThreadProps {
  taskId: string;
  projectId?: string;
  /** 动作就地落库（任务详情页注入 updateField），返回 void 表示已完成 */
  onApplyAction?: (action: AnchorQaAction) => Promise<void>;
  /** 展开态变化（父级渲染幽灵按钮激活样式） */
  onOpenChange?: (open: boolean) => void;
}

export function AnchorQaThread({
  taskId,
  projectId,
  onApplyAction,
  onOpenChange,
}: AnchorQaThreadProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState('');
  const [entries, setEntries] = useState<QaEntry[]>([]);
  const [applying, setApplying] = useState<string | null>(null);
  const anchorQa = useAnchorQa(projectId, taskId);
  const openAssistantWithDraftFn = useAppStore((s) => s.openAssistantWithDraft);

  useEffect(() => {
    onOpenChange?.(true);
    inputRef.current?.focus();
    return () => onOpenChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || anchorQa.isPending) return;
    setQuestion('');
    try {
      const result = await anchorQa.mutateAsync(trimmed);
      setEntries((prev) => [...prev, { question: trimmed, result, appliedActions: [] }]);
    } catch {
      // 错误态由 anchorQa.isError 统一渲染（保留输入便于重试）
      setQuestion(trimmed);
    }
  };

  const applyAction = async (entryIndex: number, action: AnchorQaAction) => {
    if (!onApplyAction || applying) return;
    setApplying(`${entryIndex}:${action.action}`);
    try {
      await onApplyAction(action);
      setEntries((prev) =>
        prev.map((entry, i) =>
          i === entryIndex
            ? { ...entry, appliedActions: [...entry.appliedActions, action.action] }
            : entry,
        ),
      );
    } finally {
      setApplying(null);
    }
  };

  // 升级出口：把本线程的问答语境完整带入面板
  const escalateToPanel = () => {
    const last = entries[entries.length - 1];
    const draft = last
      ? t('assistant.anchorQa.escalateDraft', {
          question: last.question,
          answer: last.result.answer,
        })
      : t('assistant.anchorQa.escalatePlain');
    openAssistantWithDraftFn(draft);
  };

  return (
    <div
      className="mx-1 mt-1 rounded-lg border border-accent-purple/20 bg-accent-purple/5 p-2"
      data-ai-component="assistant.anchor-qa-thread"
      data-ai-role="panel"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onOpenChange?.(false);
      }}
    >
      {/* 已有问答（最新在下） */}
      {entries.map((entry, index) => (
        <div key={index} className="mb-2 border-b border-border/60 pb-2 last:mb-0 last:border-0 last:pb-0">
          <p className="truncate text-11 font-medium text-content-text" title={entry.question}>
            {entry.question}
          </p>
          <div className="mt-1 text-xs leading-relaxed text-content-text">
            <MarkdownView content={entry.result.answer} className="text-xs" />
          </div>
          {entry.result.actions && entry.result.actions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {entry.result.actions.map((action) => {
                const applied = entry.appliedActions.includes(action.action);
                return (
                  <Button
                    key={action.action}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-11"
                    disabled={applied || applying !== null || !onApplyAction}
                    onClick={() => applyAction(index, action)}
                    data-ai-action="assistant.anchor-qa.apply.click"
                  >
                    {applied ? <Check className="size-3 text-accent-green" /> : <Sparkles className="size-3 text-accent-purple" />}
                    {applied ? t('assistant.anchorQa.applied') : action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* 加载中：答案骨架先出 */}
      {anchorQa.isPending && (
        <p className="mb-2 animate-pulse text-11 text-accent-purple">
          {t('assistant.anchorQa.thinking')}
        </p>
      )}
      {anchorQa.isError && (
        <p className="mb-2 text-11 text-accent-red">{t('assistant.anchorQa.failed')}</p>
      )}

      {/* 输入行 */}
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) ask();
          }}
          placeholder={t('assistant.anchorQa.placeholder')}
          className="h-7 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0"
          data-ai-component="assistant.anchor-qa-input"
          data-ai-role="input"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 shrink-0 p-0"
          disabled={!question.trim() || anchorQa.isPending}
          onClick={ask}
          data-ai-action="assistant.anchor-qa.send.click"
          aria-label={t('assistant.anchorQa.send')}
        >
          <Send className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 shrink-0 p-0"
          onClick={() => onOpenChange?.(false)}
          aria-label={t('common.close')}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* 升级出口：细聊 / 进办公室 */}
      <div className="mt-1 flex items-center gap-3 border-t border-border/60 pt-1.5">
        <button
          type="button"
          onClick={escalateToPanel}
          className="flex items-center gap-1 text-11 text-accent-purple hover:underline"
          data-ai-action="assistant.anchor-qa.escalate-panel.click"
        >
          <ArrowUpRight className="size-3" />
          {t('assistant.anchorQa.escalatePanel')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/app/office')}
          className="flex items-center gap-1 text-11 text-content-text-muted hover:underline"
          data-ai-action="assistant.anchor-qa.escalate-office.click"
        >
          <DoorOpen className="size-3" />
          {t('assistant.anchorQa.escalateOffice')}
        </button>
      </div>
    </div>
  );
}

/** 幽灵暗示按钮（渐进披露②）：hover/聚焦才显形，低饱和不遮内容 */
export function AnchorQaGhostButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-7 items-center gap-1 rounded-full px-2 text-11 text-accent-purple/70 transition-opacity',
        'opacity-0 group-hover/sidebar:opacity-100 focus-visible:opacity-100',
        'hover:bg-accent-purple/10 hover:text-accent-purple',
        open && 'opacity-100 bg-accent-purple/10 text-accent-purple',
      )}
      data-ai-component="assistant.anchor-qa-ghost"
      data-ai-action="assistant.anchor-qa.open.click"
    >
      <Sparkles className="size-3" />
      {t('assistant.anchorQa.open')}
    </button>
  );
}

// （导出仅供测试断言用）
export type { QaEntry };
