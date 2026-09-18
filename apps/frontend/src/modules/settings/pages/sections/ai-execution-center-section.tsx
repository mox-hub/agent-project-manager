/**
 * AiExecutionCenterSection - 设置页「AI 执行中心」子页
 * @description 由 ai-hub 的 AIExecutionCenterPage 迁移而来（原路由 /app/ai/executions，2026-08-19 迁入设置页）
 * Execution Queue / Approval Center / Replay / Trust Management（保留 ?tab= 深链）
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageShell, PageBody } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { TrustLevelBadge } from '@/modules/team-member/components/trust-level-badge';
import {
  MEMBER_TRUST_TIERS,
  normalizeTrustLevel,
  trustLevelFromScore,
  type MemberTrustTierDef,
} from '@/shared/member/types';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle,
  CheckCircle2,
  Clock,
  Eye,
  Play,
  RefreshCw,
  Settings2,
  Shield,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  X,
  Cpu,
} from 'lucide-react';

// Types
interface ExecutionRun {
  id: string;
  issueId: string;
  taskTitle?: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  error?: string;
  steps?: ExecutionStep[];
}

interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  error?: string;
}

interface ApprovalRequest {
  id: string;
  issueId: string;
  taskTitle?: string;
  agentId: string;
  agentName: string;
  action: string;
  riskLevel: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  evaluatedAt?: string;
  evaluatorId?: string;
  evaluation?: string;
}

interface AgentTrustProfile {
  agentId: string;
  agentName: string;
  /** 三级口径：1=观察者 2=协助者 3=受托者（CAP-B-07） */
  trustLevel: number;
  recentEvaluations: EvaluationRecord[];
}

interface EvaluationRecord {
  id: string;
  taskTitle: string;
  score: number;
  timestamp: string;
}

// API Hooks
function useExecutionRuns(projectId?: string) {
  return useQuery({
    queryKey: ['executionRuns', projectId],
    queryFn: async (): Promise<ExecutionRun[]> => {
      // api.get 自动解后端信封；/execution/runs 的 data 形如 { runs, total }
      const data = await api.get<{ runs?: ExecutionRun[]; total?: number }>(
        '/execution/runs',
        projectId ? { projectId } : undefined,
      );
      return data?.runs ?? [];
    },
  });
}

function useApprovalRequests(projectId?: string) {
  return useQuery({
    queryKey: ['approvalRequests', projectId],
    queryFn: async (): Promise<ApprovalRequest[]> => {
      // api.get 自动解后端信封；getPendingApprovals 的 data 直接是数组
      const data = await api.get<ApprovalRequest[] | { approvals?: ApprovalRequest[] }>(
        '/execution/approvals/pending',
        projectId ? { projectId } : undefined,
      );
      if (Array.isArray(data)) return data;
      return data?.approvals ?? [];
    },
  });
}

