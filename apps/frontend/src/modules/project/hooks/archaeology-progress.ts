import type { ExecutionRunEvent } from '@/modules/executions/api/execution-api';

/**
 * 考古进度计数：取「工具调用 + 思考」事件数。
 * 不用 runDetail.steps——那张表只有进程内执行器会写，runtime 守护进程路径只落
 * 事件流水；usage 事件存在重复上报，也不能计入。
 */
export function countArchaeologyProgress(
  events?: ExecutionRunEvent[],
): number {
  if (!events?.length) return 0;
  return events.filter(
    (e) =>
      e.eventType === 'execution.tool.called' ||
      e.eventType === 'execution.thinking',
  ).length;
}
