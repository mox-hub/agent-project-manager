/**
 * 验收中心列表页面 - 参考 Figma 设计样式
 * 
 * 新设计特点：
 * - KPI 统计卡片（通过率、进行中、阻塞、总成本、待处理）
 * - 状态分布和审计风险概览卡片
 * - 多维度筛选（状态、风险等级、项目）
 * - 验收列表（可点击查看详情）
 * - 验收标准进度、审计风险、成本、负责人展示
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { QuickCardsToggle } from '@/components/ui/quick-cards-toggle';
import { usePersistentToggle } from '@/shared/hooks/use-persistent-toggle';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  ChevronDown,
  FolderKanban,
  Target,
  Sparkles,
  DollarSign,
  Circle,
  Eye,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { useAcceptanceList, type Acceptance } from '../api/acceptance-api';

type AcceptanceStatus = 'draft' | 'pending' | 'in_review' | 'passed' | 'failed' | 'waived';
type AuditRisk = 'green' | 'yellow' | 'red';

const STATUS_CONFIG: Record<AcceptanceStatus, { 
  label: string; 
  icon: typeof Clock; 
  color: string; 
  bg: string 
}> = {
  draft: { 
    label: 'Draft', 
    icon: Circle, 
    color: 'text-slate-500', 
    bg: 'bg-slate-100 dark:bg-slate-800' 
  },
  pending: { 
    label: 'Pending', 
    icon: Circle, 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/60' 
  },
  in_review: { 
    label: 'In Progress', 
    icon: Clock, 
    color: 'text-blue-500', 
    bg: 'bg-blue-50 dark:bg-blue-950/40' 
  },
  passed: { 
    label: 'Passed', 
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
  waived: { 
    label: 'Waived', 
    icon: AlertTriangle, 
    color: 'text-slate-400', 
    bg: 'bg-slate-100 dark:bg-slate-800' 
  },
};

const RISK_CONFIG: Record<AuditRisk, { label: string; color: string; dot: string }> = {
  green: { label: 'Clean', color: 'text-emerald-600', dot: 'bg-emerald-500' },
  yellow: { label: 'Warning', color: 'text-amber-600', dot: 'bg-amber-500' },
  red: { label: 'Blocking', color: 'text-red-600', dot: 'bg-red-500' },
};

// 状态徽章
function StatusBadge({ status }: { status: AcceptanceStatus }) {
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

// 审计风险徽章
function RiskBadge({ risk }: { risk: AuditRisk }) {
  const cfg = RISK_CONFIG[risk];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
      <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
    </span>
  );
}

// KPI 统计卡片
function KPIStats({ acceptances }: { acceptances: Acceptance[] }) {
  const passedCount = acceptances.filter(a => a.status === 'passed').length;
  const failedCount = acceptances.filter(a => a.status === 'failed').length;
  const inProgressCount = acceptances.filter(a => a.status === 'in_review').length;
  const pendingCount = acceptances.filter(a => a.status === 'pending').length;
  const blockedCount = failedCount + acceptances.filter(a => a.status === 'waived').length;
  const totalCost = acceptances.reduce((sum, a) => sum + (a.totalCost ?? 0), 0);
  const passRate = acceptances.length > 0 ? Math.round((passedCount / acceptances.length) * 100) : 0;

  // 统计红风险数量
  const redRiskCount = acceptances.filter(a => {
    const report = a.auditReport;
    return report?.riskLevel === 'red';
  }).length;

  const items = [
    { 
      label: 'Pass Rate', 
      value: `${passRate}%`, 
      icon: TrendingUp, 
      color: 'text-emerald-500', 
      sub: `${passedCount} passed`,
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/50'
    },
    { 
      label: 'In Progress', 
      value: inProgressCount, 
      icon: Clock, 
      color: 'text-blue-500', 
      sub: 'active reviews',
      bg: 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/50'
    },
    { 
      label: 'Blocked', 
      value: blockedCount, 
      icon: ShieldAlert, 
      color: 'text-red-500', 
      sub: `${redRiskCount} red-risk audits`,
      bg: 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/50'
    },
    { 
      label: 'Total Cost', 
      value: `$${totalCost.toFixed(1)}`, 
      icon: DollarSign, 
      color: 'text-violet-500', 
      sub: 'AI execution cost',
      bg: 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-200/50 dark:border-violet-900/50'
    },
    { 
      label: 'Pending', 
      value: pendingCount, 
      icon: Circle, 
      color: 'text-muted-foreground', 
      sub: 'awaiting start',
      bg: 'bg-muted/30 border-transparent'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map(({ label, value, icon: Icon, color, sub, bg }) => (
        <div 
          key={label} 
          className={cn('rounded-xl p-4 border transition-all', bg)}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
          <p className={cn('text-2xl font-semibold', color)}>{value}</p>
          <p className="text-11 text-muted-foreground mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  );
}

// 状态分布卡片
function StatusDistributionCard({ acceptances }: { acceptances: Acceptance[] }) {
  const statusCounts = {
    passed: acceptances.filter(a => a.status === 'passed').length,
    failed: acceptances.filter(a => a.status === 'failed').length,
    in_review: acceptances.filter(a => a.status === 'in_review').length,
    waived: acceptances.filter(a => a.status === 'waived').length,
    pending: acceptances.filter(a => a.status === 'pending').length,
    draft: acceptances.filter(a => a.status === 'draft').length,
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {(Object.entries(statusCounts) as [AcceptanceStatus, number][]).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          const pct = acceptances.length > 0 ? Math.round((count / acceptances.length) * 100) : 0;
          return (
            <div key={status} className="flex items-center gap-3">
              <Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.color)} />
              <span className="text-xs w-24 shrink-0">{cfg.label}</span>
              <Progress value={pct} className="flex-1 h-1.5" />
              <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// 审计风险概览卡片
function AuditRiskCard({ acceptances }: { acceptances: Acceptance[] }) {
  const riskCounts = {
    red: acceptances.filter(a => a.auditReport?.riskLevel === 'red').length,
    yellow: acceptances.filter(a => a.auditReport?.riskLevel === 'yellow').length,
    green: acceptances.filter(a => a.auditReport?.riskLevel === 'green').length,
  };

  const hasRedRisks = riskCounts.red > 0;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Audit Risk Summary
          {hasRedRisks && (
            <span className="inline-flex items-center gap-1 text-10 font-medium text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="w-2.5 h-2.5" />
              {riskCounts.red} blocking
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {(Object.entries(riskCounts) as [AuditRisk, number][]).map(([risk, count]) => {
          const cfg = RISK_CONFIG[risk];
          const pct = acceptances.length > 0 ? Math.round((count / acceptances.length) * 100) : 0;
          return (
            <div key={risk} className="flex items-center gap-3">
              <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
              <span className={cn('text-xs w-20 shrink-0 font-medium', cfg.color)}>{cfg.label}</span>
              <Progress value={pct} className="flex-1 h-1.5" />
              <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
            </div>
          );
        })}
        <button
          className="mt-2 flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Show only blocking issues
        </button>
      </CardContent>
    </Card>
  );
}

// 验收列表行
function AcceptanceRow({ 
  acceptance, 
  onClick 
}: { 
  acceptance: Acceptance;
  onClick: () => void;
}) {
  const status = STATUS_CONFIG[acceptance.status as AcceptanceStatus] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  
  const functionalCriteria = acceptance.criteria?.filter(c => c.criteriaType === 'functional') ?? [];
  const technicalCriteria = acceptance.criteria?.filter(c => c.criteriaType === 'technical') ?? [];
  const passedCriteria = acceptance.criteria?.filter(c => c.status === 'passed') ?? [];
  const totalCriteria = acceptance.criteria?.length ?? 0;
  const progressPct = totalCriteria > 0 ? Math.round((passedCriteria.length / totalCriteria) * 100) : 0;

  // 审计风险
  const riskLevel = acceptance.auditReport?.riskLevel as AuditRisk | undefined;
  const risk = riskLevel ? RISK_CONFIG[riskLevel] : null;

  // 项目和任务信息
  const projectName = acceptance.task?.project?.name;
  const taskTitle = acceptance.task?.title;
  const executionCount = acceptance.executions?.length ?? 0;

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/30 hover:border-border/80 transition-all cursor-pointer"
    >
      {/* 状态图标 */}
      <StatusIcon className={cn('w-4 h-4 shrink-0', status.color)} />

      {/* 主内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium truncate">
            {acceptance.title || '验收契约'}
          </span>
          <StatusBadge status={acceptance.status as AcceptanceStatus} />
        </div>
        <div className="flex items-center gap-3 text-11 text-muted-foreground">
          {projectName && (
            <span className="flex items-center gap-1">
              <FolderKanban className="w-3 h-3" />
              {projectName}
            </span>
          )}
          {taskTitle && (
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {taskTitle}
            </span>
          )}
          {executionCount > 0 && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {executionCount} executions
            </span>
          )}
        </div>
      </div>

      {/* 验收标准进度 */}
      <div className="hidden md:flex flex-col items-end gap-1 w-28 shrink-0">
        <div className="flex items-center gap-1.5 w-full">
          <Progress value={progressPct} className="flex-1 h-1.5" />
          <span className="text-11 text-muted-foreground w-10 text-right">
            {passedCriteria.length}/{totalCriteria}
          </span>
        </div>
        <span className="text-10 text-muted-foreground">criteria</span>
      </div>

      {/* 审计风险 */}
      {risk && (
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 w-20">
          <RiskBadge risk={riskLevel!} />
        </div>
      )}

      {/* 成本 */}
      <div className="hidden lg:block shrink-0 w-14 text-right">
        {(acceptance.totalCost ?? 0) > 0 ? (
          <span className="text-xs text-muted-foreground">${acceptance.totalCost!.toFixed(1)}</span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </div>

      {/* 箭头 */}
      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
    </div>
  );
}

