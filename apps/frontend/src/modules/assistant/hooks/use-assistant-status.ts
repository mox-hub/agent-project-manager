/**
 * 助手状态推导 —— 同事位状态点与面板头部共用。
 * 优先级：需要你（有阻断待决）> 工作中（有执行中 run）> 有建议（有 advisory）> 空闲。
 */
import { useDecisionSummary } from '@/modules/decision/hooks/use-decisions';
import { useExecutionRuns } from '@/modules/execution/hooks/use-execution';
import type { DecisionSummary } from '@/modules/decision/api/decision-api';

export type AssistantStatusState = 'needYou' | 'working' | 'suggestions' | 'idle';

export interface AssistantStatus {
  state: AssistantStatusState;
  pending: number;
  blocking: number;
  advisory: number;
}

const ACTIVE_RUN_STATUSES = new Set(['planned', 'in_progress', 'pending_approval']);

/** 纯推导函数（测试直测，不挂 query） */
export function deriveAssistantStatus(
  summary?: DecisionSummary,
  hasActiveRun = false,
): AssistantStatus {
  const pending = summary?.pending ?? 0;
  const blocking = summary?.blocking ?? 0;
  const advisory = summary?.advisory ?? 0;
  if (blocking > 0) return { state: 'needYou', pending, blocking, advisory };
  if (hasActiveRun) return { state: 'working', pending, blocking, advisory };
  if (advisory > 0) return { state: 'suggestions', pending, blocking, advisory };
  return { state: 'idle', pending, blocking, advisory };
}

export function useAssistantStatus(projectId?: string): AssistantStatus {
  const { data } = useDecisionSummary(projectId);
  const runs = useExecutionRuns();
  const hasActiveRun = (runs.data ?? []).some((r) =>
    ACTIVE_RUN_STATUSES.has(r.status),
  );
  return deriveAssistantStatus(data ?? undefined, hasActiveRun);
}
