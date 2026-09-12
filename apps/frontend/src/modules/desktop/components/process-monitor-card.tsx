/**
 * 本机进程监控卡片（CAP-A-14 可观测性切片，桌面模式专属）。
 * 壳托管进程的角色化清单：监听端口 + 内存占用，5s 自动轮询 + 手动刷新。
 * web 模式渲染 null（与 LocalDaemonCard 同门槛）。
 */
import { useTranslation } from 'react-i18next';
import { AppWindow, Bot, Cpu, Monitor, RefreshCw, Server } from 'lucide-react';
import { isTauriAvailable, type DesktopProcessStat } from '@/shared/types/electron-api';
import { useProcessStats } from '../hooks/use-process-stats';
import { SectionCard } from '@/components/ui/section-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SkeletonTable } from '@/components/ui/skeleton';

const ROLE_ICONS: Record<DesktopProcessStat['role'], typeof Cpu> = {
  shell: AppWindow,
  backend: Server,
  daemon: Bot,
  'frontend-dev': Monitor,
};

const ROLE_LABEL_KEYS: Record<DesktopProcessStat['role'], string> = {
  shell: 'settings.desktopProcessRoleShell',
  backend: 'settings.desktopProcessRoleBackend',
  daemon: 'settings.desktopProcessRoleDaemon',
  'frontend-dev': 'settings.desktopProcessRoleFrontend',
};

export function ProcessMonitorCard() {
  const { t } = useTranslation();
  const { processes, isLoading, error, refresh } = useProcessStats();

  if (!isTauriAvailable()) {
    return null;
  }

  return (
    <SectionCard
      icon={Cpu}
      iconColor="text-accent-blue"
      title={t('settings.desktopProcessTitle')}
      description={t('settings.desktopProcessDesc')}
      actions={
        <Button size="sm" variant="outline" onClick={() => void refresh()}>
          <RefreshCw className="mr-1 size-3.5" />
          {t('settings.desktopProcessRefresh')}
        </Button>
      }
    >
      {error ? (
        <p className="mb-2 text-xs text-destructive">{error}</p>
      ) : null}
      {isLoading && processes.length === 0 ? (
        <SkeletonTable rows={3} columns={4} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.desktopProcessColProcess')}</TableHead>
                <TableHead>{t('settings.desktopProcessColPid')}</TableHead>
                <TableHead>{t('settings.desktopProcessColPort')}</TableHead>
                <TableHead>{t('settings.desktopProcessColMemory')}</TableHead>
                <TableHead>{t('settings.desktopProcessColStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes.map((proc) => {
                const Icon = ROLE_ICONS[proc.role];
                return (
                  <TableRow key={proc.role} className={proc.running ? undefined : 'opacity-55'}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                          <Icon className="size-3.5" />
                        </span>
                        {t(ROLE_LABEL_KEYS[proc.role])}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {proc.pid > 0 ? proc.pid : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{proc.port ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {proc.memoryMB != null ? `${proc.memoryMB} MB` : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={proc.running ? 'success' : 'default'}>
                        {proc.running ? t('settings.runtimeOnline') : t('settings.runtimeOffline')}
                      </StatusPill>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Alert>
        <Monitor className="size-4" />
        {t('settings.desktopProcessTip')}
      </Alert>
    </SectionCard>
  );
}
