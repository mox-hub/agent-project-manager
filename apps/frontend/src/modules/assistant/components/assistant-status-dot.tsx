/**
 * 同事位/面板头共用的状态点与状态色映射。
 *
 * §19.5 收敛（2026-09-28）：本模块不再自造配色——业务层 status→tone 走
 * `shared/status/status-visuals.ts` 的 ASSISTANT_STATUS_TONE，
 * 视觉层 tone→class 走 `components/ui/tone.ts`。两个导出保留原签名，
 * 供 radial-watch-deck / assistant-panel / assistant-colleague-slot / colleague-card
 * 既有消费方零改动续用（值改为 tone 唯一词表派生）。
 */
import { cn } from '@/lib/utils';
import { TONE_CLASS } from '@/components/ui/tone';
import { ASSISTANT_STATUS_TONE } from '@/shared/status/status-visuals';
import type { AssistantStatusState } from '../hooks/use-assistant-status';

const toneOf = (state: AssistantStatusState) =>
  TONE_CLASS[ASSISTANT_STATUS_TONE[state] ?? 'default'];

export const STATE_DOT: Record<AssistantStatusState, string> = {
  needYou: toneOf('needYou').dot,
  working: toneOf('working').dot,
  suggestions: toneOf('suggestions').dot,
  idle: toneOf('idle').dot,
};

export const STATE_TEXT: Record<AssistantStatusState, string> = {
  needYou: toneOf('needYou').text,
  working: toneOf('working').text,
  suggestions: toneOf('suggestions').text,
  idle: toneOf('idle').text,
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
