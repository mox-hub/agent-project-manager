/**
 * 「公开工作区名单」开关的写入 hook（CAP-A-26）。
 *
 * 读值复用公开端点 `GET /workspaces/public`（见 usePublicWorkspaceList，
 * 登录页与设置页同一真相源）；写入走 `PUT /workspaces/public-list`，
 * 服务端 RolesGuard 限 admin/maintainer——非管理员点击会被 403 拦下，
 * 设置页据 useAuth().isAdmin 提前禁用控件，避免必败的往返。
 *
 * 成功后就地失效 `['workspaces-public']`：登录页若同时打开会立刻看到名单变化。
 */
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToastMutation } from '@/shared/hooks';
import {
  workspaceApi,
  type PublicWorkspaceListResult,
  type SetPublicListRequest,
} from '../api/workspace-api';

export function useSetPublicWorkspaceList() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useToastMutation<
    PublicWorkspaceListResult,
    Error,
    SetPublicListRequest
  >({
    successMessage: t('settings.workspaceVisibilitySaveSuccess'),
    errorPrefix: t('settings.workspaceVisibilitySaveError'),
    mutationFn: (data) => workspaceApi.setPublicList(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces-public'] });
    },
  });
}
