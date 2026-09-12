/**
 * 桌面偏好卡（ADR-015，桌面模式专属）：关窗行为（最小化到托盘保活）、检查更新、
 * 一键导出诊断包。数据经 desktop-state.json 与壳 IPC 命令面；web 模式渲染 null。
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, PackageOpen, Settings2 } from 'lucide-react';
import {
  invoke,
  isTauriAvailable,
  type DesktopPersistentState,
  type DesktopUpdateStatus,
} from '@/shared/types/electron-api';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
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
  const [updateStatus, setUpdateStatus] = useState<DesktopUpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isTauriAvailable()) {
      return;
    }
    void invoke<DesktopPersistentState>('get_desktop_state')
      .then((state) => setCloseToTray(state.close_to_tray !== false))
      .catch(() => undefined);
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
    setChecking(true);
    try {
      setUpdateStatus(await invoke<DesktopUpdateStatus>('check_updates'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
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

  if (!isTauriAvailable()) {
    return null;
  }

  const updateDetail = updateStatus
    ? t(UPDATE_STATE_KEY[updateStatus.state], {
        version: updateStatus.version ?? '',
        progress: updateStatus.progress ?? 0,
        error: updateStatus.error ?? '',
      })
    : null;

  return (
    <SectionCard
      icon={Settings2}
      iconColor="text-accent-blue"
      title={t('settings.desktopPrefsTitle')}
      description={t('settings.desktopPrefsDesc')}
      actions={
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => void handleCheckUpdate()} disabled={checking}>
            <PackageOpen className="mr-1 size-3.5" />
            {t('settings.desktopPrefsCheckUpdate')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleExportDiagnostics()} disabled={exporting}>
            <Download className="mr-1 size-3.5" />
            {t('settings.desktopPrefsExportDiagnostics')}
          </Button>
        </div>
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
      {updateDetail ? (
        <p className="mt-2 text-xs text-muted-foreground">{updateDetail}</p>
      ) : null}
    </SectionCard>
  );
}
