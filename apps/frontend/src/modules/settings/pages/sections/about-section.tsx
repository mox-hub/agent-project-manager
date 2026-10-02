/**
 * @file 设置页 · 关于区块
 * @description 产品信息（运行模式徽标/版本/外链）+ 桌面壳偏好卡收编（自动更新/
 *              关窗行为/诊断导出，ADR-015 补记 4 自 runtime 页迁入）。web 模式下
 *              桌面偏好卡内部自渲染 null，产品卡始终可见。
 *              web 模式不显示版本号：发版主版本随 desktop 包 bump（0.7.x），
 *              frontend/server 包版本（0.6.2）落后于发版，展示会误导。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Info, Package } from 'lucide-react';
import {
  invoke,
  isDesktopShellAvailable,
  type DesktopAppInfo,
} from '@/shared/types/electron-api';
import { DesktopPreferencesCard } from '@/modules/desktop';
import { PageShell } from '@/components/semantic/page-shell';
import { SettingsHeader } from '@/components/semantic/settings-header';
import { SettingsSectionCard } from '@/components/semantic/settings-section-card';
import { nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const RELEASES_URL = 'https://github.com/mox-hub/agent-project-manager/releases';
const REPO_URL = 'https://github.com/mox-hub/agent-project-manager';

export function AboutSection() {
  const { t } = useTranslation();
  const isDesktop = isDesktopShellAvailable();
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop) {
      return;
    }
    void invoke<DesktopAppInfo>('get_app_info')
      .then((info) => setAppVersion(info.version))
      .catch(() => undefined);
  }, [isDesktop]);

  return (
    <PageShell
      variant="standard"
      contentClassName="space-y-6"
      aiPage="settings.about"
    >
      <SettingsHeader
        icon={Info}
        tone="blue"
        title={t('settings.aboutTitle')}
        description={t('settings.aboutDesc')}
        actions={<FavoriteToggle label={nodeToText(t('settings.aboutTitle')).trim()} />}
      />

      <SettingsSectionCard
        id="about-product"
        icon={Package}
        tone="blue"
        title={t('settings.aboutProductTitle')}
        description={t('settings.aboutProductDesc')}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Agent Project Manager</p>
              <p className="text-xs text-content-text-muted">
                {appVersion
                  ? t('settings.aboutVersionLine', { version: appVersion })
                  : t('settings.aboutVersionFallback')}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {isDesktop ? t('settings.aboutModeDesktop') : t('settings.aboutModeWeb')}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* base-ui render 到 <a> 运行时会挂 role="button"（全仓既有行为，同 invite-page）；
                no-redundant-roles 禁显式 role="link"，测试按 href 断言 */}
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<a href={RELEASES_URL} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink className="mr-1 size-3.5" />
              {t('settings.aboutReleases')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<a href={REPO_URL} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink className="mr-1 size-3.5" />
              {t('settings.aboutRepository')}
            </Button>
          </div>
        </div>
      </SettingsSectionCard>

      {/* 桌面模式：自动更新（版本对照/进度/更新日志）+ 关窗行为 + 诊断导出（web 模式自渲染 null） */}
      <DesktopPreferencesCard />
    </PageShell>
  );
}
