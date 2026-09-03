/**
 * 助手状态推导 —— 同事位状态点与面板头部共用。
 * 优先级：需要你（有阻断待决）> 有建议（有 advisory）> 空闲；
 * 「工作中」（有执行中 run）在批 C 接入执行桥后并入最高优先级判定。
 */
import { useDecisionSummary } from '@/modules/decision/hooks/use-decisions';
import type { DecisionSummary } from '@/modules/decision/api/decision-api';

export type AssistantStatusState = 'needYou' | 'suggestions' | 'idle';

export interface AssistantStatus {
  state: AssistantStatusState;
  pending: number;
  blocking: number;
  advisory: number;
}

/** 纯推导函数（测试直测，不挂 query） */
export function deriveAssistantStatus(summary?: DecisionSummary): AssistantStatus {
  const pending = summary?.pending ?? 0;
  const blocking = summary?.blocking ?? 0;
  const advisory = summary?.advisory ?? 0;
  if (blocking > 0) return { state: 'needYou', pending, blocking, advisory };
  if (advisory > 0) return { state: 'suggestions', pending, blocking, advisory };
  return { state: 'idle', pending, blocking, advisory };
}

export function useAssistantStatus(projectId?: string): AssistantStatus {
  const { data } = useDecisionSummary(projectId);
  return deriveAssistantStatus(data ?? undefined);
}