function useAgentTrustProfiles() {
  // TODO: TrustService controller 尚未实现（后端缺契约，非 mock）——返回空数组
  return useQuery({
    queryKey: ['agentTrustProfiles'],
    queryFn: async (): Promise<AgentTrustProfile[]> => {
      // Return empty array until TrustService is implemented
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'settings.aiExecutionCenter.statusPending';
    case 'running':
      return 'settings.aiExecutionCenter.statusRunning';
    case 'completed':
      return 'settings.aiExecutionCenter.statusCompleted';
    case 'failed':
      return 'settings.aiExecutionCenter.statusFailed';
    case 'cancelled':
      return 'settings.aiExecutionCenter.statusCancelled';
    case 'skipped':
      return 'settings.aiExecutionCenter.statusSkipped';
    default:
      return 'settings.aiExecutionCenter.statusPending';
  }
}

// Status Badge Component
function StatusBadge({ status }: { status: ExecutionRun['status'] | ExecutionStep['status'] }) {
  const { t } = useTranslation();
  const toneClass: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    running: 'bg-accent-blue-light text-accent-blue',
    completed: 'bg-accent-green-light text-accent-green',
    failed: 'bg-accent-red-light text-accent-red',
    cancelled: 'bg-muted text-muted-foreground',
    skipped: 'bg-accent-yellow-light text-accent-yellow',
  };
  return (
    <Badge variant="outline" className={cn('text-xs', toneClass[status])}>
      {status === 'running' && <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {t(statusLabel(status))}
    </Badge>
  );
}

function RiskBadge({ level }: { level: ApprovalRequest['riskLevel'] }) {
  const { t } = useTranslation();
  const config = {
    high: { label: 'settings.aiExecutionCenter.riskHigh', className: 'bg-accent-red-light text-accent-red' },
    medium: { label: 'settings.aiExecutionCenter.riskMedium', className: 'bg-accent-yellow-light text-accent-yellow' },
    low: { label: 'settings.aiExecutionCenter.riskLow', className: 'bg-accent-green-light text-accent-green' },
  } as const;
  const conf = config[level] || config.low;
  return (
    <Badge variant="outline" className={cn('text-xs', conf.className)}>
      {t(conf.label)}
    </Badge>
  );
}

function runTitle(run: ExecutionRun, t: TFunction): string {
  return run.taskTitle || t('settings.aiExecutionCenter.taskFallback', { id: run.issueId });
}

// Execution Queue Tab
function ExecutionQueueTab() {
  const { t } = useTranslation();
  const { data: runs, isLoading } = useExecutionRuns();

  const running = runs?.filter((r) => r.status === 'running') || [];
  const pending = runs?.filter((r) => r.status === 'pending') || [];
  const recent = runs?.filter((r) => ['completed', 'failed', 'cancelled'].includes(r.status)).slice(0, 10) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {running.length > 0 && (
        <Card className="border-border shadow-none">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Play size={16} className="text-accent-blue" />
              {t('settings.aiExecutionCenter.groupRunning', { count: running.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {running.map((run) => (
              <ExecutionRunRow key={run.id} run={run} />
            ))}
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <Card className="border-border shadow-none">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock size={16} className="text-accent-yellow" />
              {t('settings.aiExecutionCenter.groupQueued', { count: pending.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {pending.map((run) => (
              <ExecutionRunRow key={run.id} run={run} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-none">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity size={16} className="text-muted-foreground" />
            {t('settings.aiExecutionCenter.groupRecent', { count: recent.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.aiExecutionCenter.emptyRecent')}</p>
          ) : (
            <div className="space-y-2">
              {recent.map((run) => (
                <ExecutionRunRow key={run.id} run={run} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExecutionRunRow({ run }: { run: ExecutionRun }) {
  const { t } = useTranslation();
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDetail(true)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
            <Bot className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {runTitle(run, t)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{run.agentName}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {run.progress !== undefined && (
            <span className="text-xs text-muted-foreground">{run.progress}%</span>
          )}
          <StatusBadge status={run.status} />
        </span>
      </button>

      <ExecutionDetailDialog
        run={run}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
}

function ExecutionDetailDialog({
  run,
  open,
  onOpenChange,
}: {
  run: ExecutionRun;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('settings.aiExecutionCenter.executionDetails')}</DialogTitle>
          <DialogDescription>{runTitle(run, t)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-muted-foreground" />
              <span className="text-sm">{run.agentName}</span>
            </div>
            <StatusBadge status={run.status} />
          </div>

          {run.startedAt && (
            <p className="text-xs text-muted-foreground">
              {t('settings.aiExecutionCenter.startedAt', { time: new Date(run.startedAt).toLocaleString() })}
            </p>
          )}

          {run.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {t('settings.aiExecutionCenter.errorLabel', { error: run.error })}
            </div>
          )}

          {run.status === 'failed' && <ExecutionRecoveryPanel run={run} />}

          {run.steps && run.steps.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">{t('settings.aiExecutionCenter.stepsTitle')}</h4>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {run.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span className="flex-1">{step.name}</span>
                      <StatusBadge status={step.status} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExecutionRecoveryPanel({ run }: { run: ExecutionRun }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <XCircle className="size-5 text-accent-yellow" />
        <span className="font-medium text-accent-yellow">{t('settings.aiExecutionCenter.executionFailed')}</span>
      </div>

      {run.error && (
        <p className="mb-4 text-sm text-accent-yellow">
          {t('settings.aiExecutionCenter.errorLabel', { error: run.error })}
        </p>
      )}

      <h4 className="mb-2 text-sm font-medium">{t('settings.aiExecutionCenter.recoveryOptions')}</h4>
      <div className="grid gap-2">
        <Button variant="outline" size="sm" className="justify-start">
          <RefreshCw className="mr-2 size-4" />
          {t('settings.aiExecutionCenter.retryEntire')}
        </Button>
        <Button variant="outline" size="sm" className="justify-start">
          <Settings2 className="mr-2 size-4" />
          {t('settings.aiExecutionCenter.retryFromStep')}
        </Button>
        <Button variant="outline" size="sm" className="justify-start">
          <Settings2 className="mr-2 size-4" />
          {t('settings.aiExecutionCenter.retryAdjust')}
        </Button>
        <Button variant="outline" size="sm" className="justify-start">
          <X className="mr-2 size-4" />
          {t('settings.aiExecutionCenter.assignHuman')}
        </Button>
      </div>
    </div>
  );
}

// Approval Center Tab
function ApprovalCenterTab() {
  const { t } = useTranslation();
  const { data: approvals, isLoading } = useApprovalRequests();
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  const pendingApprovals = approvals?.filter((a) => a.status === 'pending') || [];
  const sortedApprovals = [...pendingApprovals].sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });

  const toggleApproval = (id: string) => {
    const newSet = new Set(selectedApprovals);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedApprovals(newSet);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle size={16} className="text-accent-yellow" />
            {t('settings.aiExecutionCenter.approvalsPending', { count: pendingApprovals.length })}
          </CardTitle>
          <Button
            variant={batchMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBatchMode((v) => !v)}
          >
            {batchMode ? t('settings.aiExecutionCenter.exitBatchMode') : t('settings.aiExecutionCenter.batchMode')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {sortedApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.aiExecutionCenter.approvalsEmpty')}</p>
          ) : (
            sortedApprovals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                selected={selectedApprovals.has(approval.id)}
                onSelect={() => toggleApproval(approval.id)}
                batchMode={batchMode}
              />
            ))
          )}
        </CardContent>
      </Card>

      {batchMode && selectedApprovals.size > 0 && (
        <div className="sticky bottom-4 rounded-lg border bg-background p-3 shadow-lg">
          <p className="mb-2 text-sm">{t('settings.aiExecutionCenter.selectedCount', { count: selectedApprovals.size })}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="default">
              <ThumbsUp className="mr-1 size-4" />
              {t('settings.aiExecutionCenter.batchApprove')}
            </Button>
            <Button size="sm" variant="destructive">
              <ThumbsDown className="mr-1 size-4" />
              {t('settings.aiExecutionCenter.batchReject')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  approval,
  selected,
  onSelect,
  batchMode,
}: {
  approval: ApprovalRequest;
  selected: boolean;
  onSelect: () => void;
  batchMode: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40',
        selected && 'border-primary bg-primary/5',
      )}
    >
      {batchMode && <input type="checkbox" checked={selected} readOnly className="mt-1 size-4" />}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {approval.taskTitle || t('settings.aiExecutionCenter.taskFallback', { id: approval.issueId })}
          </span>
          <RiskBadge level={approval.riskLevel} />
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{approval.action}</span>
        <span className="mt-2 flex items-center gap-2">
          <Bot className="size-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{approval.agentName}</span>
        </span>
      </span>
      {!batchMode && (
        <span className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" type="button">
            <ThumbsUp className="mr-1 size-3" />
            {t('settings.aiExecutionCenter.approve')}
          </Button>
          <Button size="sm" variant="outline" type="button">
            <ThumbsDown className="mr-1 size-3" />
            {t('settings.aiExecutionCenter.reject')}
          </Button>
        </span>
      )}
    </button>
  );
}

// Execution Replay Tab
function ExecutionReplayTab() {
  const { t } = useTranslation();
  const { data: runs, isLoading } = useExecutionRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const completedRuns = runs?.filter((r) => ['completed', 'failed'].includes(r.status)) || [];
  const selectedRun = completedRuns.find((r) => r.id === selectedRunId);

  if (isLoading) {
    return (
      <div className="flex gap-4">
        <Skeleton className="h-64 w-48" />
        <Skeleton className="h-64 flex-1" />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <ScrollArea className="w-64 shrink-0">
        <div className="space-y-2">
          {completedRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.aiExecutionCenter.replayEmpty')}</p>
          ) : (
            completedRuns.map((run) => (
              <Card
                key={run.id}
                className={cn(
                  'cursor-pointer p-2 transition-colors hover:bg-muted/50',
                  selectedRunId === run.id && 'border-primary bg-primary/5',
                )}
                onClick={() => setSelectedRunId(run.id)}
              >
                <p className="text-xs font-medium text-foreground">{runTitle(run, t)}</p>
                <p className="text-xs text-muted-foreground">{run.agentName}</p>
                <div className="mt-1">
                  <StatusBadge status={run.status} />
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="min-w-0 flex-1">
        {selectedRun ? (
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{runTitle(selectedRun, t)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <StatusBadge status={selectedRun.status} />
                  <span className="text-sm text-muted-foreground">{selectedRun.agentName}</span>
                </div>

                {selectedRun.startedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t('settings.aiExecutionCenter.startedAt', { time: new Date(selectedRun.startedAt).toLocaleString() })}
                  </p>
                )}

                {selectedRun.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t('settings.aiExecutionCenter.completedAt', { time: new Date(selectedRun.completedAt).toLocaleString() })}
                  </p>
                )}

                {selectedRun.status === 'failed' && selectedRun.error && (
                  <ExecutionRecoveryPanel run={selectedRun} />
                )}

                {selectedRun.steps && selectedRun.steps.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">{t('settings.aiExecutionCenter.stepsTitle')}</h4>
                    <div className="space-y-2">
                      {selectedRun.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className={cn(
                            'rounded-md border p-2',
                            step.status === 'completed' && 'border-accent-green/30 bg-accent-green/10',
                            step.status === 'failed' && 'border-accent-red/30 bg-accent-red/10',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span className="text-sm">{step.name}</span>
                            {step.status === 'completed' && <CheckCircle className="size-4 text-accent-green" />}
                            {step.status === 'failed' && <XCircle className="size-4 text-destructive" />}
                          </div>
                          {step.error && (
                            <p className="mt-1 text-xs text-destructive">{step.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            {t('settings.aiExecutionCenter.replaySelectHint')}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Trust Management Tab（CAP-B-07 三级分级授权） ====================

/** 三级等级视觉：观察者=黄 / 协助者=蓝 / 受托者=绿（与 TrustLevelBadge 口径一致） */
const TIER_ICON: Record<number, typeof ShieldCheck> = { 1: Eye, 2: Shield, 3: ShieldCheck };
const TIER_ICON_COLOR: Record<number, string> = {
  1: 'text-accent-yellow',
  2: 'text-accent-blue',
  3: 'text-accent-green',
};

/** 等级定义卡：等级名 + 一句话定位 + 该级放权清单（静态展示，无门禁联动） */
function TrustTierCard({ tier }: { tier: MemberTrustTierDef }) {
  const { t } = useTranslation();
  const Icon = TIER_ICON[tier.level];
  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon size={16} className={TIER_ICON_COLOR[tier.level]} />
          {t(tier.labelKey)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{t(tier.descKey)}</p>
        <div className="mt-3 space-y-1.5">
          <h4 className="text-10 font-medium uppercase tracking-wider text-muted-foreground">
            {t('trust.delegationTitle')}
          </h4>
          {tier.allowKeys.map((key) => (
            <div key={key} className="flex items-start gap-1.5 text-xs">
              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-accent-green" />
              <span className="text-foreground">{t(key)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** 红线说明条：任何等级都永远须人确认（本期静态展示，不做门禁联动） */
function TrustRedlineNote() {
  const { t } = useTranslation();
  const redlines = [
    'trust.redlinePublish',
    'trust.redlineDelete',
    'trust.redlineSpending',
    'trust.redlineMembers',
  ];
  return (
    <div className="rounded-lg border border-accent-red/30 bg-accent-red/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-accent-red">
        <AlertTriangle className="size-4 shrink-0" />
        {t('trust.redlineTitle')}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {redlines.map((key) => (
          <span key={key}>· {t(key)}</span>
        ))}
      </div>
      <p className="mt-2 text-10 text-muted-foreground/80">{t('trust.redlineNote')}</p>
    </div>
  );
}

/** 调整信任：人工选三级等级（保存写 Member.trustLevel，零门禁联动） */
function AdjustTrustDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: AgentTrustProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number>(profile.trustLevel);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/members/${profile.agentId}`, { trustLevel: selected });
      toast.success(t('trust.adjustSaved'));
      queryClient.invalidateQueries({ queryKey: ['agentTrustProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onOpenChange(false);
    } catch {
      toast.error(t('trust.adjustFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('trust.adjustTitle', { name: profile.agentName })}</DialogTitle>
          <DialogDescription>{t('trust.adjustDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {MEMBER_TRUST_TIERS.map((tier) => {
            const Icon = TIER_ICON[tier.level];
            return (
              <button
                key={tier.level}
                type="button"
                onClick={() => setSelected(tier.level)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  selected === tier.level
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent/40',
                )}
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', TIER_ICON_COLOR[tier.level])} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {t(tier.labelKey)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(tier.descKey)}
                  </span>
                </span>
                <span
                  className={cn(
                    'mt-0.5 size-3.5 shrink-0 rounded-full border',
                    selected === tier.level
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40',
                  )}
                />
              </button>
            );
          })}
        </div>
        <p className="text-10 text-muted-foreground">{t('trust.redlineNote')}</p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** AI 成员档案卡：等级徽标 + 当前等级说明 + 最近评估 + 调整信任入口（不显分数） */
function AgentTrustCard({ profile }: { profile: AgentTrustProfile }) {
  const { t } = useTranslation();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const tier = normalizeTrustLevel(profile.trustLevel);
  const def = tier !== null ? MEMBER_TRUST_TIERS[tier - 1] : null;

  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot size={16} className="text-accent-purple" />
            {profile.agentName}
          </CardTitle>
          <TrustLevelBadge level={profile.trustLevel} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-10 font-medium uppercase tracking-wider text-muted-foreground">
            {t('trust.currentTier')}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {def ? t(def.labelKey) : t('trust.unrated')}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {def ? t(def.descKey) : t('trust.unratedDesc')}
          </p>
        </div>

        {profile.recentEvaluations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t('settings.aiExecutionCenter.recentEvaluations')}
            </h4>
            {profile.recentEvaluations.slice(0, 3).map((eval_) => {
              // 评估分数按三级口径折算为等级展示（不显原始分数）
              const evalTierKey =
                MEMBER_TRUST_TIERS[trustLevelFromScore(eval_.score) - 1].labelKey;
              return (
                <div key={eval_.id} className="flex items-center justify-between text-xs">
                  <span className="truncate text-foreground">{eval_.taskTitle}</span>
                  <span className="shrink-0 text-muted-foreground">{t(evalTierKey)}</span>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setAdjustOpen(true)}>
          <Settings2 className="mr-1 size-3" />
          {t('settings.aiExecutionCenter.adjustTrust')}
        </Button>

        <AdjustTrustDialog profile={profile} open={adjustOpen} onOpenChange={setAdjustOpen} />
      </CardContent>
    </Card>
  );
}

function TrustManagementTab() {
  const { t } = useTranslation();
  const { data: profiles, isLoading } = useAgentTrustProfiles();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 三级等级定义卡：该等级 AI 可自动做什么 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MEMBER_TRUST_TIERS.map((tier) => (
          <TrustTierCard key={tier.level} tier={tier} />
        ))}
      </div>

      {/* 红线：任何等级都永远须人确认 */}
      <TrustRedlineNote />

      {/* AI 成员信任档案 */}
      {!profiles || profiles.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {t('settings.aiExecutionCenter.trustEmpty')}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <AgentTrustCard key={profile.agentId} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}

type TabId = 'execution' | 'approvals' | 'replay' | 'trust';

const TAB_OPTIONS: { value: TabId; label: string; icon: typeof Activity }[] = [
  { value: 'execution', label: 'settings.aiExecutionCenter.tabQueue', icon: Play },
  { value: 'approvals', label: 'settings.aiExecutionCenter.tabApprovals', icon: CheckCircle },
  { value: 'replay', label: 'settings.aiExecutionCenter.tabReplay', icon: Clock },
  { value: 'trust', label: 'settings.aiExecutionCenter.tabTrust', icon: Bot },
];

// Main Page Component
export function AiExecutionCenterSection() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'execution';
  const activeTab: TabId = rawTab === 'approvals' || rawTab === 'replay' || rawTab === 'trust' ? rawTab : 'execution';

  const setTab = (tab: TabId) => {
    setSearchParams({ tab });
  };

  return (
    <PageShell aiPage="settings.ai-execution-center" className="overflow-hidden">
      <PageHeader
        aiId="settings.ai-execution-center"
        title={t('settings.aiExecutionCenter.pageTitle')}
        icon={Cpu}
        iconColor="text-accent-purple"
      />

      {/* 标准 toolbar 行：居中 rect 页签（保留 ?tab= 深链） */}
      <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-6 py-2 md:px-7">
        <div className="min-w-0" />
        <SegmentedControl
          variant="rect"
          value={activeTab}
          onChange={(value) => setTab(value as TabId)}
          options={TAB_OPTIONS.map((tab) => ({
            value: tab.value,
            label: t(tab.label),
            icon: <tab.icon className="size-3.5" strokeWidth={1.75} />,
          }))}
        />
        <div className="min-w-0" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <PageBody variant="standard" className="space-y-6">
          {activeTab === 'execution' && <ExecutionQueueTab />}
          {activeTab === 'approvals' && <ApprovalCenterTab />}
          {activeTab === 'replay' && <ExecutionReplayTab />}
          {activeTab === 'trust' && <TrustManagementTab />}
        </PageBody>
      </div>
    </PageShell>
  );
}
