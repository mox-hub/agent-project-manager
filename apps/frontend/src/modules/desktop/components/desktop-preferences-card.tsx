/**
 * 桌面偏好卡（ADR-015，桌面模式专属）：关窗行为（最小化到托盘保活）、自动更新状态
 * （版本对照/进度条/更新日志，ADR-015 补记 4）、一键导出诊断包。数据经 desktop-state.json
 * 与壳 IPC 命令面，更新状态经壳推送实时刷新；web 模式渲染 null。
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, Settings2 } from 'lucide-react';
import {
  invoke,
  isDesktopShellAvailable,
  subscribeUpdateStatus,
  type DesktopAppInfo,
  type DesktopPersistentState,
  type DesktopUpdateStatus,
} from '@/shared/types/electron-api';
import { SectionCard } from '@/components/semantic/section-card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';

const UPDATE_STATE_KEY: Record<DesktopUpdateStatus['state'], string> = {
  idle: 'settings.desktopPrefsUpdateIdle',
  checking: 'settings.desktopPrefsUpdateChecking',
  available: 'settings.desktopPrefsUpdateAvailable',
  'not-available': 'settings.desktopPrefsUpdateNotAvailable',
  downloading: 'settings.desktopPrefsUpdateDownloading',
  downloaded: 'settings.desktopPrefsUpdateDownloaded',
  error: 'settings.desktopPrefsUpdateError',
};

export function DesktopPreferencesCard() {
  const { t } = useTranslation();
  const [closeToTray, setCloseToTray] = useState(true);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<DesktopUpdateStatus | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isDesktopShellAvailable()) {
      return;
    }
    void invoke<DesktopPersistentState>('get_desktop_state')
      .then((state) => setCloseToTray(state.close_to_tray !== false))
      .catch(() => undefined);
    void invoke<DesktopAppInfo>('get_app_info')
      .then((info) => setAppVersion(info.version))
      .catch(() => undefined);
    // 恢复壳侧进行中的更新状态（静默检查/后台下载可能早已启动）；idle 无信息量不落
    void invoke<DesktopUpdateStatus>('get_update_status')
      .then((status) => setUpdateStatus(status.state && status.state !== 'idle' ? status : null))
      .catch(() => undefined);
    // 壳侧状态实时推送（下载进度/完成弹窗前置）；旧壳无通道时空订阅
    return subscribeUpdateStatus(setUpdateStatus);
  }, []);

  const handleCloseToTrayChange = useCallback(
    async (next: boolean) => {
      setCloseToTray(next);
      try {
        await invoke<DesktopPersistentState>('set_desktop_state', { close_to_tray: next });
      } catch (err) {
        setCloseToTray(!next);
        toast.error(err instanceof Error ? err.message : String(err));
      }
    },
    [],
  );

  const handleCheckUpdate = useCallback(async () => {
    try {
      setUpdateStatus(await invoke<DesktopUpdateStatus>('check_updates'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleExportDiagnostics = useCallback(async () => {
    setExporting(true);
    try {
      const { path } = await invoke<{ path: string | null }>('export_diagnostics');
      if (path) {
        toast(t('settings.desktopPrefsExported', { path }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }, [t]);

  if (!isDesktopShellAvailable()) {
    return null;
  }

  const state = updateStatus?.state;
  const checking = state === 'checking';
  const downloading = state === 'downloading';
  const releaseNotes =
    state === 'available' || state === 'downloaded' ? updateStatus?.releaseNotes : undefined;
  const updateDetail =
    state && state !== 'idle'
      ? t(UPDATE_STATE_KEY[state], {
          version: updateStatus?.version ?? '',
          progress: updateStatus?.progress ?? 0,
          error: updateStatus?.error ?? '',
        })
      : null;

  return (
    <SectionCard
      icon={Settings2}
      iconColor="text-accent-blue"
      title={t('settings.desktopPrefsTitle')}
      description={t('settings.desktopPrefsDesc')}
      actions={
        <Button size="sm" variant="outline" onClick={() => void handleExportDiagnostics()} disabled={exporting}>
          <Download className="mr-1 size-3.5" />
          {t('settings.desktopPrefsExportDiagnostics')}
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="desktop-close-to-tray" className="text-sm">
            {t('settings.desktopPrefsCloseToTray')}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t('settings.desktopPrefsCloseToTrayDesc')}
          </p>
        </div>
        <Switch
          id="desktop-close-to-tray"
          checked={closeToTray}
          onCheckedChange={(next) => void handleCloseToTrayChange(next)}
        />
      </div>

      <div className="mt-4 space-y-2 border-t pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label className="text-sm">{t('settings.desktopPrefsUpdateTitle')}</Label>
            <p className="text-xs text-muted-foreground">
              {appVersion
                ? t('settings.desktopPrefsCurrentVersion', { version: appVersion })
                : t('settings.desktopPrefsUpdateAutoDesc')}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleCheckUpdate()}
            disabled={checking || downloading || state === 'downloaded'}
          >
            <RefreshCw className={`mr-1 size-3.5 ${checking ? 'animate-spin' : ''}`} />
            {t('settings.desktopPrefsCheckUpdate')}
          </Button>
        </div>
        {downloading ? (
          <Progress
            value={updateStatus?.progress ?? 0}
            aria-label={t('settings.desktopPrefsUpdateDownloading', {
              version: updateStatus?.version ?? '',
              progress: updateStatus?.progress ?? 0,
            })}
          />
        ) : null}
        {updateDetail ? <p className="text-xs text-muted-foreground">{updateDetail}</p> : null}
        {releaseNotes ? (
          <details className="group">
            <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t('settings.desktopPrefsUpdateReleaseNotes')}
            </summary>
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-md bg-muted/40 p-2.5 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {releaseNotes}
            </div>
          </details>
        ) : null}
      </div>
    </SectionCard>
  );
}
