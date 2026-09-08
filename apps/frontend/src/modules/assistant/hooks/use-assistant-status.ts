/**
 * 助手状态推导 —— 同事位状态点与面板头部共用。
 * 优先级：需要你（有阻断待决）> 工作中（有执行中派发）> 有建议（有 advisory）> 空闲。
 *
 * 「工作中」数据源用 GET /runtime/dispatches/summary（工作区级派发活跃度
 * 轻端点：服务端统计最近 200 条记录的 pending/running 并支持 projectId 收窄，
 * 避免高频轮询拉全量派发列表撑大响应与服务端日志）。不用 /execution/runs：
 * 该端点必填 projectId 且返回 {runs,total} 分页形状，无法支撑全局态判定。
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';
import { useDecisionSummary } from '@/modules/decision/hooks/use-decisions';
import type { DecisionSummary } from '@/modules/decision/api/decision-api';

export type AssistantStatusState = 'needYou' | 'working' | 'suggestions' | 'idle';

export interface AssistantStatus {
  state: AssistantStatusState;
  pending: number;
  blocking: number;
  advisory: number;
}

interface DispatchesSummary {
  active?: boolean;
}

/** 是否存在活跃派发（工作区级；传 projectId 时收窄到该项目） */
export function useActiveDispatchExists(projectId?: string) {
  return useQuery({
    queryKey: ['assistant', 'active-dispatch', projectId ?? null],
    queryFn: async () => {
      const res = await api.get<unknown>('/runtime/dispatches/summary', {
        projectId,
      });
      // 响应经 unwrapEnvelope 拆壳；防御性消费（契约演进坑：先验形状）
      const summary = (res ?? {}) as DispatchesSummary;
      return summary.active === true;
    },
    // 页面隐藏时暂停轮询（Tauri 壳/前台闲置场景的显式保险）
    refetchInterval: () => (document.hidden ? false : 5000),
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
