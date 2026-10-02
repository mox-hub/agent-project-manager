/**
 * 设置·「工作区」区块（CAP-A-26；2026-10-02 新增）。
 *
 * 承载「公开工作区名单」管理员开关：开启后，**未认证**的登录页可以拉到注册表里的
 * 工作区（仅 id + 名称）供用户在登录前选定目标工作区；关闭（默认）时登录页回落到
 * **本机最近使用过**的工作区 + 手动输入 id。
 *
 * 边界（与卡片同源，不可静默放宽）：
 *  - 仅放开「名称」这一层，库路径 `path` 永不暴露；
 *  - 每工作区一库的隔离与路由语义不变（P0-7 不松动）——这只是一个登录页的下拉数据源；
 *  - 写入走 PUT /workspaces/public-list（服务端 RolesGuard 限 admin/maintainer）。
 *
 * 读值复用公开端点（与登录页同一真相源）；非管理员据 useAuth().isAdmin 提前禁用控件。
 */
import { Building2, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageShell } from '@/components/semantic/page-shell';
import { SettingsHeader } from '@/components/semantic/settings-header';
import { nodeToText } from '@/components/semantic/page-header';
import { SettingsFieldRow } from '@/components/semantic/settings-field-row';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { usePublicWorkspaceList } from '@/modules/workspace/hooks/use-public-workspace-list';
import { useSetPublicWorkspaceList } from '@/modules/workspace/hooks/use-public-workspace-setting';

export function WorkspaceSection() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { data, isLoading } = usePublicWorkspaceList();
  const setPublicList = useSetPublicWorkspaceList();

  const enabled = data?.enabled ?? false;
  const count = data?.workspaces.length ?? 0;

  return (
    <PageShell variant="standard" contentClassName="space-y-6">
      <SettingsHeader
        icon={Building2}
        tone="blue"
        title={t('settings.workspaceVisibility')}
        description={t('settings.workspaceVisibilityDesc')}
        actions={<FavoriteToggle label={nodeToText(t('settings.workspaceVisibility')).trim()} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.workspaceVisibilityPublicListTitle')}</CardTitle>
          <CardDescription>{t('settings.workspaceVisibilityPublicListDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingsFieldRow
            title={t('settings.workspaceVisibilitySwitchLabel')}
            description={
              isLoading
                ? t('settings.workspaceVisibilityLoading')
                : enabled
                  ? t('settings.workspaceVisibilityOnHint', { count })
                  : t('settings.workspaceVisibilityOffHint')
            }
            control={
              isLoading ? (
                <Spinner />
              ) : (
                <Switch
                  checked={enabled}
                  disabled={!isAdmin || setPublicList.isPending}
                  onChange={(e) =>
                    setPublicList.mutate({ enabled: e.target.checked })
                  }
                  aria-label={t('settings.workspaceVisibilitySwitchLabel')}
                />
              )
            }
          />

          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              {t('settings.workspaceVisibilityAdminOnly')}
            </p>
          )}

          {/* 安全边界提示：把「放开的是什么、没放开什么」写在开关旁边，避免误读为全量暴露 */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {t('settings.workspaceVisibilitySecurityNote')}
            </p>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export default WorkspaceSection;
