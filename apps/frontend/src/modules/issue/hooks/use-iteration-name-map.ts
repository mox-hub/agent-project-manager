import { useQueries } from '@tanstack/react-query';
import { taskApi, type IterationRef } from '../api/issue-api';

/**
 * 全局任务页迭代筛选维度（P1-16）：迭代名需按项目查询（GET /projects/:id/iterations），
 * 没有跨项目迭代端点；这里对当前列表出现过的项目逐个取迭代（queryKey 与
 * useProjectIterations 共享缓存），聚合为 iterationId → IterationRef 映射供筛选项展示名称。
 * 任一项目迭代加载失败不阻断：缺失的项目迭代仅以 id 截断串兜底显示。
 */
export function useIterationNameMap(projectIds: string[]) {
  const queries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: ['projectIterations', projectId],
      queryFn: () => taskApi.getProjectIterations(projectId),
      staleTime: 60 * 1000,
      enabled: !!projectId,
    })),
  });

  // 小数据量直算（不做 useMemo，规避 useQueries 每帧新数组导致的依赖抖动）
  const map = new Map<string, IterationRef>();
  queries.forEach((query) => {
    (query.data ?? []).forEach((iteration) => map.set(iteration.id, iteration));
  });
  return map;
}
