import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion, Sparkles, X } from 'lucide-react';
import { useAppStore } from '@/infrastructure/store/app-store';
import {
  parseCardExplain,
  useCardExplain,
} from '@/modules/assistant/hooks/use-silent-ai';
import { cn } from '@/lib/utils';

/**
 * CAP-C-07 局部侵入问答（AISlot）——「哪里不懂点哪里」。
 * Ctrl/Cmd+左键任意带 data-ai-entity="kind:id" 的卡片：卡片原位被 AI 解释卡
 * 覆盖（原卡保持挂载，零布局抖动）；overlay 内右键 / ESC / 滚动 / 关闭按钮恢复。
 * 解释内容来自静默场景 card-explain，事实一律由服务端按 id 查库组装。
 */

interface AISlotTarget {
  kind: string;
  id: string;
  rect: { top: number; left: number; width: number; height: number };
}

/** 从 data-ai-entity="kind:id" 属性解析实体指针（id 为 cuid，不含冒号） */
function parseEntityAttr(raw: string): { kind: string; id: string } | null {
  const sep = raw.indexOf(':');
  if (sep <= 0) return null;
  const kind = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  if (!kind || !id) return null;
  return { kind, id };
}

export function AISlotLayer() {
  const [target, setTarget] = useState<AISlotTarget | null>(null);
  const targetRef = useRef<AISlotTarget | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    targetRef.current = null;
    setTarget(null);
  }, []);

  useEffect(() => {
    const openFromEvent = (e: MouseEvent) => {
      if (e.button !== 0 || !(e.ctrlKey || e.metaKey)) return;
      const el = (e.target as Element | null)?.closest?.('[data-ai-entity]');
      if (!el) return;
      const parsed = parseEntityAttr(el.getAttribute('data-ai-entity') ?? '');
      if (!parsed) return;
      e.preventDefault();
      e.stopPropagation();
      const next: AISlotTarget = {
        ...parsed,
        rect: el.getBoundingClientRect().toJSON(),
      };
      targetRef.current = next;
      setTarget(next);
    };
    const onContextMenu = (e: MouseEvent) => {
      const overlay = overlayRef.current;
      if (!targetRef.current || !overlay) return;
      if (e.target instanceof Node && overlay.contains(e.target)) {
        e.preventDefault();
        close();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && targetRef.current) close();
    };
    const onScroll = (e: Event) => {
      if (!targetRef.current) return;
      const overlay = overlayRef.current;
      // overlay 内部的滚动（长解释内容）不视为离开原位
      if (overlay && e.target instanceof Node && overlay.contains(e.target)) {
        return;
      }
      close();
    };
    const onResize = () => {
      if (targetRef.current) close();
    };
    document.addEventListener('click', openFromEvent, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('click', openFromEvent, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [close]);

  // 可发现性：长按 Ctrl/Cmd 500ms 高亮全部可就地解释卡（组合键窗口内有其他
  // 键按下即取消，避免 Ctrl+C 等误亮）。只在根元素挂类，配合全局 CSS 后代
  // 选择器，React 重渲染不会覆盖高亮态。
  useEffect(() => {
    let holdTimer: number | null = null;
    const enterDiscovery = () => {
      holdTimer = null;
      document.documentElement.classList.add('ai-slot-discovery');
    };
    const exitDiscovery = () => {
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      document.documentElement.classList.remove('ai-slot-discovery');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Control' || e.key === 'Meta') && !e.repeat) {
        if (holdTimer === null) {
          holdTimer = window.setTimeout(enterDiscovery, 500);
        }
        return;
      }
      exitDiscovery();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        exitDiscovery();
      }
    };
    const onBlur = () => {
      exitDiscovery();
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      exitDiscovery();
    };
  }, []);

  if (!target) return null;

  // 高度下限=卡片原高（覆盖感），上限视口内；内容更长时 overlay 内部滚动。
  // jsdom 等无布局环境下 rect/innerHeight 可能给 NaN，兜底 320。
  const measured = Math.max(
    target.rect.height,
    Math.min(420, window.innerHeight - target.rect.top - 16),
  );
  const maxHeight = Number.isFinite(measured) ? measured : 320;

  return createPortal(
    <div
      ref={overlayRef}
      data-testid="ai-slot-overlay"
      // 与 AI 对话浮窗同属一个交互面：点它不应触发外层「点击外部关闭」
      data-ai-component="assistant.inline-slot"
      className="fixed z-50"
      style={{
        top: target.rect.top,
        left: target.rect.left,
        width: target.rect.width,
        maxHeight,
      }}
    >
      <AISlotAnswerCard target={target} onClose={close} />
    </div>,
    document.body,
  );
}

