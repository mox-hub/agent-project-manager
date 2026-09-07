/**
 * 运行信息面板 —— provider/runtime/mode/工作目录 + 时间线 + token/费用细分（含按模型汇总）。
 * 弹窗右上 ℹ 按钮切换显示；选中步骤详情时让位。
 */
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RunDetailsData } from './run-details-format';
import { formatCost, formatTokens } from './run-details-format';

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function InfoRow({
  label,
  value,
  mono,
  wrap,
  hl,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
  hl?: boolean;
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="w-16 shrink-0 text-content-text-muted">{label}</span>
      <span
        className={cn(
          'min-w-0 flex-1 text-content-text',
          mono && 'font-mono text-11',
          wrap && 'break-all leading-relaxed',
          hl && 'font-mono font-medium text-accent-green',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2.5 border-b border-border px-4 py-3 last:border-b-0">{children}</div>;
}

export function RunInfoPanel({
  data,
  onClose,
}: {
  data: RunDetailsData;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const binding = data.bindings?.[0];
  const byModel = data.costBreakdown?.byModel ?? {};
  const modelRows = Object.entries(byModel);

  return (
    <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-13 font-semibold">{t('runDetails.infoTitle')}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-content-text-muted transition-colors hover:text-content-text"
        >
          <X className="size-4" />
        </button>
      </div>

      <Section>
        <InfoRow
          label={t('runDetails.details.provider')}
          value={binding?.providerId ?? '—'}
          mono
        />
        <InfoRow label={t('runDetails.details.runtime')} value={binding?.runtimeId ?? '—'} mono />
        <InfoRow
          label={t('runDetails.details.mode')}
          value={
            binding
              ? t('runDetails.details.modeDaemon')
              : t('runDetails.details.modeLocal')
          }
        />
        <InfoRow
          label={t('runDetails.details.workdir')}
          value={binding?.workspaceRoot ?? '—'}
          mono
          wrap
        />
      </Section>

      <Section>
        <InfoRow label={t('runDetails.details.created')} value={formatDateTime(data.createdAt)} mono />
        <InfoRow label={t('runDetails.details.started')} value={formatDateTime(data.startedAt)} mono />
        <InfoRow
          label={t('runDetails.details.completed')}
          value={formatDateTime(data.completedAt ?? data.terminatedAt)}
          mono
        />
      </Section>

      <Section>
        <InfoRow
          label={t('runDetails.details.totalTokens')}
          value={formatTokens(data.totalTokens) ?? '—'}
          mono
        />
        <InfoRow
          label={t('runDetails.details.cost')}
          value={formatCost(data.totalCost) ?? '—'}
          mono
          hl
        />
      </Section>

      {modelRows.length > 0 ? (
        <Section>
          <p className="text-10 font-semibold uppercase tracking-wider text-content-text-muted">
            {t('runDetails.byModel')}
          </p>
          {modelRows.map(([model, stat]) => (
            <div key={model} className="flex items-center justify-between gap-2 text-11">
              <span className="min-w-0 truncate font-mono text-content-text-secondary">{model}</span>
              <span className="shrink-0 font-mono text-content-text-muted">
                {formatTokens(stat.tokens) ?? '0'} · {formatCost(stat.cost) ?? '$0.00'}
              </span>
            </div>
          ))}
        </Section>
      ) : null}
    </div>
  );
}
