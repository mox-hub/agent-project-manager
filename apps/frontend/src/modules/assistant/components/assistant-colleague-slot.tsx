/**
 * 侧栏同事位 —— 主 AI 以「人」的身份占侧栏底部一个位置：
 * 头像 + 状态点 + 待决数；点击走进办公室（门语义，办公室页是这扇门后的屋子）。
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssistantStatus } from '../hooks/use-assistant-status';
import { AssistantStatusDot, STATE_TEXT } from './assistant-status-dot';

export function AssistantColleagueSlot({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useAssistantStatus();
  const statusLabel = t(`assistant.status.${status.state}`);
  const active = status.state === 'needYou';

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => navigate('/app/office')}
        className="relative flex w-full items-center justify-center rounded-lg p-2 transition-colors hover:bg-sidebar-accent/80"
        aria-label={t('assistant.colleague.open')}
        data-ai-component="assistant.colleague-slot"
        data-ai-action="assistant.colleague.office.click"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple">
          <Bot className="size-4" />
        </span>
        <AssistantStatusDot state={status.state} className="absolute right-1.5 top-1.5 ring-2 ring-sidebar" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/app/office')}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/80"
      data-ai-component="assistant.colleague-slot"
      data-ai-action="assistant.colleague.office.click"
    >
      <span className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple">
        <Bot className="size-4" />
        <AssistantStatusDot state={status.state} className="absolute -right-0.5 -top-0.5 ring-2 ring-sidebar" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-sidebar-foreground">
          {t('assistant.personaName')}
        </span>
        <span className={cn('block truncate text-11', STATE_TEXT[status.state])}>
          {statusLabel}
        </span>
      </span>
      {active && status.pending > 0 && (
        <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-10 font-semibold text-primary-foreground tabular-nums">
          {status.pending > 99 ? '99+' : status.pending}
        </span>
      )}
    </button>
  );
}
