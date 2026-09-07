/**
 * 早报区 —— 主 AI「先开口」的确定性拼接（不依赖 LLM，LLM 文案记入 roadmap）。
 * 自我介绍一行 + 待决现状统计，让用户第一动作是「看和选」而非面对空白输入框。
 */
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantStatus } from '../hooks/use-assistant-status';

export function AssistantOpeningReport({
  status,
  personaName,
}: {
  status: AssistantStatus;
  personaName: string;
}) {
  const { t } = useTranslation();

  const stats: Array<{ label: string; value: number; tone: string }> = [
    { label: t('decision.metrics.pending'), value: status.pending, tone: 'text-content-text-secondary' },
    { label: t('decision.metrics.blocking'), value: status.blocking, tone: status.blocking > 0 ? 'text-accent-red' : 'text-content-text-secondary' },
    { label: t('decision.metrics.advisory'), value: status.advisory, tone: status.advisory > 0 ? 'text-accent-yellow' : 'text-content-text-secondary' },
  ];

  return (
    <section
      className="space-y-2 rounded-xl border border-border bg-content-bg-secondary/50 p-3"
      data-ai-component="assistant.opening-report"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-accent-purple" />
        <p className="text-xs font-semibold text-content-text">{t('assistant.report.title')}</p>
      </div>
      <p className="text-xs text-content-text-secondary">
        {t('assistant.report.intro', { name: personaName })}
      </p>
      <div className="flex items-center gap-2">
        {stats.map((stat) => (
          <span
            key={stat.label}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-11 tabular-nums',
              stat.tone,
            )}
          >
            <span className="font-semibold">{stat.value}</span>
            {stat.label}
          </span>
        ))}
      </div>
    </section>
  );
}
