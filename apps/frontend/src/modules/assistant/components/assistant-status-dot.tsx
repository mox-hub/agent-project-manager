/**
 * 同事位/面板头共用的状态点与状态色映射。
 */
import { cn } from '@/lib/utils';
import type { AssistantStatusState } from '../hooks/use-assistant-status';

export const STATE_DOT: Record<AssistantStatusState, string> = {
  needYou: 'bg-accent-red',
  working: 'bg-accent-blue',
  suggestions: 'bg-accent-yellow',
  idle: 'bg-accent-green',
};

export const STATE_TEXT: Record<AssistantStatusState, string> = {
  needYou: 'text-accent-red',
  working: 'text-accent-blue',
  suggestions: 'text-accent-yellow',
  idle: 'text-content-text-muted',
};

export function AssistantStatusDot({
  state,
  className,
}: {
  state: AssistantStatusState;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-block size-1.5 rounded-full', STATE_DOT[state], className)}
      aria-hidden="true"
    />
  );
}
