/**
 * @file 设置页 · 运行时机器详情
 * @description 单台守护进程机器的头部信息与 CLI 运行时清单。
 *              智能体 / 费用 / 各运行时 CLI 版本暂无上报数据，先以 — 占位，
 *              待守护进程按 provider 上报后回填。
 */
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Monitor, Server } from 'lucide-react';
import { PageShell, PageBody } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { SectionCard } from '@/components/ui/section-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { AsyncState } from '@/components/ui/async-state';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { getProviderMeta } from '@/shared/ai-providers/provider-meta';
import {
  formatRelativeTime,
  getRuntimeRegistrations,
  machineDisplayName,
  useRuntimeRegistrations,
} from '@/shared/runtime/runtime-api';
import {
  HeartbeatMonitor,
  type MonitorProbeResult,
} from '@/shared/runtime/heartbeat-monitor';

export function RuntimeMachineDetailSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { runtimeId } = useParams<{ runtimeId: string }>();
  const { data, isLoading } = useRuntimeRegistrations();
  const machine = (data ?? []).find((reg) => reg.runtimeId === runtimeId);

  // 监控条探测：fetchQuery 与页面注册列表共用缓存去重；机器离线/未找到即故障
  const probe = useCallback(async (): Promise<MonitorProbeResult> => {
    const regs = await queryClient.fetchQuery({
      queryKey: ['runtime-admin', 'registrations'],
      queryFn: getRuntimeRegistrations,
    });
    const reg = regs.find((item) => item.runtimeId === runtimeId);
    if (!reg) {
      return { up: false, detail: t('settings.runtimeMachineNotFound') };
    }
    if (reg.status !== 'online') {
      return { up: false, detail: t('settings.runtimeOffline') };
    }
    return { up: true };
  }, [queryClient, runtimeId, t]);

  const breadcrumbs = [
    {
      label: t('settings.runtimeTitle'),
      to: '/app/settings/runtime',
    },
    { label: machine ? machineDisplayName(machine) : (runtimeId ?? '') },
  ];

  if (isLoading) {
    return (
      <PageShell padded={false}>
        <SubPageToolbar
          aiId="settings.runtimeMachine"
          onBack={() => navigate('/app/settings/runtime')}
          breadcrumbs={breadcrumbs}
        />
        <PageBody variant="standard">
          <SkeletonTable rows={4} columns={5} />
        </PageBody>
      </PageShell>
    );
  }

  if (!machine) {
    return (
      <PageShell padded={false}>
        <SubPageToolbar
          aiId="settings.runtimeMachine"
          onBack={() => navigate('/app/settings/runtime')}
          breadcrumbs={breadcrumbs}
        />
        <PageBody variant="standard">
          <EmptyState
            title={t('settings.runtimeMachineNotFound')}
            description={t('settings.runtimeMachineNotFoundDesc')}
            action={
              <Button variant="outline" size="sm" onClick={() => navigate('/app/settings/runtime')}>
                {t('settings.runtimeBackToOverview')}
              </Button>
            }
          />
        </PageBody>
      </PageShell>
    );
  }

  const online = machine.status === 'online';
  const providers = [...new Set(machine.cliProviders ?? [])];

  return (
    <PageShell padded={false}>
      <SubPageToolbar
        aiId="settings.runtimeMachine"
        onBack={() => navigate('/app/settings/runtime')}
        breadcrumbs={breadcrumbs}
      />
      <PageBody variant="standard" className="space-y-6">
        {/* 机器头部：图标框 + 名称 + 状态 + 元信息行 + 心跳监控条（右上） */}
        <div className="flex flex-wrap items-start gap-4">
          <span className="relative flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent-blue/10 text-accent-blue">
            <Monitor className="size-6" />
            <span
              className={`absolute -bottom-0.5 -left-0.5 size-2.5 rounded-full border border-card ${
                online ? 'bg-accent-green' : 'bg-muted-foreground/40'
              }`}
            />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{machineDisplayName(machine)}</h1>
              <StatusPill tone={online ? 'success' : 'default'}>
                {online ? t('settings.runtimeOnline') : t('settings.runtimeOffline')}
              </StatusPill>
              <Badge variant="outline" className="text-xs uppercase">
                {machine.hostPlatform}
              </Badge>
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {t('settings.runtimeDaemon')} {machine.runtimeId}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
              <span>{t('settings.runtimeMachineRuntimes', { n: providers.length })}</span>
              <span className="opacity-50">·</span>
              <span>
                {t('settings.runtimeCliVersion')}: v{machine.runtimeVersion}
              </span>
              <span className="opacity-50">·</span>
              <span>
                {t('settings.runtimeMachineWorkspaces', {
                  n: machine.workspaceRoots?.length ?? 0,
                })}
              </span>
              <span className="opacity-50">·</span>
              <span>
                {t('settings.runtimeHeartbeat')}: {formatRelativeTime(machine.lastHeartbeatAt, t)}
              </span>
            </div>
          </div>
          <div className="ml-auto shrink-0 pt-1">
            <HeartbeatMonitor probe={probe} />
          </div>
        </div>

        {/* 运行时清单 */}
        <SectionCard
          icon={Server}
          iconColor="text-accent-blue"
          title={t('settings.runtimeMachineRuntimesTitle')}
          description={t('settings.runtimeMachineRuntimesDesc')}
        >
          <AsyncState
            isEmpty={providers.length === 0}
            emptyTitle={t('settings.runtimeMachineEmptyRuntimes')}
            emptyDescription={t('settings.runtimeMachineRuntimesDesc')}
          >
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings.runtimeMachineColRuntime')}</TableHead>
                    <TableHead>{t('settings.runtimeMachineColHealth')}</TableHead>
                    <TableHead>{t('settings.runtimeMachineColAgents')}</TableHead>
                    <TableHead>{t('settings.runtimeMachineColCost')}</TableHead>
                    <TableHead>{t('settings.runtimeMachineColCli')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((pid) => {
                    const meta = getProviderMeta(pid);
                    const PIcon = meta.Color ?? meta.Icon;
                    return (
                      <TableRow key={pid}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                              <PIcon size={13} />
                            </span>
                            <span className="text-sm">{meta.label}</span>
                            <Badge variant="outline">
                              {t('settings.runtimeBadgeBuiltin')}
                            </Badge>
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span
                              className={`size-1.5 rounded-full ${
                                online ? 'bg-accent-green' : 'bg-muted-foreground/30'
                              }`}
                            />
                            {online
                              ? t('settings.runtimeOnline')
                              : t('settings.runtimeOffline')}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          </AsyncState>
        </SectionCard>
      </PageBody>
    </PageShell>
  );
}
