import { useMemo } from 'react';
import {
  buildStatusVisualMap,
  PROJECT_WORKFLOW_VISUALS,
  TASK_STATUS_VISUALS,
  type StatusVisualEntry,
  type StatusVisualDefinition,
} from '@/shared/status/status-visuals';
import { useStatuses } from './use-metadata';

export type { StatusVisualEntry };

/**
 * 动态状态视觉映射（设置·状态真实化）：StatusDefinition 落库的 color/icon 优先，
 * 静态语义映射（status-visuals）兜底。消费方拿 key 查表渲染，禁止另写覆盖映射。
 */
export function useStatusVisualMap(
  type: 'task' | 'project',
): Map<string, StatusVisualEntry> {
  const { data } = useStatuses(undefined, type);
  return useMemo(
    () =>
      buildStatusVisualMap(
        (data ?? []) as StatusVisualDefinition[],
        type === 'project' ? PROJECT_WORKFLOW_VISUALS : TASK_STATUS_VISUALS,
      ),
    [data, type],
  );
}

/** 查表便捷形式：未知 key 返回 undefined，调用方自行回落静态词表 */
export function useStatusVisual(
  type: 'task' | 'project',
  statusKey: string | undefined | null,
): StatusVisualEntry | undefined {
  const map = useStatusVisualMap(type);
  return useMemo(
    () => (statusKey ? map.get(statusKey) : undefined),
    [map, statusKey],
  );
}
