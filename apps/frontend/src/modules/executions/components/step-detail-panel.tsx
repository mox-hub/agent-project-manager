/**
 * 步骤详情面板 —— 事件条目选中后右侧展示输入/产出代码块（对照运行详情设计稿右栏）。
 * 与弹窗主体共用一套设计 token（bg-muted 代码块 + border-border），支持复制与展开收起；
 * 无结构化详情时回退展示条目文本。
 */
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, X } from 'lucide-react';
import type { RunEventEntry } from './run-details-format';

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="ghost"
      type="button"
      title={t('runDetails.copy')}
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="transition-colors"
    >
      {copied ? (
        <Check className="size-3.5 text-accent-green" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
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
      <pre className="overflow-x-auto whitespace-pre p-3 font-mono text-2xs leading-relaxed text-content-text">
        {display}
      </pre>
      {lines.length > maxLines ? (
        <div className="flex items-center justify-center border-t border-border bg-muted/20 py-1">
          <Button variant="ghost"
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="transition-colors"
          >
            {expanded
              ? t('runDetails.collapse')
              : t('runDetails.expandAll', { count: lines.length })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DetailSection({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <p className="mb-1.5 text-3xs font-semibold uppercase tracking-wider text-content-text-muted">
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
        <span className="truncate font-mono text-xs font-semibold text-content-text">
          {entry.title ??
            (entry.titleKey
              ? t(entry.titleKey)
              : t(`runDetails.event.${entry.kind}`))}
        </span>
        {offsetLabel ? (
          <span className="shrink-0 font-mono text-2xs text-content-text-muted">{offsetLabel}</span>
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {hasContent && output ? <CopyButton text={output} /> : null}
          <Button variant="ghost"
            type="button"
            onClick={onClose}
            className="transition-colors"
          >
            <X className="size-3.5" />
          </Button>
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
