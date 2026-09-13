/**
 * 执行记录页 - AI Agent 执行运行管理（list-page 模板骨架）
 *
 * 数据源：GET /execution/runs（{runs,total}，projectId 缺省 = 用户为成员的全部项目）。
 * 快捷统计卡（页头幽灵按钮切换）+ ToolbarRow 筛选（状态/Agent/项目收进下拉）+ DataList 行原语列表。
 * 行点击 / Enter 打开 RunDetailsDialog；右键菜单承载总览、验收跳转与取消执行。
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Ban,
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  FolderKanban,
  List,
  Package,
  SearchX,
  SquareTerminal,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { DataList, ListText } from '@/components/ui/data-list';
import type { MenuItem } from '@/components/ui/context-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { QuickCardsToggle } from '@/components/ui/quick-cards-toggle';
import { StatsCard, STATS_THEMES } from '@/components/ui/stats-card';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import {
  isTerminalRunStatus,
  executionApi,
  useExecutionRuns,
  type ExecutionRunRecord,
  type ExecutionRunStatus,
} from '../api/execution-api';
import { RunDetailsDialog } from '../components/run-details-dialog';
import { RunOverviewCard } from '../components/run-overview-card';
import {
  RUN_STATUS_CONFIG,
  RunStatusBadge,
  formatRunDateTime,
} from '../components/run-status';
import {
  formatCost,
  formatRunDuration,
  formatTokens,
} from '../components/run-details-format';
import { projectApi } from '@/modules/project/api/project-api';
import { api } from '@/infrastructure/api-client';
import { getEntityIcon } from '@/shared/entity-icons/entity-icons';
import { TONE_TEXT_CLASS } from '@/shared/status/status-visuals';
import { usePersistentToggle } from '@/shared/hooks/use-persistent-toggle';
import { usePipelineProjectFilter } from '@/shared/layout/pipeline-focus';

const STATUS_KEYS = Object.keys(RUN_STATUS_CONFIG) as ExecutionRunStatus[];

/**
 * 状态视觉映射见 components/run-status.tsx（执行 run 状态 ≠ 任务状态，独立口径）。
 */

