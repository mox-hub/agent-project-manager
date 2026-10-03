import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface AiVerdictPillProps {
  /** 判定文案（调用方按场景翻译结论，如「建议批准」「benign」） */
  label: string;
  /** 置信度 0-1；缺省不显示百分比 */
  confidence?: number | null;
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * AiVerdictPill - [AI] JEV 快速判断徽注（CAP-A-27 扩展批）
 * 离散判定 + 置信度的统一呈现；tooltip 恒挂「仅辅助参考」advisory 声明；
 * 置信 <0.7 转黄并标低置信。无判定时由调用方整块隐藏——本组件不渲染「AI 失败」噪音。
 */
export function AiVerdictPill({
  label,
  confidence,
  size = 'sm',
  className,
}: AiVerdictPillProps) {
  const { t } = useTranslation();
  const low = typeof confidence === 'number' && confidence < 0.7;
  return (
    <span
      title={t('aiJudge.advisoryTooltip')}
      data-ai-component="ai-verdict-pill"
      data-confidence={typeof confidence === 'number' ? confidence : undefined}
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 font-medium',
        low
          ? 'border-accent-yellow/30 bg-accent-yellow-light/40 text-accent-yellow'
          : 'border-accent-purple/30 bg-accent-purple-light/40 text-accent-purple',
        size === 'xs' ? 'text-2xs' : 'text-xs',
        className,
      )}
    >
      <Sparkles className={cn('shrink-0', size === 'xs' ? 'size-2.5' : 'size-3')} />
      <span className="truncate">{label}</span>
      {typeof confidence === 'number' && (
        <span className="font-mono tabular-nums opacity-80">
          {Math.round(confidence * 100)}%
        </span>
      )}
      {low && <span className="shrink-0 text-2xs opacity-90">{t('aiJudge.lowConfidence')}</span>}
    </span>
  );
}
