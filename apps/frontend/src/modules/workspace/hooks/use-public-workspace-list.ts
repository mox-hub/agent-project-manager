/**
 * 公开工作区名单查询 hook（CAP-A-26）。
 *
 * 未认证可读（`GET /workspaces/public`）；服务端按管理员开关决定是否返回名单——
 * 关闭时 `{ enabled:false, workspaces: [] }`。登录卡片据此决定「列出可选工作区」
 * 还是「回落到本机最近列表 / 手动输入」。
 *
 * 失败一律静默降级（retry: false + 调用方读 `data?.enabled`），绝不因公开端点不可达
 * 而阻碍登录——回落路径本就是为「拿不到名单」准备的。
 */
import { useQuery } from '@tanstack/react-query';

import { workspaceApi, type PublicWorkspaceListResult } from '../api/workspace-api';

export function usePublicWorkspaceList() {
  return useQuery<PublicWorkspaceListResult>({
    queryKey: ['workspaces-public'],
    queryFn: () => workspaceApi.publicList(),
    staleTime: 60 * 1000,
    retry: false,
  });
}