// 主页面组件
export function ExecutionsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 管道项目聚焦（CAP-A-15）：URL ?project 作为 projectFilter 受控初值；
  // 用户在页内改动仍写自身状态（不回写 URL）
  const { focusProjectId } = usePipelineProjectFilter();

  // 筛选状态
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExecutionRunStatus | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>(focusProjectId ?? 'all');
  const [detailRunId, setDetailRunId] = useState<string | null>(null);
  const [overviewRun, setOverviewRun] = useState<ExecutionRunRecord | null>(null);

  // 快捷统计卡显隐（持久化）
  const stats = usePersistentToggle('executions-page.stats');

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

  const runs = useMemo(() => data?.runs ?? [], [data]);

  // 客户端补充过滤（搜索 / agent）
  const filteredRuns = runs.filter((r) => {
    if (agentFilter !== 'all' && r.subjectId !== agentFilter) {
      return false;
    }
    if (search) {
      const keyword = search.toLowerCase();
      if (
        !r.goal.toLowerCase().includes(keyword) &&
        !r.issue?.title?.toLowerCase().includes(keyword)
      ) {
        return false;
      }
    }
    return true;
  });

  // 快捷统计卡（KPI 派生自当前项目/状态口径下的 runs）
  const statsItems = useMemo(() => {
    const runningCount = runs.filter((r) => r.status === 'in_progress').length;
    const completedCount = runs.filter((r) => r.status === 'completed').length;
    const failedCount = runs.filter(
      (r) => r.status === 'failed' || r.status === 'blocked',
    ).length;
    const totalCost = runs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
    const successRate =
      runs.length > 0
        ? Math.round((completedCount / (completedCount + failedCount || 1)) * 100)
        : 0;
    return [
      { key: 'total', value: runs.length, label: t('execution.kpi.total'), icon: Activity, ...STATS_THEMES.default },
      { key: 'running', value: runningCount, label: t('execution.kpi.running'), icon: Clock, ...STATS_THEMES.blue },
      { key: 'completed', value: completedCount, label: t('execution.kpi.completed'), icon: CheckCircle2, ...STATS_THEMES.green },
      { key: 'failed', value: failedCount, label: t('execution.kpi.failed'), icon: XCircle, ...STATS_THEMES.red },
      { key: 'successRate', value: `${successRate}%`, label: t('execution.kpi.successRate'), icon: Target, ...STATS_THEMES.yellow },
      { key: 'cost', value: `$${totalCost.toFixed(2)}`, label: t('execution.kpi.cost'), icon: DollarSign, ...STATS_THEMES.purple },
    ];
  }, [runs, t]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setAgentFilter('all');
    setProjectFilter('all');
  };

  // 已保存视图：快照记忆当前页全部筛选
  const toolbar = useToolbarViews({
    key: 'executions-page',
    defaults: [
      {
        id: 'all',
        name: t('common.all'),
        icon: 'list',
        builtIn: true,
        snapshot: { search: '', status: 'all', agent: 'all', project: 'all' },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string;
        status: ExecutionRunStatus | 'all';
        agent: string;
        project: string;
      }>;
      setSearch(snap.search ?? '');
      setStatusFilter(snap.status ?? 'all');
      setAgentFilter(snap.agent ?? 'all');
      setProjectFilter(snap.project ?? 'all');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilter, agent: agentFilter, project: projectFilter });
  }, [updateActiveSnapshot, search, statusFilter, agentFilter, projectFilter]);

  const entity = getEntityIcon('execution');

  const rowMenuItems = (run: ExecutionRunRecord): MenuItem[] => {
    const items: MenuItem[] = [
      { id: 'detail', label: t('runDetails.viewDetail'), icon: <FileText className="size-3.5" />, onClick: () => setDetailRunId(run.id) },
      { id: 'overview', label: t('runDetails.card.title'), icon: <ExternalLink className="size-3.5" />, onClick: () => setOverviewRun(run) },
    ];
    if (run.acceptanceId) {
      items.push({
        id: 'acceptance',
        label: t('execution.row.viewAcceptance'),
        icon: <Target className="size-3.5" />,
        onClick: () => navigate(`/app/acceptance/${run.acceptanceId}`),
      });
    }
    if (!isTerminalRunStatus(run.status)) {
      items.push({
        id: 'cancel',
        label: t('execution.row.cancel'),
        icon: <Ban className="size-3.5" />,
        destructive: true,
        separatorAfter: true,
        onClick: () => executionApi.cancel(run.id),
      });
    }
    return items;
  };

  const renderLeading = (run: ExecutionRunRecord) => {
    const cfg = RUN_STATUS_CONFIG[run.status] ?? RUN_STATUS_CONFIG.draft;
    const StatusIcon = cfg.icon;
    const duration = formatRunDuration(run);
    return (
      <>
        <StatusIcon
          className={cn('size-4 shrink-0', cfg.color, cfg.pulse && 'animate-pulse')}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <ListText className="font-medium">{run.goal}</ListText>
            <RunStatusBadge status={run.status} />
          </div>
          <div className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
            {run.subjectName ? (
              <span className="flex items-center gap-1">
                <Bot className="size-3" />
                {run.subjectName}
              </span>
            ) : null}
            {run.project?.name ? (
              <span className="flex items-center gap-1">
                <FolderKanban className="size-3" />
                {run.project.name}
              </span>
            ) : null}
            {run.issue?.title ? <span className="truncate">{run.issue.title}</span> : null}
            <span className="shrink-0">{formatRunDateTime(run.startedAt ?? run.createdAt)}</span>
            {duration ? <span className="shrink-0">{duration}</span> : null}
          </div>
        </div>
      </>
    );
  };

  const renderTrailing = (run: ExecutionRunRecord) => {
    const tokens = formatTokens(run.totalTokens);
    const cost = formatCost(run.totalCost);
    return (
      <>
        {run.providerId ? (
          <span className="rounded-full bg-muted/60 px-2 py-0.5 font-mono text-11 text-muted-foreground">
            {run.providerId}
          </span>
        ) : null}
        {run.stepsCount != null ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <SquareTerminal className="size-3" />
            {t('execution.row.steps', { count: run.stepsCount })}
          </span>
        ) : null}
        {run.artifactsCount ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="size-3" />
            {t('execution.row.artifacts', { count: run.artifactsCount })}
          </span>
        ) : null}
        {tokens ? <span className="text-xs text-muted-foreground">{tokens}</span> : null}
        {cost ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="size-3" />
            {cost.replace('$', '')}
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="size-7 shrink-0 p-0"
          title={t('runDetails.viewDetail')}
          onClick={(event) => {
            event.stopPropagation();
            setDetailRunId(run.id);
          }}
        >
          <FileText className="size-3.5" />
        </Button>
      </>
    );
  };

  return (
    <PageShell className="overflow-hidden" aiPage="executions.list">
      <PageHeader
        aiId="executions.list"
        title={t('nav.executions')}
        icon={entity.icon}
        iconColor={TONE_TEXT_CLASS[entity.tone]}
        metrics={[{ id: 'total', label: t('nav.executions'), value: filteredRuns.length }]}
        actions={
          <>
            <QuickCardsToggle
              visible={stats.visible}
              onToggle={stats.toggle}
              label={t('execution.stats.toggle', '快捷统计')}
              aiId="executions.list.stats-toggle"
            />
            <HeaderActionButton
              variant="outline"
              icon={Bot}
              label={t('execution.agentConsole', 'Agent 控制台')}
              onClick={() => navigate('/app/settings/ai')}
            />
          </>
        }
      />

      {/* 统计卡区（默认隐藏，页头幽灵按钮切换） */}
      {stats.visible ? (
        <div className="border-b border-border bg-background px-6 py-4">
          <StatsCard items={statsItems} columns={6} />
        </div>
      ) : null}

      <ToolbarRow
        aiId="executions.list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{
          value: 'list',
          onChange: () => {},
          options: [{ value: 'list', label: t('viewDisplay.views.list', 'List'), icon: List }],
        }}
        filterMenu={{
          badge: [
            statusFilter !== 'all',
            agentFilter !== 'all',
            projectFilter !== 'all',
          ].filter(Boolean).length,
          search: { value: search, onChange: setSearch, placeholder: t('execution.filter.searchPlaceholder') },
          items: [
            { type: 'label', label: t('execution.filter.statusGroup') },
            {
              id: 'status-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: statusFilter === 'all',
              onSelect: () => setStatusFilter('all'),
            },
            ...STATUS_KEYS.map((status) => {
              const cfg = RUN_STATUS_CONFIG[status];
              return {
                id: `status-${status}`,
                type: 'checkbox' as const,
                label: t(`runDetails.status.${status}`),
                icon: cfg.icon,
                checked: statusFilter === status,
                onSelect: () =>
                  setStatusFilter(statusFilter === status ? 'all' : status),
              };
            }),
            { type: 'separator' },
            { type: 'label', label: t('execution.filter.agentGroup') },
            {
              id: 'agent-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: agentFilter === 'all',
              onSelect: () => setAgentFilter('all'),
            },
            ...agents.map((a) => ({
              id: `agent-${a.id}`,
              type: 'checkbox' as const,
              label: a.displayName,
              checked: agentFilter === a.id,
              onSelect: () => setAgentFilter(agentFilter === a.id ? 'all' : a.id),
            })),
            { type: 'separator' },
            { type: 'label', label: t('execution.filter.projectGroup') },
            {
              id: 'project-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: projectFilter === 'all',
              onSelect: () => setProjectFilter('all'),
            },
            ...projects.map((p) => ({
              id: `project-${p.id}`,
              type: 'checkbox' as const,
              label: p.name,
              checked: projectFilter === p.id,
              onSelect: () => setProjectFilter(projectFilter === p.id ? 'all' : p.id),
            })),
          ],
        }}
      />

      {/* 内容区：DataList 行原语列表；空态由页面接管（区分「无记录」与「筛选无结果」） */}
      <div className="flex-1 overflow-auto p-6">
        {!isLoading && filteredRuns.length === 0 ? (
          runs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={t('execution.empty.none')}
              description={t('execution.empty.noneDesc')}
              action={
                <Button variant="outline" size="sm" onClick={() => navigate('/app/tasks')}>
                  {t('execution.empty.goTasks')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title={t('execution.empty.filtered')}
              description={t('execution.empty.filteredDesc')}
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  {t('common.filterClear')}
                </Button>
              }
            />
          )
        ) : (
          <DataList
            items={filteredRuns}
            loading={isLoading}
            className="w-full"
            renderLeading={renderLeading}
            renderTrailing={renderTrailing}
            onItemClick={(run) => setDetailRunId(run.id)}
            onItemContextMenu={rowMenuItems}
          />
        )}
      </div>

      <RunDetailsDialog
        runId={detailRunId}
        open={!!detailRunId}
        onOpenChange={(open) => {
          if (!open) setDetailRunId(null);
        }}
      />

      {overviewRun ? (
        <RunOverviewCard
          run={overviewRun}
          open
          onOpenChange={(open) => {
            if (!open) setOverviewRun(null);
          }}
        />
      ) : null}
    </PageShell>
  );
}
