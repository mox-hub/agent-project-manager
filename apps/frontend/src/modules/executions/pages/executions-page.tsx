/**
 * 执行中心页面 - AI Agent 执行运行管理
 *
 * 数据源：GET /execution/runs（{runs,total}，projectId 缺省 = 用户为成员的全部项目）。
 * KPI 统计卡片、多维筛选（状态/Agent/项目）、可展开行卡 + 运行详情面板入口。
 */

import { useState } from 'react';
import { StatusPill } from '@/components/ui/status-pill';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Activity,
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  ChevronDown,
  FolderKanban,
  DollarSign,
  Target,
  Ban,
  Circle,
  FileText,
} from 'lucide-react';
import {
  isTerminalRunStatus,
  executionApi,
  useExecutionRuns,
  type ExecutionRunRecord,
  type ExecutionRunStatus,
} from '../api/execution-api';
import { RunDetailsDialog } from '../components/run-details-dialog';
import {
  formatCost,
  formatRunDuration,
  formatTokens,
} from '../components/run-details-format';
import { projectApi } from '@/modules/project/api/project-api';
import { api } from '@/infrastructure/api-client';

// 状态配置（服务端 8 状态全集）
const STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; color: string; pulse?: boolean }
> = {
  draft: { icon: Circle, color: 'text-muted-foreground' },
  planned: { icon: Circle, color: 'text-muted-foreground' },
  in_progress: { icon: Clock, color: 'text-accent-blue', pulse: true },
  pending_approval: { icon: AlertTriangle, color: 'text-accent-yellow' },
  completed: { icon: CheckCircle2, color: 'text-accent-green' },
  failed: { icon: XCircle, color: 'text-accent-red' },
  blocked: { icon: Ban, color: 'text-accent-red' },
  superseded: { icon: Circle, color: 'text-muted-foreground' },
};

const STATUS_PILL_TONE: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default',
  planned: 'default',
  in_progress: 'info',
  pending_approval: 'warning',
  completed: 'success',
  failed: 'danger',
  blocked: 'danger',
  superseded: 'default',
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <StatusPill tone={STATUS_PILL_TONE[status] ?? 'default'} className="gap-1">
      <Icon className={cn('size-3', cfg.pulse && 'animate-pulse')} />
      {t(`runDetails.status.${status}`)}
    </StatusPill>
  );
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

