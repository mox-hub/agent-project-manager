/**
 * 助手状态推导 —— 同事位状态点与面板头部共用。
 * 优先级：需要你（有阻断待决）> 工作中（有执行中派发）> 有建议（有 advisory）> 空闲。
 *
 * 「工作中」数据源用 GET /runtime/dispatches（工作区级派发记录，CLI 接单后到
 * 结果回写前 status=pending/running）。不用 /execution/runs：该端点必填 projectId
 * 且返回 {runs,total} 分页形状，无法支撑全局态判定。
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';
import { useEventSubscription } from '@/infrastructure/hooks/use-event-subscription';
import { useDecisionSummary } from '@/modules/decision/hooks/use-decisions';
import type { DecisionSummary } from '@/modules/decision/api/decision-api';

export type AssistantStatusState = 'needYou' | 'working' | 'suggestions' | 'idle';

export interface AssistantStatus {
  state: AssistantStatusState;
  pending: number;
  blocking: number;
  advisory: number;
}

const ACTIVE_DISPATCH_STATUSES = new Set(['pending', 'running']);

interface DispatchSummary {
  status?: string;
  projectId?: string;
}

/** 是否存在活跃派发（工作区级；传 projectId 时收窄到该项目） */
export function useActiveDispatchExists(projectId?: string) {
  const queryClient = useQueryClient();
  // 即时性由 socket 推送驱动（服务端 dispatch 生命周期 → runtime.dispatch.changed），
  // 轮询仅作断连兜底
  useEventSubscription('runtime.dispatch.changed', () => {
    queryClient.invalidateQueries({ queryKey: ['assistant', 'active-dispatch'] });
  });
  return useQuery({
    queryKey: ['assistant', 'active-dispatch', projectId ?? null],
    queryFn: async () => {
      const res = await api.get<unknown>('/runtime/dispatches', { limit: 50 });
      // 服务端返回形状做过防御（分页结构坑：消费前先验数组）
      const list: DispatchSummary[] = Array.isArray(res)
        ? res
        : Array.isArray((res as { data?: unknown })?.data)
          ? ((res as { data: DispatchSummary[] }).data)
          : [];
      return list.some(
        (d) =>
          ACTIVE_DISPATCH_STATUSES.has(String(d?.status ?? '')) &&
          (!projectId || d?.projectId === projectId),
      );
    },
    refetchInterval: 30000,
  });
}

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
  const { data: hasActiveRun } = useActiveDispatchExists(projectId);
  return deriveAssistantStatus(data ?? undefined, hasActiveRun === true);
}