// 主页面组件
export function AcceptanceListPage() {
  const navigate = useNavigate();
  const cardsVisible = usePersistentToggle('acceptance-list.stats');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AcceptanceStatus | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState<AuditRisk | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // 已保存视图：快照记忆搜索 + 筛选
  const toolbar = useToolbarViews({
    key: 'acceptance-list',
    defaults: [{
      id: 'all',
      name: 'All',
      icon: 'check',
      builtIn: true,
      snapshot: { search: '', status: 'all', risk: 'all' },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string; status: AcceptanceStatus | 'all'; risk: AuditRisk | 'all';
      }>;
      setSearch(snap.search ?? '');
      setStatusFilter(snap.status ?? 'all');
      setRiskFilter(snap.risk ?? 'all');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilter, risk: riskFilter });
  }, [updateActiveSnapshot, search, statusFilter, riskFilter]);

  // 数据查询
  const { data: pageData, isLoading } = useAcceptanceList({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const acceptances: Acceptance[] = pageData?.items ?? [];

  // 客户端筛选
  const filteredAcceptances = acceptances.filter(a => {
    if (search && !(a.title?.toLowerCase().includes(search.toLowerCase()) ?? false) &&
        !(a.task?.title?.toLowerCase().includes(search.toLowerCase()) ?? false)) return false;
    if (riskFilter !== 'all') {
      const riskLevel = a.auditReport?.riskLevel;
      if (riskLevel !== riskFilter) return false;
    }
    return true;
  });

  const hasActiveFilters = statusFilter !== 'all' || riskFilter !== 'all' || projectFilter !== 'all' || search;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRiskFilter('all');
    setProjectFilter('all');
  };

  return (
    <PageShell>
      <PageHeader
        title="Acceptance Center"
        icon={ShieldCheck}
        iconColor="text-accent-purple"
        actions={
          <>
            <QuickCardsToggle
              visible={cardsVisible.visible}
              onToggle={cardsVisible.toggle}
              label="Stats"
              activeLabel="Hide stats"
              aiId="acceptance.acceptance-list.stats-toggle"
            />
            <HeaderActionButton icon={Plus} label="New Acceptance" />
          </>
        }
      />

      {/* 共享工具栏（紧贴 header） */}
      <ToolbarRow
        aiId="acceptance.acceptance-list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        filterMenu={{
          badge: [statusFilter !== 'all', riskFilter !== 'all', !!search].filter(Boolean).length,
          search: { value: search, onChange: setSearch, placeholder: 'Search acceptances…' },
          items: [
            { type: 'label', label: 'Status' },
            ...(['all', 'draft', 'pending', 'in_review', 'passed', 'failed', 'waived'] as const).map((value) => ({
              id: `status-${value}`,
              type: 'checkbox' as const,
              label: value === 'all' ? 'All Statuses' : (STATUS_CONFIG[value as AcceptanceStatus]?.label ?? value),
              checked: statusFilter === value,
              onSelect: () => setStatusFilter(value),
            })),
            { type: 'separator' },
            { type: 'label', label: 'Risk' },
            ...(['all', 'green', 'yellow', 'red'] as const).map((value) => ({
              id: `risk-${value}`,
              type: 'checkbox' as const,
              label: value === 'all' ? 'All Risks' : (RISK_CONFIG[value as AuditRisk]?.label ?? value),
              checked: riskFilter === value,
              onSelect: () => setRiskFilter(value),
            })),
          ],
        }}
        displayMenu={false}
        downloadMenu={false}
      />

      <div className="p-6 space-y-5 max-w-screen-xl mx-auto w-full">
        {/* KPI + 概览卡片（默认隐藏，header 幽灵按钮切换） */}
        {cardsVisible.visible ? (
          isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <>
              <KPIStats acceptances={acceptances} />

              {/* 状态分布和审计风险概览 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusDistributionCard acceptances={acceptances} />
                <AuditRiskCard acceptances={acceptances} />
              </div>
            </>
          )
        ) : null}

        {/* 结果计数 */}
        <div className="flex items-center justify-end text-xs text-muted-foreground">
          {filteredAcceptances.length} results
        </div>

        {/* 验收列表 */}
        <div className="space-y-2">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))
          ) : filteredAcceptances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No acceptances match your filters</p>
            </div>
          ) : (
            filteredAcceptances.map(ac => (
              <AcceptanceRow
                key={ac.id}
                acceptance={ac}
                onClick={() => navigate(`/app/acceptance/${ac.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
