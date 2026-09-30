/**
 * 工作区列表查询 hook：注册表元数据（含 default）。
 * queryKey 与既有页面（new-workspace-page）保持同键 ['workspaces-list']，
 * 失效行为跨页面一致。
 */
import { useQuery } from '@tanstack/react-query';

import { workspaceApi, type WorkspaceRecord } from '../api/workspace-api';

export function useWorkspaceList() {
  return useQuery<{ workspaces: WorkspaceRecord[] }>({
    queryKey: ['workspaces-list'],
    queryFn: () => workspaceApi.list(),
    staleTime: 60 * 1000,
  });
}
