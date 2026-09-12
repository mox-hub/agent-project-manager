/**
 * @file 设置页 · 运行时/守护进程管理区块
 * @description 机器列表（守护进程注册，点击进详情）、runtime 侧审批（通过/驳回）、
 *              派发记录与 CLI 接入指引。机器详情见 runtime-machine-detail-section；
 *              执行历史复用「AI 执行中心」（/app/settings/ai/executions），此处不重复建设。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Cpu,
  FolderOpen,
  ListChecks,
  Monitor,
  Play,
  Plus,
  ShieldCheck,
  Square,
  Terminal,
  TerminalSquare,
  Trash2,
  Wifi,
} from 'lucide-react';
import { api } from '@/infrastructure/api-client';
import { useEventSubscription } from '@/infrastructure/hooks/use-event-subscription';
import { useDesktop } from '@/modules/desktop';
import { PageShell } from '@/components/ui/page-shell';
import { SectionCard } from '@/components/ui/section-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Item, ItemContent, ItemTitle, ItemDescription } from '@/components/ui/item';
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
import { toast } from '@/components/ui/toast';
import { getProviderMeta } from '@/shared/ai-providers/provider-meta';
import { formatDateTime } from '@/shared/lib/date-format';
import {
  formatRelativeTime,
  machineDisplayName,
  pickRepresentativeRegistrations,
  useRuntimeRegistrations,
} from '@/shared/runtime/runtime-api';

interface RuntimeApproval {
  approvalRequestId: string;
  executionRunId: string;
  requestedAction: string;
  riskLevel: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  updatedAt: string;
}

interface RuntimeDispatch {
  executionRunId: string;
  providerId?: string;
  status?: string;
  subjectType?: string;
  updatedAt?: string;
  createdAt?: string;
  prompt?: string;
}

function useRuntimeApprovals() {
  return useQuery({
    queryKey: ['runtime-admin', 'approvals', 'pending'],
    queryFn: async (): Promise<RuntimeApproval[]> =>
      api.get('/runtime/approvals', { status: 'pending', limit: 20 }),
  });
}

function useRuntimeDispatches() {
  return useQuery({
    queryKey: ['runtime-admin', 'dispatches'],
    queryFn: async (): Promise<RuntimeDispatch[]> =>
      api.get('/runtime/dispatches', { limit: 20 }),
  });
}

/**
 * 桌面模式专属：本机 apm-runtime 守护进程控制卡片。
 * 守护进程由壳随应用启动自动拉起（AI 执行面），此处提供状态可视、手动启停、
 * 工作目录维护与开发者工具入口。
 */
function LocalDaemonCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    daemonStatus,
    isDesktop,
    isLoading,
    startDaemon,
    stopDaemon,
    chooseWorkspaceRoot,
    addWorkspaceRoot,
    removeWorkspaceRoot,
    toggleDevtools,
  } = useDesktop();

  if (!isDesktop) {
    return null;
  }

  const refreshMachines = () => {
    // 守护进程注册/下线有几秒延迟，先立即刷再延迟补刷一次
    queryClient.invalidateQueries({ queryKey: ['runtime-admin', 'registrations'] });
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['runtime-admin', 'registrations'] });
    }, 3000);
  };

  const handleChooseRoot = async () => {
    const path = await chooseWorkspaceRoot();
    if (path) {
      await addWorkspaceRoot(path);
    }
  };

  const running = !!daemonStatus?.running;

  return (
    <SectionCard
      icon={Cpu}
      iconColor="text-accent-purple"
      title={t('settings.desktopDaemonTitle')}
      description={t('settings.desktopDaemonDesc')}
      actions={
        <div className="flex items-center gap-1.5">
          {running ? (
            <Button size="sm" variant="outline" disabled={isLoading} onClick={() => void stopDaemon().then(refreshMachines)}>
              <Square className="mr-1 size-3.5" />
              {t('settings.desktopDaemonStop')}
            </Button>
          ) : (
            <Button size="sm" disabled={isLoading} onClick={() => void startDaemon().then(refreshMachines)}>
              <Play className="mr-1 size-3.5" />
              {t('settings.desktopDaemonStart')}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => void toggleDevtools()}>
            <TerminalSquare className="mr-1 size-3.5" />
            {t('settings.desktopDevtools')}
          </Button>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <StatusPill tone={running ? 'success' : 'default'} className="gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-accent-green' : 'bg-muted-foreground/40'}`} />
          {running ? t('settings.runtimeOnline') : t('settings.runtimeOffline')}
        </StatusPill>
        {running && daemonStatus?.pid ? (
          <span className="font-mono text-xs text-muted-foreground">PID {daemonStatus.pid}</span>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <FolderOpen className="size-4 text-accent-blue" />
            {t('settings.desktopDaemonRoots')}
          </span>
          <Button size="sm" variant="outline" disabled={isLoading} onClick={() => void handleChooseRoot()}>
            <Plus className="mr-1 size-3.5" />
            {t('settings.desktopDaemonAddRoot')}
          </Button>
        </div>
        {(daemonStatus?.workspaceRoots?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">{t('settings.desktopDaemonRootsEmpty')}</p>
        ) : (
          <div className="space-y-1">
            {(daemonStatus?.workspaceRoots ?? []).map((root) => (
              <div key={root} className="group flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-accent">
                <span className="truncate font-mono text-xs">{root}</span>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void removeWorkspaceRoot(root)}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label={t('settings.desktopDaemonRemoveRoot')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t('settings.desktopDaemonRootsTip')}</p>
      </div>

      <Alert>
        <Monitor className="size-4" />
        {t('settings.desktopDaemonTip')}
      </Alert>
    </SectionCard>
  );
}

export function RuntimeSettingsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const registrations = useRuntimeRegistrations();
  const approvals = useRuntimeApprovals();
  const dispatches = useRuntimeDispatches();

  // 派发/审批表由 socket 推送驱动失效（runtime.dispatch.changed 聚合了
  // dispatch 生命周期与审批事件），不再依赖高频轮询
  useEventSubscription('runtime.dispatch.changed', () => {
    queryClient.invalidateQueries({ queryKey: ['runtime-admin'] });
  });

  const machines = pickRepresentativeRegistrations(registrations.data ?? []);

  const resolveApproval = useMutation({
    mutationFn: async (vars: {
      approvalRequestId: string;
      resolution: 'approved' | 'rejected';
    }) =>
      api.post(
        `/runtime/control/approvals/${vars.approvalRequestId}/resolve`,
        { resolution: vars.resolution },
      ),
    onSuccess: (_data, vars) => {
      toast(
        vars.resolution === 'approved'
          ? t('settings.runtimeApproved')
          : t('settings.runtimeRejected'),
      );
      queryClient.invalidateQueries({
        queryKey: ['runtime-admin', 'approvals'],
      });
    },
    onError: () => toast.error(t('settings.runtimeResolveFailed')),
  });

  return (
    <PageShell
      variant="standard"
      contentClassName="space-y-6"
      aiPage="settings.runtime"
      title={t('settings.runtimeTitle')}
      icon={Cpu}
      iconColor="text-accent-blue"
      metrics={[
        {
          id: 'machines',
          label: t('settings.runtimeMachineCountLabel'),
          value: machines.length,
        },
      ]}
    >
      {/* 桌面模式：本机守护进程控制（web 模式内部自渲染 null） */}
      <LocalDaemonCard />

      <SectionCard
          icon={Monitor}
          iconColor="text-accent-blue"
          title={t('settings.runtimeMachinesTitle')}
          description={t('settings.runtimeMachinesDesc')}
        >
          <AsyncState
            isLoading={registrations.isLoading}
            loadingFallback={<SkeletonTable rows={2} columns={3} />}
            isEmpty={!registrations.isLoading && machines.length === 0}
            emptyTitle={t('settings.runtimeEmptyTitle')}
            emptyDescription={t('settings.runtimeEmptyDesc')}
          >
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {machines.map((machine) => {
                const online = machine.status === 'online';
                const providers = [...new Set(machine.cliProviders ?? [])];
                return (
                  <button
                    key={machine.runtimeId}
                    type="button"
                    onClick={() => navigate(`/app/settings/runtime/${machine.runtimeId}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left motion-shift hover:bg-accent"
                  >
                    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                      <Monitor className="size-4" />
                      <span
                        className={`absolute -bottom-0.5 -left-0.5 size-2 rounded-full border border-card ${
                          online ? 'bg-accent-green' : 'bg-muted-foreground/40'
                        }`}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {machineDisplayName(machine)}
                        </span>
                        <Badge variant="outline" className="text-xs uppercase">
                          {machine.hostPlatform}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                        {t('settings.runtimeDaemon')} {machine.runtimeId}
                      </span>
                    </span>
                    <StatusPill tone={online ? 'success' : 'default'}>
                      <Wifi className="size-3" />
                      {online ? t('settings.runtimeOnline') : t('settings.runtimeOffline')}
                    </StatusPill>
                    <span className="hidden items-center gap-2 lg:flex">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {t('settings.runtimeMachineRuntimes', { n: providers.length })}
                      </span>
                      <span className="flex -space-x-1">
                        {providers.slice(0, 4).map((pid) => {
                          const meta = getProviderMeta(pid);
                          const PIcon = meta.Color ?? meta.Icon;
                          return (
                            <span
                              key={pid}
                              className="flex size-5 items-center justify-center rounded-full border border-border bg-card"
                            >
                              <PIcon size={11} />
                            </span>
                          );
                        })}
                        {providers.length > 4 && (
                          <span className="flex size-5 items-center justify-center rounded-full border border-border bg-card text-xs text-muted-foreground">
                            +{providers.length - 4}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                      {formatRelativeTime(machine.lastHeartbeatAt, t)}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </AsyncState>
        </SectionCard>

        <SectionCard
          icon={ShieldCheck}
          iconColor="text-accent-green"
          title={t('settings.runtimeApprovalTitle')}
          description={t('settings.runtimeApprovalDesc')}
        >
          <AsyncState
            isLoading={approvals.isLoading}
            loadingFallback={<SkeletonTable rows={3} columns={2} />}
            isEmpty={!approvals.isLoading && (approvals.data?.length ?? 0) === 0}
            emptyTitle={t('settings.runtimeApprovalEmpty')}
          >
            <div className="divide-y">
              {(approvals.data ?? []).map((approval) => (
                <Item key={approval.approvalRequestId} size="sm">
                  <ItemContent>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <ItemTitle>{approval.requestedAction}</ItemTitle>
                        <ItemDescription className="font-mono">
                          {approval.executionRunId}
                          {approval.reason ? ` · ${approval.reason}` : ''}
                        </ItemDescription>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resolveApproval.isPending}
                          onClick={() =>
                            resolveApproval.mutate({
                              approvalRequestId: approval.approvalRequestId,
                              resolution: 'rejected',
                            })
                          }
                        >
                          {t('settings.runtimeReject')}
                        </Button>
                        <Button
                          size="sm"
                          disabled={resolveApproval.isPending}
                          onClick={() =>
                            resolveApproval.mutate({
                              approvalRequestId: approval.approvalRequestId,
                              resolution: 'approved',
                            })
                          }
                        >
                          {t('settings.runtimeApprove')}
                        </Button>
                      </div>
                    </div>
                  </ItemContent>
                </Item>
              ))}
            </div>
          </AsyncState>
        </SectionCard>

        <SectionCard
          icon={ListChecks}
          iconColor="text-accent-blue"
          title={t('settings.runtimeDispatchTitle')}
          description={t('settings.runtimeDispatchDesc')}
        >
          <AsyncState
            isLoading={dispatches.isLoading}
            loadingFallback={<SkeletonTable rows={4} columns={4} />}
            isEmpty={!dispatches.isLoading && (dispatches.data?.length ?? 0) === 0}
            emptyTitle={t('settings.runtimeDispatchEmpty')}
          >
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings.runtimeColRun')}</TableHead>
                    <TableHead>{t('settings.runtimeColProvider')}</TableHead>
                    <TableHead>{t('settings.runtimeColStatus')}</TableHead>
                    <TableHead>{t('settings.runtimeColTime')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dispatches.data ?? []).map((dispatch) => (
                    <TableRow key={dispatch.executionRunId}>
                      <TableCell className="max-w-60 truncate font-mono">
                        {dispatch.executionRunId}
                      </TableCell>
                      <TableCell>
                        {dispatch.providerId ? (
                          <Badge variant="outline">{dispatch.providerId}</Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill
                          tone={
                            dispatch.status === 'completed'
                              ? 'success'
                              : dispatch.status === 'failed'
                                ? 'danger'
                                : 'default'
                          }
                        >
                          {dispatch.status ?? 'pending'}
                        </StatusPill>
                      </TableCell>
                      <TableCell>{formatDateTime(dispatch.updatedAt ?? dispatch.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          </AsyncState>
        </SectionCard>

        <SectionCard
          icon={Terminal}
          iconColor="text-accent-purple"
          title={t('settings.runtimeGuideTitle')}
          description={t('settings.runtimeGuideDesc')}
        >
          <Alert>{t('settings.runtimeGuideTip')}</Alert>
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
            <div>apm login --token &lt;{t('settings.runtimeGuideToken')}&gt;</div>
            <div>apm daemon start</div>
            <div>apm daemon status</div>
            <div>apm runtime providers:detect</div>
          </div>
          <Alert variant="default">
            {t('settings.runtimeGuideExecutions')}{' '}
            {t('settings.runtimeGuideExecutionsPath')}
          </Alert>
        </SectionCard>
    </PageShell>
  );
}
