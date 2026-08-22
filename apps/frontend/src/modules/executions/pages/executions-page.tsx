/**
 * 执行中心页面 - AI Agent 执行运行管理
 * 
 * 参考 Figma 设计样式，提供：
 * - KPI 统计卡片（总运行数、运行中、已完成、失败、总成本）
 * - 多维度筛选（状态、Agent、项目）
 * - 执行列表（可展开详情）
 * - 执行历史、执行输出、错误信息展示
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Activity,
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Search,
  ChevronDown,
  FolderKanban,
  DollarSign,
  Target,
  RefreshCw,
  X,
  ArrowUpRight,
  Circle,
  Square,
} from 'lucide-react';
import { executionApi, useExecutionRuns, type ExecutionRun, type ExecStatus } from '../api/execution-api';
import { projectApi } from '@/modules/project/api/project-api';
import { api } from '@/infrastructure/api-client';

// 状态配置
const STATUS_CONFIG: Record<ExecStatus, { 
  label: string; 
  icon: typeof Clock; 
  color: string; 
  bg: string 
}> = {
  running: { 
    label: 'Running', 
    icon: Clock, 
    color: 'text-blue-500', 
    bg: 'bg-blue-50 dark:bg-blue-950/40' 
  },
  completed: { 
    label: 'Completed', 
    icon: CheckCircle2, 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/40' 
  },
  failed: { 
    label: 'Failed', 
    icon: XCircle, 
    color: 'text-red-600', 
    bg: 'bg-red-50 dark:bg-red-950/40' 
  },
  pending: { 
    label: 'Pending', 
    icon: Circle, 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/60' 
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: Square, 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/60' 
  },
};

// 状态徽章组件
function StatusBadge({ status }: { status: ExecStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-10 font-medium px-1.5 py-0.5 rounded-full border',
      cfg.bg,
      cfg.color
    )}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// KPI 统计卡片
function KPIStats({ runs }: { runs: ExecutionRun[] }) {
  const runningCount = runs.filter(r => r.status === 'running').length;
  const completedCount = runs.filter(r => r.status === 'completed').length;
  const failedCount = runs.filter(r => r.status === 'failed').length;
  const totalCost = runs.reduce((sum, r) => sum + r.cost, 0);
  const totalTokens = runs.reduce((sum, r) => sum + r.tokensUsed, 0);
  const successRate = runs.length > 0 
    ? Math.round((completedCount / (completedCount + failedCount || 1)) * 100)
    : 0;

  const items = [
    { label: 'Total Runs', value: runs.length, icon: Activity, color: 'text-foreground', sub: 'all time' },
    { label: 'Running', value: runningCount, icon: Clock, color: 'text-blue-500', sub: 'active now' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-emerald-600', sub: `${successRate}% success rate` },
    { label: 'Failed', value: failedCount, icon: XCircle, color: 'text-red-600', sub: 'need review' },
    { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, icon: DollarSign, color: 'text-violet-500', sub: `${(totalTokens / 1000).toFixed(0)}k tokens` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map(({ label, value, icon: Icon, color, sub }) => (
        <Card key={label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <p className={cn('text-2xl font-semibold', color)}>{value}</p>
            <p className="text-11 text-muted-foreground mt-0.5">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// 执行行组件
function ExecutionRow({ 
  run, 
  onExpand,
  isExpanded,
  onViewAcceptance,
  onRetry,
}: { 
  run: ExecutionRun;
  onExpand: () => void;
  isExpanded: boolean;
  onViewAcceptance: () => void;
  onRetry: () => void;
}) {
  const cfg = STATUS_CONFIG[run.status];
  const StatusIcon = cfg.icon;
  const progressPct = run.stepsTotal > 0 
    ? Math.round((run.stepsCompleted / run.stepsTotal) * 100) 
    : 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* 主行 */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/20 transition-colors"
        onClick={onExpand}
      >
        <StatusIcon className={cn(
          'w-4 h-4 shrink-0', 
          cfg.color,
          run.status === 'running' && 'animate-pulse'
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium truncate">{run.title}</span>
            <StatusBadge status={run.status} />
          </div>
          <div className="flex items-center gap-3 text-11 text-muted-foreground">
            {run.agentName && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-accent-purple flex items-center justify-center">
                  <Bot className="w-2 h-2 text-white" />
                </span>
                {run.agentName}
              </span>
            )}
            {run.projectName && (
              <span className="flex items-center gap-1">
                <FolderKanban className="w-3 h-3" />
                {run.projectName}
              </span>
            )}
            <span>{run.startedAt}</span>
            {run.duration && <span>{run.duration}</span>}
          </div>
        </div>

        {/* Steps 进度 */}
        <div className="hidden md:flex flex-col items-end gap-1 w-28 shrink-0">
          <div className="flex items-center gap-1.5 w-full">
            <Progress value={progressPct} className="flex-1 h-1.5" />
            <span className="text-11 text-muted-foreground w-10 text-right">
              {run.stepsCompleted}/{run.stepsTotal}
            </span>
          </div>
          <span className="text-10 text-muted-foreground">steps</span>
        </div>

        {/* 成本 */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-16 justify-end">
          {run.cost > 0 ? (
            <><DollarSign className="w-3 h-3" />{run.cost.toFixed(2)}</>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </div>

        <ChevronDown className={cn(
          'w-4 h-4 text-muted-foreground/40 shrink-0 transition-transform', 
          isExpanded && 'rotate-180'
        )} />
      </div>

      {/* 展开详情 */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Task', value: run.taskTitle || '—' },
              { label: 'Started', value: run.startedAt },
              { label: 'Tokens used', value: run.tokensUsed > 0 ? `${(run.tokensUsed / 1000).toFixed(1)}k` : '—' },
              { label: 'Cost', value: run.cost > 0 ? `$${run.cost.toFixed(2)}` : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-10 uppercase tracking-wider font-medium text-muted-foreground mb-0.5">{label}</p>
                <p className="text-xs truncate">{value}</p>
              </div>
            ))}
          </div>

          {run.output && (
            <div className="rounded-lg bg-background border border-border p-3">
              <p className="text-10 uppercase tracking-wider font-medium text-muted-foreground mb-1.5">Output</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{run.output}</p>
            </div>
          )}

          {run.errorMessage && (
            <div className="rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3">
              <p className="text-10 uppercase tracking-wider font-medium text-red-600 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Error
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">{run.errorMessage}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Re-run
            </Button>
            {run.acceptanceId && (
              <Button variant="outline" size="sm" onClick={onViewAcceptance}>
                <Target className="w-3 h-3 mr-1.5" />
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
  
  // 筛选状态
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExecStatus | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 数据查询
  const { data: pageData, isLoading } = useExecutionRuns({
    status: statusFilter,
    agentId: agentFilter !== 'all' ? agentFilter : undefined,
    projectId: projectFilter !== 'all' ? projectFilter : undefined,
    search: search || undefined,
  });

  // 获取项目列表
  const { data: projectsData } = useQuery({
    queryKey: ['project-list'],
    queryFn: () => projectApi.getList({ pageSize: 100 }),
  });
  const projects = projectsData?.items ?? [];

  // 获取 Agent 列表 (从 /ai/agents 接口)
  const { data: agentsData } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/ai/agents'),
  });
  const agents = agentsData ?? [];

  const runs = pageData?.items ?? [];

  // 筛选后的数据
  const filteredRuns = runs.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) &&
        !r.taskTitle?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleViewAcceptance = (acceptanceId: string) => {
    navigate(`/app/acceptance/${acceptanceId}`);
  };

  const hasActiveFilters = statusFilter !== 'all' || agentFilter !== 'all' || projectFilter !== 'all' || search;

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

      <div className="p-6 space-y-5 max-w-screen-xl mx-auto w-full">
        {/* KPI 统计 */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <KPIStats runs={runs} />
        )}

        {/* 筛选器 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search executions…"
              className="pl-8 w-52 text-xs"
            />
          </div>

          <NativeSelect
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ExecStatus | 'all')}
            className="text-xs w-36"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
              <option key={id} value={id}>{cfg.label}</option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            className="text-xs w-36"
          >
            <option value="all">All Agents</option>
            {agents?.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="text-xs w-36"
          >
            <option value="all">All Projects</option>
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </NativeSelect>

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
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
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))
          ) : filteredRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No executions match your filters</p>
            </div>
          ) : (
            filteredRuns.map(run => (
              <ExecutionRow
                key={run.id}
                run={run}
                isExpanded={expandedId === run.id}
                onExpand={() => handleExpand(run.id)}
                onViewAcceptance={() => run.acceptanceId && handleViewAcceptance(run.acceptanceId)}
                onRetry={() => {}}
              />
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
