import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface ConfidenceBarProps {
  /** 概率 0-1；非法值（NaN/Infinity）不渲染 */
  value: number;
  /** 左侧标签（如「AI 预估达成」）；缺省用「AI 预估」 */
  label?: string;
  /** 隐藏右侧百分比数字（空间紧张的行内/选项内嵌场景） */
  hidePercent?: boolean;
  className?: string;
}

/**
 * ConfidenceBar - [AI] JEV 概率条（CAP-A-27 扩展批）
 * 0-100% 概率的细条统一呈现。紫色系与真实数据进度条区分——这是 AI 预估不是事实；
 * 置信 <0.7 整条转黄（tooltip 恒挂 advisory 声明）。手搓 div 条与 completion-review
 * 既有范式一致，不走 base-ui Indicator 的值注入（细条场景几何需自持）。
 */
export function ConfidenceBar({
  value,
  label,
  hidePercent,
  className,
}: ConfidenceBarProps) {
  const { t } = useTranslation();
  if (!Number.isFinite(value)) return null;
  const pct = Math.max(0, Math.min(1, value));
  const pct100 = Math.round(pct * 100);
  const low = pct < 0.7;
  const resolvedLabel = label ?? t('aiJudge.estimatedProbability');
  return (
    <span
      title={t('aiJudge.advisoryTooltip')}
      data-ai-component="confidence-bar"
      data-confidence={pct}
      className={cn('inline-flex items-center gap-1.5 select-none', className)}
    >
      {resolvedLabel && (
        <span className="shrink-0 text-2xs text-content-text-muted">
          {resolvedLabel}
        </span>
      )}
      <span
        className={cn(
          'relative inline-block h-1 w-14 shrink-0 overflow-hidden rounded-full',
          low ? 'bg-accent-yellow-light' : 'bg-accent-purple-light',
        )}
      >
        <span
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            low ? 'bg-accent-yellow' : 'bg-accent-purple',
          )}
          style={{ width: `${pct100}%` }}
        />
      </span>
      {!hidePercent && (
        <span
          className={cn(
            'shrink-0 font-mono text-2xs tabular-nums',
            low ? 'text-accent-yellow' : 'text-accent-purple',
          )}
        >
          {pct100}%
        </span>
      )}
    </span>
  );
}