function AISlotAnswerCard({
  target,
  onClose,
}: {
  target: AISlotTarget;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { mutate: explainCard, data: mutationData, isPending, isError } = useCardExplain();
  const openAssistantWithDraft = useAppStore((s) => s.openAssistantWithDraft);
  const { kind, id } = target;

  useEffect(() => {
    explainCard({ kind, id });
  }, [kind, id, explainCard]);

  const insight = mutationData ? parseCardExplain(mutationData.data) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
      <div className="flex shrink-0 items-center gap-1.5 border-b px-3 py-2">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        <span className="text-xs font-medium text-muted-foreground">
          {t('aiSlot.badge')}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {insight?.title ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => {
                openAssistantWithDraft(
                  t('aiSlot.askDraft', { title: insight.title ?? '' }),
                );
                onClose();
              }}
            >
              <MessageCircleQuestion className="size-3.5" aria-hidden />
              {t('aiSlot.askMore')}
            </button>
          ) : null}
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={t('aiSlot.close')}
            onClick={onClose}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-sm">
        {isPending ? <AnswerSkeleton /> : null}
        {isError ? (
          <div className="flex flex-col items-start gap-2 py-2">
            <p className="text-sm text-destructive">{t('aiSlot.error')}</p>
            <button
              type="button"
              className="rounded border px-2 py-1 text-xs hover:bg-muted"
              onClick={() => explainCard({ kind, id })}
            >
              {t('aiSlot.retry')}
            </button>
          </div>
        ) : null}
        {insight ? <AnswerBody insight={insight} /> : null}
      </div>
    </div>
  );
}

function AnswerSkeleton() {
  return (
    <div className="space-y-2 py-1" aria-hidden>
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
    </div>
  );
}

function AnswerBody({
  insight,
}: {
  insight: ReturnType<typeof parseCardExplain>;
}) {
  const { t } = useTranslation();
  const empty =
    !insight.summary &&
    insight.details.length === 0 &&
    !insight.nextStep;
  return (
    <div className="space-y-2">
      {insight.title ? (
        <p className="font-medium leading-snug">{insight.title}</p>
      ) : null}
      {insight.summary ? (
        <p className="text-sm leading-relaxed text-foreground/90">
          {insight.summary}
        </p>
      ) : null}
      {insight.details.length > 0 ? (
        <dl className="space-y-1.5">
          {insight.details.map((d) => (
            <div key={`${d.label}:${d.text}`} className="flex gap-2 text-sm">
              <dt className="shrink-0 font-medium text-muted-foreground">
                {d.label}
              </dt>
              <dd className="leading-relaxed">{d.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {insight.nextStep ? (
        <div className="flex gap-2 rounded-md bg-muted/60 px-2 py-1.5 text-sm">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
          <p className="leading-relaxed">
            <span className="font-medium">{t('aiSlot.nextStep')}</span>
            {insight.nextStep}
          </p>
        </div>
      ) : null}
      {empty ? (
        <p className={cn('text-sm text-muted-foreground')}>
          {t('aiSlot.empty')}
        </p>
      ) : null}
    </div>
  );
}
