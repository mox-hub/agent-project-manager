/**
 * 验收中心列表页 — 按 list 模板骨架
 * PageHeader(新建入口) > QuickCards(KPI/状态分布/审计风险) > ToolbarRow(视图+筛选) > 行列表 + 分页
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  AlertTriangle,
  Ban,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Rows3,
  Table2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Target,
  Sparkles,
  DollarSign,
  Eye,
  ArrowUpRight,
} from 'lucide-react';
import { useAcceptanceList } from '../hooks/use-acceptance';
import { AcceptanceFormDialog } from '../components/acceptance-form-dialog';
import { ListActionButton } from '@/components/ui/data-list';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { toast } from '@/components/ui/toast';
import {
  acceptanceApi,
  isActiveAcceptance,
  type Acceptance,
  type AcceptanceStatus,
} from '../api/acceptance-api';

type AuditRisk = 'green' | 'yellow' | 'red';
type ViewMode = 'list' | 'table';

const STATUS_CONFIG: Record<
  AcceptanceStatus,
  { labelKey: string; icon: typeof Clock; color: string; bg: string }
> = {
  draft: {
    labelKey: 'acceptance.status.draft',
    icon: Circle,
    color: 'text-muted-foreground',
    bg: 'bg-muted/60',
  },
  pending: {
    labelKey: 'acceptance.status.pending',
    icon: Circle,
    color: 'text-muted-foreground',
    bg: 'bg-muted/60',
  },
  in_review: {
    labelKey: 'acceptance.status.in_review',
    icon: Clock,
    color: 'text-accent-blue',
    bg: 'bg-accent-blue/10',
  },
  passed: {
    labelKey: 'acceptance.status.passed',
    icon: CheckCircle2,
    color: 'text-accent-green',
    bg: 'bg-accent-green/10',
  },
  failed: {
    labelKey: 'acceptance.status.failed',
    icon: XCircle,
    color: 'text-accent-red',
    bg: 'bg-accent-red/10',
  },
  waived: {
    labelKey: 'acceptance.status.waived',
    icon: Ban,
    color: 'text-muted-foreground',
    bg: 'bg-muted/60',
  },
};

const RISK_CONFIG: Record<AuditRisk, { labelKey: string; color: string; dot: string }> = {
  green: {
    labelKey: 'acceptance.risk.green',
    color: 'text-accent-green',
    dot: 'bg-accent-green',
  },
  yellow: {
    labelKey: 'acceptance.risk.yellow',
    color: 'text-accent-yellow',
    dot: 'bg-accent-yellow',
  },
  red: {
    labelKey: 'acceptance.risk.red',
    color: 'text-accent-red',
    dot: 'bg-accent-red',
  },
};

const STATUS_ORDER: AcceptanceStatus[] = [
  'in_review',
  'draft',
  'pending',
  'passed',
  'failed',
  'waived',
];

// 状态徽章
function StatusBadge({ status }: { status: AcceptanceStatus }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-10 font-medium',
        cfg.bg,
        cfg.color,
      )}
    >
      <Icon className="size-3" />
      {t(cfg.labelKey)}
    </span>
  );
}

// KPI 统计卡
function KPIStats({ acceptances }: { acceptances: Acceptance[] }) {
  const { t } = useTranslation();
  const passedCount = acceptances.filter((a) => a.status === 'passed').length;
  const activeCount = acceptances.filter(isActiveAcceptance).length;
  const inReviewCount = acceptances.filter((a) => a.status === 'in_review').length;
  const failedOrWaivedCount = acceptances.filter(
    (a) => a.status === 'failed' || a.status === 'waived',
  ).length;
  const totalCost = acceptances.reduce((sum, a) => sum + (a.totalCost ?? 0), 0);

  const items = [
    {
      label: t('acceptance.metrics.total'),
      value: acceptances.length,
      icon: ShieldCheck,
      color: 'text-foreground',
    },
    {
      label: t('acceptance.metrics.active'),
      value: activeCount,
      icon: Clock,
      color: 'text-accent-blue',
    },
    {
      label: t('acceptance.metrics.inReview'),
      value: inReviewCount,
      icon: Eye,
      color: 'text-accent-blue',
    },
    {
      label: t('acceptance.metrics.passed'),
      value: passedCount,
      icon: CheckCircle2,
      color: 'text-accent-green',
    },
    {
      label: t('acceptance.metrics.failedOrWaived'),
      value: failedOrWaivedCount,
      icon: ShieldAlert,
      color: 'text-accent-red',
    },
    {
      label: t('acceptanceDetail.props.cost'),
      value: `$${totalCost.toFixed(1)}`,
      icon: DollarSign,
      color: 'text-accent-purple',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl border bg-card p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{label}</p>
            <Icon className={cn('size-4', color)} />
          </div>
          <p className={cn('text-2xl font-semibold', color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// 状态分布卡
function StatusDistributionCard({ acceptances }: { acceptances: Acceptance[] }) {
  const { t } = useTranslation();
  return (
    <Card size="sm">
      <CardHeader className="px-4 pb-2 pt-4">
        <CardTitle className="text-sm font-medium">
          {t('acceptance.filter.status')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        {STATUS_ORDER.map((status) => {
          const count = acceptances.filter((a) => a.status === status).length;
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          const pct =
            acceptances.length > 0 ? Math.round((count / acceptances.length) * 100) : 0;
          return (
            <div key={status} className="flex items-center gap-3">
              <Icon className={cn('size-3.5 shrink-0', cfg.color)} />
              <span className="w-20 shrink-0 text-xs">{t(cfg.labelKey)}</span>
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">
                {count}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// 审计风险卡
function AuditRiskCard({
  acceptances,
  onShowBlocking,
}: {
  acceptances: Acceptance[];
  onShowBlocking: () => void;
}) {
  const { t } = useTranslation();
  const risks: AuditRisk[] = ['red', 'yellow', 'green'];
  const redCount = acceptances.filter((a) => a.auditReport?.riskLevel === 'red').length;

  return (
    <Card size="sm">
      <CardHeader className="px-4 pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {t('acceptance.filter.risk')}
          {redCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent-red/40 bg-accent-red/10 px-1.5 py-0.5 text-10 font-medium text-accent-red">
              <AlertTriangle className="size-2.5" />
              {redCount}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {risks.map((risk) => {
          const count = acceptances.filter((a) => a.auditReport?.riskLevel === risk).length;
          const cfg = RISK_CONFIG[risk];
          const pct =
            acceptances.length > 0 ? Math.round((count / acceptances.length) * 100) : 0;
          return (
            <div key={risk} className="flex items-center gap-3">
              <span className={cn('size-2 shrink-0 rounded-full', cfg.dot)} />
              <span className={cn('w-20 shrink-0 text-xs font-medium', cfg.color)}>
                {t(cfg.labelKey)}
              </span>
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">
                {count}
              </span>
            </div>
          );
        })}
        {redCount > 0 && (
          <button
            className="mt-2 flex items-center gap-1.5 text-xs text-accent-red transition-colors hover:opacity-80"
            onClick={onShowBlocking}
          >
            <Eye className="size-3.5" />
            {t('acceptance.risk.red')} × {redCount}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// 验收列表行
function AcceptanceRow({
  acceptance,
  onClick,
}: {
  acceptance: Acceptance;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[acceptance.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  const criteria = acceptance.criteria ?? [];
  const passedCriteria = criteria.filter((c) => c.status === 'passed').length;
  const totalCriteria = criteria.length;
  const progressPct =
    totalCriteria > 0 ? Math.round((passedCriteria / totalCriteria) * 100) : 0;

  const riskLevel = acceptance.auditReport?.riskLevel as AuditRisk | undefined;
  const risk = riskLevel ? RISK_CONFIG[riskLevel] : null;

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80 hover:bg-accent/30"
    >
      <StatusIcon className={cn('size-4 shrink-0', cfg.color)} />

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {acceptance.title || t('acceptance.title')}
          </span>
          <StatusBadge status={acceptance.status} />
          {isActiveAcceptance(acceptance) && (
            <Badge variant="secondary" className="text-10">
              {t('acceptance.activeBadge')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-11 text-muted-foreground">
          {acceptance.task?.project?.name && (
            <span className="flex items-center gap-1">
              <FolderKanban className="size-3" />
              {acceptance.task.project.name}
            </span>
          )}
          {acceptance.task?.title && (
            <span className="flex items-center gap-1">
              <Target className="size-3" />
              {acceptance.task.title}
            </span>
          )}
          {(acceptance.executions?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Sparkles className="size-3" />
              {acceptance.executions!.length}
            </span>
          )}
        </div>
      </div>

      {/* 验收标准进度 */}
      <div className="hidden w-28 shrink-0 flex-col items-end gap-1 md:flex">
        <div className="flex w-full items-center gap-1.5">
          <Progress value={progressPct} className="h-1.5 flex-1" />
          <span className="w-10 text-right text-11 text-muted-foreground">
            {passedCriteria}/{totalCriteria}
          </span>
        </div>
        <span className="text-10 text-muted-foreground">
          {t('acceptanceDetail.tabs.criteria')}
        </span>
      </div>

      {/* 审计风险 */}
      {risk && riskLevel && (
        <div className="hidden w-20 shrink-0 items-center gap-1.5 sm:flex">
          <span className={cn('size-2 rounded-full', risk.dot)} />
          <span className={cn('text-xs font-medium', risk.color)}>
            {t(risk.labelKey)}
          </span>
        </div>
      )}

      {/* 成本 */}
      <div className="hidden w-14 shrink-0 text-right lg:block">
        {(acceptance.totalCost ?? 0) > 0 ? (
          <span className="text-xs text-muted-foreground">
            ${acceptance.totalCost!.toFixed(1)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </div>

      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
    </div>
  );
}

// 主页面
export function AcceptanceListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirmAction = useConfirm();
  const cardsVisible = usePersistentToggle('acceptance-list.stats');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AcceptanceStatus | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState<AuditRisk | 'all'>('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toolbar = useToolbarViews({
    key: 'acceptance-list',
    defaults: [
      {
        id: 'all',
        name: t('common.all'),
        icon: 'check',
        builtIn: true,
        snapshot: { search: '', status: 'all', risk: 'all', viewMode: 'list' },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string;
        status: AcceptanceStatus | 'all';
        risk: AuditRisk | 'all';
        viewMode: ViewMode;
      }>;
      setSearch(snap.search ?? '');
      setStatusFilter(snap.status ?? 'all');
      setRiskFilter(snap.risk ?? 'all');
      setViewMode(snap.viewMode ?? 'list');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilter, risk: riskFilter, viewMode });
  }, [updateActiveSnapshot, search, statusFilter, riskFilter, viewMode]);

  // 服务端筛选：status + 分页；risk/search 为当前页客户端过滤
  const { data: pageData, isLoading } = useAcceptanceList({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    pageSize: 20,
  });

  const acceptances: Acceptance[] = pageData?.items ?? [];
  const meta = pageData?.meta;

  const filteredAcceptances = acceptances.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !(a.title?.toLowerCase().includes(q) ?? false) &&
        !(a.task?.title?.toLowerCase().includes(q) ?? false)
      )
        return false;
    }
    if (riskFilter !== 'all' && a.auditReport?.riskLevel !== riskFilter) return false;
    return true;
  });

  const handleStatusChange = (value: AcceptanceStatus | 'all') => {
    setStatusFilter(value);
    setPage(1);
  };

  // 批量删除（并行调用单删端点，完成后统一刷新）
  const handleBulkDelete = async (
    selected: Acceptance[],
    clear: () => void,
  ) => {
    const ok = await confirmAction({
      title: t('common.deleteConfirm'),
      variant: 'destructive',
    });
    if (!ok) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        selected.map((a) => acceptanceApi.remove(a.id)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.warning(`${selected.length - failed} 已删除 · ${failed} 失败`);
      } else {
        toast.success(`${selected.length} 已删除`);
      }
    } finally {
      setBulkDeleting(false);
      clear();
      qc.invalidateQueries({ queryKey: ['acceptance'] });
    }
  };

  // ── 表格视图列定义（客户端排序 = 当前页内排序） ──────────────
  const columns = useMemo<ColumnDef<Acceptance, unknown>[]>(
    () => [
      {
        accessorKey: 'status',
        header: t('acceptance.filter.status'),
        size: 110,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorFn: (a) => a.title ?? '',
        id: 'title',
        header: t('acceptance.form.name'),
        cell: ({ row }) => (
          <span className="flex max-w-60 items-center gap-1.5 truncate">
            <span className="truncate">{row.original.title || t('acceptance.title')}</span>
            {isActiveAcceptance(row.original) && (
              <Badge variant="secondary" className="shrink-0 text-10">
                {t('acceptance.activeBadge')}
              </Badge>
            )}
          </span>
        ),
      },
      {
        accessorFn: (a) => a.task?.title ?? '',
        id: 'task',
        header: t('acceptanceDetail.props.task'),
        cell: ({ row }) => (
          <span className="flex max-w-44 flex-col truncate">
            <span className="truncate">{row.original.task?.title ?? '—'}</span>
            {row.original.task?.project?.name && (
              <span className="truncate text-10 text-muted-foreground">
                {row.original.task.project.name}
              </span>
            )}
          </span>
        ),
      },
      {
        accessorKey: 'completionType',
        header: t('acceptanceDetail.props.completionType'),
        size: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {t(`acceptance.completionType.${row.original.completionType}`)}
          </span>
        ),
      },
      {
        id: 'criteria',
        header: t('acceptanceDetail.tabs.criteria'),
        accessorFn: (a) =>
          a.criteria?.filter((c) => c.status === 'passed').length ?? 0,
        cell: ({ row }) => {
          const criteria = row.original.criteria ?? [];
          const passed = criteria.filter((c) => c.status === 'passed').length;
          return (
            <span className="flex items-center gap-2 tabular-nums">
              <Progress
                value={criteria.length ? (passed / criteria.length) * 100 : 0}
                className="h-1.5 w-14"
              />
              <span className="text-xs text-muted-foreground">
                {passed}/{criteria.length}
              </span>
            </span>
          );
        },
      },
      {
        accessorFn: (a) => a.auditReport?.riskLevel ?? '',
        id: 'risk',
        header: t('acceptance.filter.risk'),
        size: 110,
        cell: ({ row }) => {
          const risk = row.original.auditReport?.riskLevel as AuditRisk | undefined;
          if (!risk) return <span className="text-xs text-muted-foreground/40">—</span>;
          const cfg = RISK_CONFIG[risk];
          return (
            <span className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', cfg.dot)} />
              <span className={cn('text-xs font-medium', cfg.color)}>{t(cfg.labelKey)}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'totalCost',
        header: t('acceptanceDetail.props.cost'),
        size: 90,
        cell: ({ row }) => (
          <span className="tabular-nums text-xs text-muted-foreground">
            {(row.original.totalCost ?? 0) > 0
              ? `$${row.original.totalCost!.toFixed(1)}`
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('acceptanceDetail.props.createdAt'),
        size: 110,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleDateString()
              : '—'}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <PageShell>
      <PageHeader
        title={t('acceptance.title')}
        icon={ShieldCheck}
        iconColor="text-accent-green"
        metrics={[
          { id: 'total', label: t('acceptance.title'), value: meta?.total ?? 0 },
        ]}
        actions={
          <>
            <QuickCardsToggle
              visible={cardsVisible.visible}
              onToggle={cardsVisible.toggle}
              aiId="acceptance.acceptance-list.stats-toggle"
            />
            <HeaderActionButton
              icon={Plus}
              label={t('acceptance.new')}
              onClick={() => setShowCreateDialog(true)}
              data-ai-component="acceptance.acceptance-list.new-button"
              data-ai-action="acceptance.acceptance-list.new-button.click"
              data-ai-role="submit"
            />
          </>
        }
      />

      <AcceptanceFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(id) => navigate(`/app/acceptance/${id}`)}
      />

      <ToolbarRow
        aiId="acceptance.acceptance-list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{
          value: viewMode,
          onChange: (v) => setViewMode(v as ViewMode),
          options: [
            { value: 'list', label: t('acceptance.view.list'), icon: Rows3 },
            { value: 'table', label: t('acceptance.view.table'), icon: Table2 },
          ],
        }}
        filterMenu={{
          badge: [statusFilter !== 'all', riskFilter !== 'all', !!search].filter(
            Boolean,
          ).length,
          search: {
            value: search,
            onChange: setSearch,
            placeholder: t('acceptance.searchPlaceholder'),
          },
          items: [
            { type: 'label', label: t('acceptance.filter.status') },
            ...(['all', ...STATUS_ORDER] as const).map((value) => ({
              id: `status-${value}`,
              type: 'checkbox' as const,
              label:
                value === 'all'
                  ? t('common.all')
                  : t(STATUS_CONFIG[value as AcceptanceStatus].labelKey),
              checked: statusFilter === value,
              onSelect: () => handleStatusChange(value),
            })),
            { type: 'separator' },
            { type: 'label', label: t('acceptance.filter.risk') },
            ...(['all', 'red', 'yellow', 'green'] as const).map((value) => ({
              id: `risk-${value}`,
              type: 'checkbox' as const,
              label:
                value === 'all'
                  ? t('common.all')
                  : t(RISK_CONFIG[value as AuditRisk].labelKey),
              checked: riskFilter === value,
              onSelect: () => setRiskFilter(value),
            })),
          ],
        }}
        displayMenu={false}
        downloadMenu={false}
      />

      <div className="mx-auto w-full max-w-screen-xl space-y-5 p-6">
        {/* KPI + 概览卡（页头切换） */}
        {cardsVisible.visible ? (
          isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <>
              <KPIStats acceptances={acceptances} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <StatusDistributionCard acceptances={acceptances} />
                <AuditRiskCard
                  acceptances={acceptances}
                  onShowBlocking={() => setRiskFilter('red')}
                />
              </div>
            </>
          )
        ) : null}

        {/* 结果计数 + 分页（table 视图 footer 自带，仅卡片视图显示） */}
        {viewMode === 'list' && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('acceptance.results', { count: filteredAcceptances.length })}</span>
            {meta && meta.totalPages > 1 && (
              <span className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {t('acceptance.pagination.page', {
                  page: meta.page,
                  totalPages: meta.totalPages,
                  total: meta.total,
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </span>
            )}
          </div>
        )}

        {/* 列表：卡片 / 表格双视图 */}
        {viewMode === 'table' ? (
          isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <DataTable<Acceptance>
              columns={columns}
              data={filteredAcceptances}
              getRowId={(a) => a.id}
              onRowClick={(a) => navigate(`/app/acceptance/${a.id}`)}
              enableSelection
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              selectionActions={(selected, clear) => (
                <ListActionButton
                  onClick={() => handleBulkDelete(selected, clear)}
                  disabled={bulkDeleting}
                  className="text-destructive hover:text-destructive"
                >
                  {t('common.delete')}
                </ListActionButton>
              )}
              manualPagination={
                meta
                  ? {
                      page,
                      pageSize: meta.pageSize,
                      total: meta.total,
                      onPageChange: setPage,
                    }
                  : undefined
              }
              emptyContent={
                <div className="flex flex-col items-center py-8 text-center">
                  <ShieldCheck className="mb-2 size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{t('acceptance.empty')}</p>
                </div>
              }
            />
          )
        ) : (
          <div className="space-y-2">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : filteredAcceptances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ShieldCheck className="mb-3 size-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{t('acceptance.empty')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('acceptance.emptyHint')}
                </p>
              </div>
            ) : (
              filteredAcceptances.map((ac) => (
                <AcceptanceRow
                  key={ac.id}
                  acceptance={ac}
                  onClick={() => navigate(`/app/acceptance/${ac.id}`)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
