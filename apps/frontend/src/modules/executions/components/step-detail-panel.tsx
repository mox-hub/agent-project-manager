/**
 * 步骤详情面板 —— 事件条目选中后右侧展示输入/产出代码块（对照运行详情设计稿右栏）。
 * 与弹窗主体共用一套设计 token（bg-muted 代码块 + border-border），支持复制与展开收起；
 * 无结构化详情时回退展示条目文本。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, X } from 'lucide-react';
import type { RunEventEntry } from './run-details-format';

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={t('runDetails.copy')}
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded p-1 text-content-text-muted transition-colors hover:bg-muted hover:text-content-text"
    >
      {copied ? (
        <Check className="size-3.5 text-accent-green" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

function CodeBlock({ code, maxLines }: { code: string; maxLines: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const lines = code.split('\n');
  const truncated = !expanded && lines.length > maxLines;
  const display = truncated ? lines.slice(0, maxLines).join('\n') : code;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      <pre className="overflow-x-auto whitespace-pre p-3 font-mono text-11 leading-relaxed text-content-text">
        {display}
      </pre>
      {lines.length > maxLines ? (
        <div className="flex items-center justify-center border-t border-border bg-muted/20 py-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-11 text-content-text-muted transition-colors hover:text-content-text"
          >
            {expanded
              ? t('runDetails.collapse')
              : t('runDetails.expandAll', { count: lines.length })}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DetailSection({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <p className="mb-1.5 text-10 font-semibold uppercase tracking-wider text-content-text-muted">
        {label}
      </p>
      <CodeBlock code={code} maxLines={12} />
    </div>
  );
}

export function StepDetailPanel({
  entry,
  offsetLabel,
  onClose,
}: {
  entry: RunEventEntry;
  offsetLabel?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const input = entry.detail?.input;
  const output = entry.detail?.output ?? (!entry.detail?.input ? entry.text : undefined);
  const hasContent = !!(input || output);

  return (
    <div className="flex w-88 shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      {/* 头部：类型标签 + 偏移 + 工具名 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/20 px-3 py-2.5">
        <span className="truncate font-mono text-12 font-semibold text-content-text">
          {entry.title ?? t(`runDetails.event.${entry.kind}`)}
        </span>
        {offsetLabel ? (
          <span className="shrink-0 font-mono text-11 text-content-text-muted">{offsetLabel}</span>
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {hasContent && output ? <CopyButton text={output} /> : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-content-text-muted transition-colors hover:bg-muted hover:text-content-text"
          >
            <X className="size-3.5" />
          </button>
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {hasContent ? (
          <>
            {input ? <DetailSection label={t('runDetails.stepInput')} code={input} /> : null}
            {output ? <DetailSection label={t('runDetails.stepOutput')} code={output} /> : null}
          </>
        ) : (
          <p className="text-xs italic text-content-text-muted">{t('runDetails.stepNoDetail')}</p>
        )}
      </div>
    </div>
  );
}