// KPI 统计卡片
function KPIStats({ runs }: { runs: ExecutionRunRecord[] }) {
  const { t } = useTranslation();
  const runningCount = runs.filter((r) => r.status === 'in_progress').length;
  const completedCount = runs.filter((r) => r.status === 'completed').length;
  const failedCount = runs.filter(
    (r) => r.status === 'failed' || r.status === 'blocked',
  ).length;
  const totalCost = runs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
  const totalTokens = runs.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0);
  const successRate =
    runs.length > 0
      ? Math.round(
          (completedCount / (completedCount + failedCount || 1)) * 100,
        )
      : 0;

  const items = [
    { label: t('execution.kpi.total'), value: runs.length, icon: Activity, color: 'text-foreground', sub: t('execution.kpi.totalSub') },
    { label: t('execution.kpi.running'), value: runningCount, icon: Clock, color: 'text-accent-blue', sub: t('execution.kpi.runningSub') },
    { label: t('execution.kpi.completed'), value: completedCount, icon: CheckCircle2, color: 'text-accent-green', sub: `${successRate}% ${t('execution.kpi.successRate')}` },
    { label: t('execution.kpi.failed'), value: failedCount, icon: XCircle, color: 'text-accent-red', sub: t('execution.kpi.failedSub') },
    { label: t('execution.kpi.cost'), value: `$${totalCost.toFixed(2)}`, icon: DollarSign, color: 'text-accent-purple', sub: `${formatTokens(totalTokens) ?? 0} tokens` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {items.map(({ label, value, icon: Icon, color, sub }) => (
        <Card key={label}>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className={cn('h-4 w-4', color)} />
            </div>
            <p className={cn('text-2xl font-semibold', color)}>{value}</p>
            <p className="mt-0.5 text-11 text-muted-foreground">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// 执行行组件
function ExecutionRow({
  run,
  isExpanded,
  onExpand,
  onViewDetail,
  onViewAcceptance,
}: {
  run: ExecutionRunRecord;
  isExpanded: boolean;
  onExpand: () => void;
  onViewDetail: () => void;
  onViewAcceptance: () => void;
}) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const duration = formatRunDuration(run);
  const tokens = formatTokens(run.totalTokens);
  const cost = formatCost(run.totalCost);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* 主行 */}
      <div
        className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-accent/20"
        onClick={onExpand}
      >
        <StatusIcon
          className={cn(
            'h-4 w-4 shrink-0',
            cfg.color,
            cfg.pulse && 'animate-pulse',
          )}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="truncate text-sm font-medium">{run.goal}</span>
            <StatusBadge status={run.status} />
          </div>
          <div className="flex items-center gap-3 text-11 text-muted-foreground">
            {run.subjectName && (
              <span className="flex items-center gap-1">
                <span className="flex h-3 w-3 items-center justify-center rounded-full bg-accent-purple">
                  <Bot className="h-2 w-2 text-white" />
                </span>
                {run.subjectName}
              </span>
            )}
            {run.project?.name && (
              <span className="flex items-center gap-1">
                <FolderKanban className="h-3 w-3" />
                {run.project.name}
              </span>
            )}
            {run.task?.title && <span className="truncate">{run.task.title}</span>}
            <span>{formatDateTime(run.startedAt ?? run.createdAt)}</span>
            {duration && <span>{duration}</span>}
          </div>
        </div>

        {/* tokens / 成本 */}
        <div className="hidden w-28 shrink-0 items-center justify-end gap-3 text-xs text-muted-foreground sm:flex">
          {tokens ? <span>{tokens}</span> : null}
          {cost ? (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {cost.replace('$', '')}
            </span>
          ) : null}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={(event) => {
            event.stopPropagation();
            onViewDetail();
          }}
        >
          <FileText className="h-3 w-3" />
        </Button>

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform',
            isExpanded && 'rotate-180',
          )}
        />
      </div>

      {/* 展开详情 */}
      {isExpanded && (
        <div className="space-y-3 border-t border-border bg-muted/20 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Task', value: run.task?.title ?? '—' },
              { label: 'Started', value: formatDateTime(run.startedAt) },
              { label: 'Tokens', value: tokens ?? '—' },
              { label: 'Cost', value: cost ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="mb-0.5 text-10 font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="truncate text-xs">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onViewDetail}>
              {t('runDetails.viewDetail')}
            </Button>
            {!isTerminalRunStatus(run.status) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  executionApi.cancel(run.id);
                }}
              >
                {t('common.cancel')}
              </Button>
            ) : null}
            {run.acceptanceId && (
              <Button variant="outline" size="sm" onClick={onViewAcceptance}>
                <Target className="mr-1.5 h-3 w-3" />
                View acceptance
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 主页面组件
export function ExecutionsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 筛选状态
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExecutionRunStatus | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailRunId, setDetailRunId] = useState<string | null>(null);

  // 数据查询（服务端状态/项目过滤，缺省跨项目）
  const { data, isLoading } = useExecutionRuns({
    projectId: projectFilter !== 'all' ? projectFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 100,
  });

  // 获取项目列表
  const { data: projectsData } = useQuery({
    queryKey: ['project-list'],
    queryFn: () => projectApi.getList({ pageSize: 100 }),
  });
  const projects = projectsData?.items ?? [];

  // 获取 AI 成员列表（V3：subjectId 即 Member.id，客户端按此过滤）
  const { data: agentsData } = useQuery({
    queryKey: ['ai-members', 'filter'],
    queryFn: () =>
      api.get<{ data: { id: string; displayName: string }[]; total: number }>(
        '/members',
        { type: 'ai_agent', limit: 100 },
      ),
  });
  const agents = agentsData?.data ?? [];

  const runs = data?.runs ?? [];

  // 客户端补充过滤（搜索 / agent）
  const filteredRuns = runs.filter((r) => {
    if (agentFilter !== 'all' && r.subjectId !== agentFilter) {
      return false;
    }
    if (search) {
      const keyword = search.toLowerCase();
      if (
        !r.goal.toLowerCase().includes(keyword) &&
        !r.task?.title?.toLowerCase().includes(keyword)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleViewAcceptance = (acceptanceId: string) => {
    navigate(`/app/acceptance/${acceptanceId}`);
  };

  const hasActiveFilters =
    statusFilter !== 'all' || agentFilter !== 'all' || projectFilter !== 'all' || search;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setAgentFilter('all');
    setProjectFilter('all');
  };

  return (
    <PageShell>
      <PageHeader
        title="Execution Center"
        icon={Activity}
        iconColor="text-accent-purple"
        actions={
          <HeaderActionButton
            variant="outline"
            icon={Bot}
            label="Agent Console"
            onClick={() => navigate('/app/settings/ai')}
          />
        }
      />

      <div className="mx-auto w-full max-w-screen-xl space-y-5 p-6">
        {/* KPI 统计 */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <KPIStats runs={runs} />
        )}

        {/* 筛选器 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search executions…"
              className="w-52 pl-8 text-xs"
            />
          </div>

          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ExecutionRunStatus | 'all')}
            className="w-36 text-xs"
          >
            <option value="all">All Statuses</option>
            {Object.keys(STATUS_CONFIG).map((status) => (
              <option key={status} value={status}>
                {t(`runDetails.status.${status}`)}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="w-36 text-xs"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-36 text-xs"
          >
            <option value="all">All Projects</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Clear filters
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filteredRuns.length} executions
          </span>
        </div>

        {/* 执行列表 */}
        <div className="space-y-2">
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : filteredRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No executions match your filters
              </p>
            </div>
          ) : (
            filteredRuns.map((run) => (
              <ExecutionRow
                key={run.id}
                run={run}
                isExpanded={expandedId === run.id}
                onExpand={() => handleExpand(run.id)}
                onViewDetail={() => setDetailRunId(run.id)}
                onViewAcceptance={() =>
                  run.acceptanceId && handleViewAcceptance(run.acceptanceId)
                }
              />
            ))
          )}
        </div>
      </div>

      <RunDetailsDialog
        runId={detailRunId}
        open={!!detailRunId}
        onOpenChange={(open) => {
          if (!open) setDetailRunId(null);
        }}
      />
    </PageShell>
  );
}
