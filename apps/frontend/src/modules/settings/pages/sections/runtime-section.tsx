/**
 * @file 设置页 · 运行时/守护进程管理区块
 * @description Runtime 注册卡片、runtime 侧审批（通过/驳回）、派发记录与 CLI 接入指引。
 *              执行历史复用「AI 执行中心」（/app/settings/ai/executions），此处不重复建设。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Server, Bot, GitBranch, CirclePlay, BookOpen } from 'lucide-react';
import { api } from '@/infrastructure/api-client';
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
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/toast';

interface RuntimeRegistration {
  runtimeId: string;
  deviceId: string;
  hostPlatform: string;
  runtimeVersion: string;
  protocolVersion: string;
  workspaceRoots: string[];
  cliProviders: string[];
  status: 'online' | 'offline';
  lastHeartbeatAt: string;
  lastSeenAt: string;
}

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

function useRuntimeRegistrations() {
  return useQuery({
    queryKey: ['runtime-admin', 'registrations'],
    queryFn: async (): Promise<RuntimeRegistration[]> =>
      api.get('/runtime/registrations'),
  });
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

function formatTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export function RuntimeSettingsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const registrations = useRuntimeRegistrations();
  const approvals = useRuntimeApprovals();
  const dispatches = useRuntimeDispatches();

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
      aiPage="settings.runtime"
      title={t('settings.runtimeTitle')}
      icon={Server}
    >
      <div className="space-y-6 px-6 pb-6">
        <SectionCard
          title={t('settings.runtimeRegTitle')}
          description={t('settings.runtimeRegDesc')}
        >
          <AsyncState
            isLoading={registrations.isLoading}
            loadingFallback={<SkeletonTable rows={3} columns={2} />}
            isEmpty={!registrations.isLoading && (registrations.data?.length ?? 0) === 0}
            emptyTitle={t('settings.runtimeEmptyTitle')}
            emptyDescription={t('settings.runtimeEmptyDesc')}
          >
            <div className="divide-y">
              {(registrations.data ?? []).map((reg) => (
                <Item key={reg.runtimeId} size="sm">
                  <ItemContent>
                    <div className="flex items-center gap-2">
                      <ItemTitle className="font-mono">{reg.runtimeId}</ItemTitle>
                      <StatusPill
                        tone={reg.status === 'online' ? 'success' : 'default'}
                      >
                        {reg.status === 'online'
                          ? t('settings.runtimeOnline')
                          : t('settings.runtimeOffline')}
                      </StatusPill>
                    </div>
                    <ItemDescription>
                      {reg.hostPlatform} · v{reg.runtimeVersion} ·{' '}
                      {t('settings.runtimeHeartbeat')}: {formatTime(reg.lastHeartbeatAt)}
                    </ItemDescription>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {(reg.cliProviders ?? []).map((provider) => (
                        <Badge key={provider} variant="outline">
                          {provider}
                        </Badge>
                      ))}
                    </div>
                  </ItemContent>
                </Item>
              ))}
            </div>
          </AsyncState>
        </SectionCard>

        <SectionCard
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
                      <TableCell>{formatTime(dispatch.updatedAt ?? dispatch.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          </AsyncState>
        </SectionCard>

        <SectionCard
          title={t('settings.runtimeGuideTitle')}
          description={t('settings.runtimeGuideDesc')}
        >
          <Alert>{t('settings.runtimeGuideTip')}</Alert>
          <div className="space-y-1.5 pt-2 font-mono text-xs">
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
      </div>
    </PageShell>
  );
}
