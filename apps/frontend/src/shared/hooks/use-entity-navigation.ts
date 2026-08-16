/**
 * useEntityNavigation - 任务/Bug 详情页内 prev/next 导航
 *
 * - 在同一项目的实体列表中找到当前 id, 计算上一个/下一个 id
 * - 当前 id 不在列表中 (如 inbox) 时返回 null
 * - 数据未加载时 prev/next 也返回 null, 由调用方决定 disabled
 */
import { useMemo } from 'react';
import {
  useProjectTasks,
  useProjectBugs,
} from '@/modules/task/hooks/use-project-tasks';
import type { Task } from '@/modules/task/api/task-api';

export type EntityKind = 'task' | 'bug';

export interface EntityNavInfo {
  hasPrev: boolean;
  hasNext: boolean;
  prevId: string | null;
  nextId: string | null;
  /** 同一项目内总数 */
  total: number;
  /** 当前 id 在列表中的索引 (1-based), 用于 Header 显示 "X/N" */
  currentPosition: number;
  isLoading: boolean;
}

export function useEntityNavigation(
  projectId: string | null | undefined,
  currentId: string | undefined,
  kind: EntityKind,
): EntityNavInfo {
  const useHook = kind === 'task' ? useProjectTasks : useProjectBugs;
  const { data: listResp, isLoading } = useHook(projectId ?? undefined, { pageSize: 500 });

  return useMemo(() => {
    const empty: EntityNavInfo = {
      hasPrev: false,
      hasNext: false,
      prevId: null,
      nextId: null,
      total: 0,
      currentPosition: 0,
      isLoading,
    };
    if (!projectId || !currentId || !listResp?.data) return empty;
    const list = listResp.data;
    const idx = list.findIndex((t: Task) => t.id === currentId);
    if (idx === -1) {
      return { ...empty, total: list.length };
    }
    const prev = idx > 0 ? list[idx - 1] : null;
    const next = idx < list.length - 1 ? list[idx + 1] : null;
    return {
      hasPrev: !!prev,
      hasNext: !!next,
      prevId: prev?.id ?? null,
      nextId: next?.id ?? null,
      total: list.length,
      currentPosition: idx + 1,
      isLoading,
    };
  }, [projectId, currentId, listResp, isLoading]);
}