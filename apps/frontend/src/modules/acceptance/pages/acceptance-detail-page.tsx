/**
 * 验收详情页 — 按 detail 模板骨架
 * 主区：状态标题区 + 审计横幅 + Tabs（验收标准 / 审计报告 / 执行历史）
 * 右栏：操作组（删除）+ 属性卡 + 完成证据卡
 * 闭环动作：标准逐项判定（自动落证据）/ 运行审计 / 接收（聚合校验）/ 驳回 / 豁免
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  XCircle,
  Circle,
  Ban,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Plus,
  FileCode,
  FileText,
  GitPullRequest,
  Package,
  Link2,
  DollarSign,
  Coins,
  ListChecks,
  Flag,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import {
  RightSidebar,
  SidebarButton,
  SidebarButtonGroup,
} from '@/components/ui/right-sidebar';
import { PropsCard, PropertyRow } from '@/components/ui/property-panel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import {
  useAcceptanceDetail,
  useAudit,
  useApplySuggestions,
  useUpdateCriterion,
  useAddCriterion,
  useDeleteCriterion,
  useAcceptCompletion,
  useRejectCompletion,
  useWaiveCompletion,
} from '../hooks/use-acceptance';
import { AuditReportPanel } from '../components/audit-report-panel';
import {
  extractFailures,
  isActiveAcceptance,
  type AcceptanceFailure,
  type AcceptanceStatus,
  type CompletionType,
  type CriterionStatus,
} from '../api/acceptance-api';

const STATUS_TONE: Record<AcceptanceStatus, string> = {
  draft: 'text-muted-foreground border-border',
  pending: 'text-muted-foreground border-border',
  in_review: 'text-accent-blue border-accent-blue/40',
  passed: 'text-accent-green border-accent-green/40',
  failed: 'text-accent-red border-accent-red/40',
  waived: 'text-muted-foreground border-border',
};

const TYPE_ICON: Record<CompletionType, typeof GitPullRequest> = {
  pr: GitPullRequest,
  test_report: FileCode,
  document: FileText,
  artifact: Package,
};

const CRITERION_ICON: Record<CriterionStatus, typeof Circle> = {
  pending: Circle,
  passed: CheckCircle2,
  failed: XCircle,
  blocked: Ban,
};

const CRITERION_TONE: Record<CriterionStatus, string> = {
  pending: 'text-muted-foreground',
  passed: 'text-accent-green',
  failed: 'text-accent-red',
  blocked: 'text-accent-yellow',
};

/** 判定循环：待判定 → 已通过 → 未通过 → 待判定 */
function nextCriterionStatus(s: CriterionStatus): CriterionStatus {
  if (s === 'pending' || s === 'blocked') return 'passed';
  if (s === 'passed') return 'failed';
  return 'pending';
}

export function AcceptanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const confirmAction = useConfirm();

  const { data: acceptance, isLoading } = useAcceptanceDetail(id);
  const auditMutation = useAudit(id!);
  const applySuggestionsMutation = useApplySuggestions(id!);
  const updateCriterion = useUpdateCriterion();
  const addCriterion = useAddCriterion();
  const deleteCriterion = useDeleteCriterion();
  const acceptCompletion = useAcceptCompletion();
  const rejectCompletion = useRejectCompletion();
  const waiveCompletion = useWaiveCompletion();

  // 交互态：驳回/豁免弹窗、接收失败清单、添加标准行
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showWaiveDialog, setShowWaiveDialog] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');
  const [acceptFailures, setAcceptFailures] = useState<AcceptanceFailure[] | null>(null);
  const [addType, setAddType] = useState<'functional' | 'technical'>('functional');
  const [addContent, setAddContent] = useState('');

  if (isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-screen-lg space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </PageShell>
    );
  }

  if (!acceptance) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('acceptanceDetail.notFound')}
        </div>
      </PageShell>
    );
  }

  // 数据直接派生（修复原本地 state 初始化 bug）
  const criteria = acceptance.criteria ?? [];
  const functionalCriteria = criteria.filter((c) => c.criteriaType === 'functional');
  const technicalCriteria = criteria.filter((c) => c.criteriaType === 'technical');
  const passedCount = criteria.filter((c) => c.status === 'passed').length;
  const blockingCount = criteria.filter(
    (c) =>
      (c.severity === 'critical' || c.severity === 'high') &&
      (c.status === 'pending' || c.status === 'failed'),
  ).length;
  const progressPct = criteria.length > 0 ? Math.round((passedCount / criteria.length) * 100) : 0;

  const auditReport = acceptance.auditReport ?? null;
  const blockedCount = auditReport?.blockedItems?.length ?? 0;
  const suggestedCount = auditReport?.suggestedItems?.length ?? 0;

  const TypeIcon = TYPE_ICON[acceptance.completionType];
  const canReview = acceptance.status === 'in_review' || acceptance.status === 'pending';
  const active = isActiveAcceptance(acceptance);

  // ── 闭环动作 ─────────────────────────────────────────────
  const handleToggleCriterion = (criterionId: string, current: CriterionStatus) => {
    if (!id) return;
    updateCriterion.mutate({
      criteriaId: criterionId,
      acceptanceId: id,
      data: { status: nextCriterionStatus(current) },
    });
  };

  const handleDeleteCriterion = async (criterion: string) => {
    if (!id) return;
    const ok = await confirmAction({ title: t('acceptanceDetail.criteria.deleteConfirm') });
    if (!ok) return;
    deleteCriterion.mutate({ criteriaId: criterion, acceptanceId: id });
  };

  const handleAddCriterion = () => {
    if (!id || !addContent.trim()) return;
    addCriterion.mutate(
      { acceptanceId: id, dto: { criteriaType: addType, content: addContent.trim() } },
      { onSuccess: () => setAddContent('') },
    );
  };

  const handleAccept = async () => {
    if (!id || !acceptance.taskId) return;
    const ok = await confirmAction({ title: t('acceptanceDetail.actions.approveConfirm') });
    if (!ok) return;
    setAcceptFailures(null);
    try {
      await acceptCompletion.mutateAsync({ id, taskId: acceptance.taskId });
      toast.success(t('acceptanceDetail.actions.acceptedToast'));
    } catch (err) {
      const failures = extractFailures(err);
      if (failures) setAcceptFailures(failures);
      else toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleReject = async () => {
    if (!id || !acceptance.taskId || !rejectReason.trim()) return;
    try {
      await rejectCompletion.mutateAsync({
        id,
        reason: rejectReason.trim(),
        taskId: acceptance.taskId,
      });
      toast.success(t('acceptanceDetail.actions.rejectedToast'));
      setShowRejectDialog(false);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleWaive = async () => {
    if (!id || !acceptance.taskId || !waiveReason.trim()) return;
    try {
      await waiveCompletion.mutateAsync({
        id,
        reason: waiveReason.trim(),
        taskId: acceptance.taskId,
      });
      toast.success(t('acceptanceDetail.actions.waivedToast'));
      setShowWaiveDialog(false);
      setWaiveReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteAcceptance = async () => {
    if (!id) return;
    const ok = await confirmAction({
      title: t('acceptanceDetail.delete.title'),
      description: t('acceptanceDetail.delete.confirm'),
      variant: 'destructive',
    });
    if (!ok) return;
    const { acceptanceApi } = await import('../api/acceptance-api');
    await acceptanceApi.remove(id);
    navigate('/app/acceptance');
  };

  const renderCriterionGroup = (
    title: string,
    items: typeof criteria,
    emptyText: string,
  ) => (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <span className="text-10 text-muted-foreground">
          {t('acceptanceDetail.criteria.progress', {
            passed: items.filter((c) => c.status === 'passed').length,
            total: items.length,
          })}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((c) => {
          const Icon = CRITERION_ICON[c.status] ?? Circle;
          return (
            <div
              key={c.id}
              className={cn(
                'group rounded-lg border transition-colors',
                c.status === 'passed'
                  ? 'border-accent-green/30 bg-accent-green/5'
                  : c.status === 'failed'
                    ? 'border-accent-red/30 bg-accent-red/5'
                    : 'bg-card',
              )}
            >
              <div className="flex items-start gap-3 p-3">
                <button
                  className="mt-0.5 shrink-0"
                  title={t('acceptanceDetail.criteria.toggleHint')}
                  onClick={() => handleToggleCriterion(c.id, c.status)}
                  disabled={updateCriterion.isPending}
                >
                  <Icon
                    className={cn(
                      'size-4 transition-colors hover:opacity-70',
                      CRITERION_TONE[c.status] ?? 'text-muted-foreground',
                    )}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{c.content}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-10 text-muted-foreground">
                    <Badge variant="outline" className="text-10 py-0">
                      {t(`acceptance.severity.${c.severity}`, c.severity)}
                    </Badge>
                    <span>{t(`acceptance.criterionStatus.${c.status}`, c.status)}</span>
                    {c.evidences && c.evidences.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        <ShieldCheck className="size-3" />
                        {c.evidences.length}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-red"
                  onClick={() => handleDeleteCriterion(c.id)}
                  title={t('common.delete')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  );

  return (
    <PageShell aiPage="acceptance.acceptance-detail" className="overflow-hidden">
      <SubPageToolbar
        aiId="acceptance.acceptance-detail"
        onBack={() => navigate('/app/acceptance')}
        breadcrumbs={[
          { label: t('acceptance.title'), to: '/app/acceptance' },
          { label: acceptance.title || t('acceptance.title') },
        ]}
        actions={
          <>
            <FavoriteToggle label={acceptance.title || t('acceptance.title')} />
            {active && (
              <>
                <HeaderActionButton
                  variant="primary"
                  icon={ThumbsUp}
                  label={t('acceptanceDetail.actions.approve')}
                  onClick={handleAccept}
                />
                {canReview && (
                  <HeaderActionButton
                    variant="danger"
                    icon={ThumbsDown}
                    label={t('acceptanceDetail.actions.reject')}
                    onClick={() => setShowRejectDialog(true)}
                  />
                )}
                <HeaderActionButton
                  icon={Ban}
                  label={t('acceptanceDetail.actions.waive')}
                  onClick={() => setShowWaiveDialog(true)}
                />
              </>
            )}
          </>
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 主区 */}
        <div className="flex flex-1 min-w-0 flex-col overflow-y-auto">
          {/* 接收失败清单（聚合校验逐条展示） */}
          {acceptFailures && (
            <div className="mx-6 mt-3 rounded-lg border border-accent-red/40 bg-accent-red/10 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-accent-red">
                  <AlertTriangle className="size-4" />
                  {t('acceptanceDetail.actions.blockedTitle')}
                </span>
                <button onClick={() => setAcceptFailures(null)}>
                  <X className="size-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <ul className="mt-2 space-y-1">
                {acceptFailures.map((f, i) => (
                  <li key={i} className="text-xs text-foreground/80">
                    <span className="mr-1.5 font-mono text-10 text-muted-foreground">
                      [{f.check}]
                    </span>
                    {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 标题区 */}
          <div className="shrink-0 border-b px-6 pb-3 pt-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-6 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold leading-tight">
                  {acceptance.title || t('acceptance.title')}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className={STATUS_TONE[acceptance.status]}>
                    {t(`acceptance.status.${acceptance.status}`)}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <TypeIcon className="size-3.5" />
                    {t(`acceptance.completionType.${acceptance.completionType}`)}
                  </span>
                  {acceptance.task && (
                    <Link
                      to={`/app/tasks/${acceptance.taskId}`}
                      className="flex items-center gap-1 hover:text-foreground hover:underline"
                    >
                      <Link2 className="size-3.5" />
                      {acceptance.task.title}
                    </Link>
                  )}
                  {active && (
                    <Badge variant="secondary" className="text-10">
                      {t('acceptance.activeBadge')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {/* 进度条 */}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-accent-green transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {t('acceptanceDetail.criteria.progress', {
                  passed: passedCount,
                  total: criteria.length,
                })}
              </span>
            </div>
          </div>

          {/* 审计横幅（与接收红牌规则对齐） */}
          {auditReport && (blockedCount > 0 || suggestedCount > 0) && (
            <div
              className={cn(
                'mx-6 mt-3 flex items-center gap-3 rounded-lg border p-3',
                blockedCount > 0
                  ? 'border-accent-red/40 bg-accent-red/10'
                  : 'border-accent-yellow/30 bg-accent-yellow/10',
              )}
            >
              <AlertTriangle
                className={cn(
                  'size-4 shrink-0',
                  blockedCount > 0 ? 'text-accent-red' : 'text-accent-yellow',
                )}
              />
              <p className="flex-1 text-sm">
                {blockedCount > 0
                  ? t('acceptanceDetail.audit.bannerBlocked', { count: blockedCount })
                  : t('acceptanceDetail.audit.bannerWarn', { count: suggestedCount })}
              </p>
            </div>
          )}
          {/* 接收门禁提示：critical/high 标准未通过 */}
          {blockingCount > 0 && active && (
            <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <Flag className="size-3.5 shrink-0" />
              {t('acceptanceDetail.criteria.severityBlocked')}（{blockingCount}）
            </div>
          )}

          {/* Tabs */}
          <div className="px-6 pb-6 pt-4">
            <Tabs defaultValue="criteria">
              <TabsList className="h-8 text-xs">
                <TabsTrigger value="criteria" className="text-xs">
                  {t('acceptanceDetail.tabs.criteria')}
                  <span className="ml-1.5 rounded-md bg-muted px-1 text-10">{criteria.length}</span>
                </TabsTrigger>
                <TabsTrigger value="audit" className="text-xs">
                  {t('acceptanceDetail.tabs.audit')}
                  {(blockedCount > 0 || suggestedCount > 0) && (
                    <span
                      className={cn(
                        'ml-1.5 rounded px-1 text-10',
                        blockedCount > 0
                          ? 'bg-accent-red/20 text-accent-red'
                          : 'bg-accent-yellow/20 text-accent-yellow',
                      )}
                    >
                      {blockedCount + suggestedCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="executions" className="text-xs">
                  {t('acceptanceDetail.tabs.executions')}
                  <span className="ml-1.5 rounded-md bg-muted px-1 text-10">
                    {acceptance.executions?.length ?? 0}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* 验收标准 */}
              <TabsContent value="criteria" className="mt-4 space-y-5">
                {renderCriterionGroup(
                  t('acceptanceDetail.criteria.functional'),
                  functionalCriteria,
                  t('acceptanceDetail.criteria.emptyFunctional'),
                )}
                {renderCriterionGroup(
                  t('acceptanceDetail.criteria.technical'),
                  technicalCriteria,
                  t('acceptanceDetail.criteria.emptyTechnical'),
                )}

                {/* 内联添加 */}
                <div className="flex items-center gap-2">
                  <div className="flex overflow-hidden rounded-md border">
                    {(['functional', 'technical'] as const).map((ty) => (
                      <button
                        key={ty}
                        className={cn(
                          'px-2.5 py-1.5 text-xs transition-colors',
                          addType === ty
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent',
                        )}
                        onClick={() => setAddType(ty)}
                      >
                        {t(`acceptanceDetail.criteria.${ty === 'functional' ? 'functional' : 'technical'}`)}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={addContent}
                    onChange={(e) => setAddContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
                    placeholder={t('acceptanceDetail.criteria.addPlaceholder')}
                    className="h-8 text-sm"
                    disabled={addCriterion.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={handleAddCriterion}
                    disabled={!addContent.trim() || addCriterion.isPending}
                  >
                    <Plus className="mr-1 size-3.5" />
                    {t('acceptanceDetail.criteria.add')}
                  </Button>
                </div>
              </TabsContent>

              {/* 审计报告 */}
              <TabsContent value="audit" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{t('acceptanceDetail.audit.title')}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('acceptanceDetail.audit.lastRun')}:{' '}
                      {auditReport
                        ? new Date(auditReport.auditDate).toLocaleString()
                        : t('acceptanceDetail.audit.never')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => auditMutation.mutateAsync(undefined)}
                    disabled={auditMutation.isPending}
                  >
                    <Sparkles className="mr-1.5 size-3.5 text-primary" />
                    {auditMutation.isPending
                      ? '…'
                      : auditReport
                        ? t('acceptanceDetail.audit.rerun')
                        : t('acceptanceDetail.audit.run')}
                  </Button>
                </div>
                {auditReport ? (
                  <AuditReportPanel
                    report={auditReport}
                    onApplySuggestions={(itemIds) =>
                      applySuggestionsMutation.mutateAsync(itemIds)
                    }
                    loading={applySuggestionsMutation.isPending}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShieldCheck className="mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {t('acceptanceDetail.audit.empty')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('acceptanceDetail.audit.emptyHint')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => auditMutation.mutateAsync(undefined)}
                      disabled={auditMutation.isPending}
                    >
                      <Sparkles className="mr-1.5 size-3.5 text-primary" />
                      {t('acceptanceDetail.audit.run')}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* 执行历史（字段与服务端返回对齐） */}
              <TabsContent value="executions" className="mt-4">
                {acceptance.executions && acceptance.executions.length > 0 ? (
                  <>
                    <Card>
                      <CardContent className="divide-y divide-border p-2">
                        {acceptance.executions.map((e) => (
                          <div key={e.id} className="flex items-start gap-3 p-3 hover:bg-accent/40">
                            {e.status === 'completed' ? (
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-green" />
                            ) : e.status === 'failed' ? (
                              <XCircle className="mt-0.5 size-4 shrink-0 text-accent-red" />
                            ) : (
                              <Clock className="mt-0.5 size-4 shrink-0 text-accent-blue" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-xs font-medium">
                                  {e.goal || e.id}
                                </span>
                                <span className="text-10 text-muted-foreground">
                                  {e.createdAt
                                    ? new Date(e.createdAt).toLocaleString()
                                    : ''}
                                </span>
                                <span className="ml-auto flex items-center gap-2 text-10 text-muted-foreground">
                                  {typeof e.totalCost === 'number' && e.totalCost > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <DollarSign className="size-3" />
                                      {e.totalCost.toFixed(2)}
                                    </span>
                                  )}
                                  {typeof e.totalTokens === 'number' && e.totalTokens > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Coins className="size-3" />
                                      {e.totalTokens}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      {t('acceptanceDetail.executions.total', {
                        count: acceptance.executions.length,
                        cost: (acceptance.totalCost ?? 0).toFixed(2),
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {t('acceptanceDetail.executions.empty')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('acceptanceDetail.executions.emptyHint')}
                    </p>
                    {acceptance.taskId && (
                      <Link to={`/app/tasks/${acceptance.taskId}`}>
                        <Button variant="outline" size="sm" className="mt-3">
                          {t('acceptanceDetail.actions.dispatchTask')}
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* 右栏 */}
        <RightSidebar hidden={false} width={320}>
          <SidebarButtonGroup className="px-1">
            <SidebarButton
              icon={Trash2}
              label={t('common.delete')}
              onClick={handleDeleteAcceptance}
              className="text-destructive hover:text-destructive"
            />
          </SidebarButtonGroup>

          <PropsCard title={t('acceptanceDetail.props.title')} collapsed={propsCollapsed} onToggleCollapse={() => setPropsCollapsed((v) => !v)}>
            <PropertyRow
              icon={<Flag className="size-3.5" />}
              label={t('acceptanceDetail.props.status')}
            >
              <Badge variant="outline" className={STATUS_TONE[acceptance.status]}>
                {t(`acceptance.status.${acceptance.status}`)}
              </Badge>
            </PropertyRow>
            <PropertyRow
              icon={<TypeIcon className="size-3.5" />}
              label={t('acceptanceDetail.props.completionType')}
            >
              <span className="text-xs">
                {t(`acceptance.completionType.${acceptance.completionType}`)}
              </span>
            </PropertyRow>
            <PropertyRow
              icon={<Link2 className="size-3.5" />}
              label={t('acceptanceDetail.props.task')}
            >
              {acceptance.task ? (
                <Link
                  to={`/app/tasks/${acceptance.taskId}`}
                  className="text-xs hover:underline"
                >
                  {acceptance.task.title}
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">{acceptance.taskId}</span>
              )}
            </PropertyRow>
            <PropertyRow
              icon={<ListChecks className="size-3.5" />}
              label={t('acceptanceDetail.props.criteriaCount')}
            >
              <span className="text-xs">
                {t('acceptanceDetail.criteria.progress', {
                  passed: passedCount,
                  total: criteria.length,
                })}
              </span>
            </PropertyRow>
            <PropertyRow
              icon={<DollarSign className="size-3.5" />}
              label={t('acceptanceDetail.props.cost')}
            >
              <span className="text-xs">${(acceptance.totalCost ?? 0).toFixed(2)}</span>
            </PropertyRow>
            <PropertyRow
              icon={<Coins className="size-3.5" />}
              label={t('acceptanceDetail.props.tokens')}
            >
              <span className="text-xs">{acceptance.totalTokens ?? 0}</span>
            </PropertyRow>
          </PropsCard>

          {/* 时间线卡 */}
          <PropsCard title={t('acceptanceDetail.props.createdAt')} collapsed={propsCollapsed} onToggleCollapse={() => setPropsCollapsed((v) => !v)}>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>
                {acceptance.createdAt
                  ? new Date(acceptance.createdAt).toLocaleString()
                  : '—'}
              </p>
              {acceptance.completedAt && (
                <p className="text-accent-green">
                  {t('acceptanceDetail.props.completedAt')}:
                  {' '}
                  {new Date(acceptance.completedAt).toLocaleString()}
                </p>
              )}
              {acceptance.rejectedAt && (
                <p className="text-accent-red">
                  {t('acceptanceDetail.props.rejectedAt')}:
                  {' '}
                  {new Date(acceptance.rejectedAt).toLocaleString()}
                </p>
              )}
              {acceptance.waivedAt && (
                <p>
                  {t('acceptanceDetail.props.waivedAt')}:
                  {' '}
                  {new Date(acceptance.waivedAt).toLocaleString()}
                </p>
              )}
              {acceptance.rejectionReason && (
                <p className="text-accent-red">
                  {t('acceptanceDetail.props.rejectionReason')}: {acceptance.rejectionReason}
                </p>
              )}
              {acceptance.waiverReason && (
                <p>
                  {t('acceptanceDetail.props.waiverReason')}: {acceptance.waiverReason}
                </p>
              )}
            </div>
          </PropsCard>

          {/* 完成证据卡 */}
          <PropsCard title={t('acceptanceDetail.evidence.title')} collapsed={propsCollapsed} onToggleCollapse={() => setPropsCollapsed((v) => !v)}>
            {acceptance.completionEvidence ? (
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {acceptance.completionEvidence.artifacts &&
                  acceptance.completionEvidence.artifacts.length > 0 && (
                    <p>
                      {t('acceptanceDetail.evidence.artifacts', {
                        count: acceptance.completionEvidence.artifacts.length,
                      })}
                    </p>
                  )}
                {acceptance.completionEvidence.autoChecks && (
                  <p
                    className={
                      acceptance.completionEvidence.autoChecks.valid
                        ? 'text-accent-green'
                        : 'text-accent-red'
                    }
                  >
                    {acceptance.completionEvidence.autoChecks.valid
                      ? t('acceptanceDetail.evidence.autoChecks.valid')
                      : t('acceptanceDetail.evidence.autoChecks.invalid')}
                    {' '}({acceptance.completionEvidence.autoChecks.passed}/
                    {acceptance.completionEvidence.autoChecks.total})
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('acceptanceDetail.evidence.none')}
              </p>
            )}
          </PropsCard>
        </RightSidebar>
      </div>

      {/* 驳回弹窗 */}
      <Dialog
        open={showRejectDialog}
        onOpenChange={(o) => {
          if (!o) {
            setShowRejectDialog(false);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('acceptanceDetail.actions.rejectTitle')}</DialogTitle>
            <DialogDescription>{t('acceptanceDetail.actions.rejectDesc')}</DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('acceptanceDetail.actions.rejectPlaceholder')}
            className="min-h-25 w-full rounded-md border border-border bg-background p-2 text-sm outline-hidden focus:ring-1 focus:ring-primary"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectCompletion.isPending}
              onClick={handleReject}
            >
              {t('acceptanceDetail.actions.rejectConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 豁免弹窗 */}
      <Dialog
        open={showWaiveDialog}
        onOpenChange={(o) => {
          if (!o) {
            setShowWaiveDialog(false);
            setWaiveReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('acceptanceDetail.actions.waiveTitle')}</DialogTitle>
            <DialogDescription>{t('acceptanceDetail.actions.waiveDesc')}</DialogDescription>
          </DialogHeader>
          <textarea
            value={waiveReason}
            onChange={(e) => setWaiveReason(e.target.value)}
            placeholder={t('acceptanceDetail.actions.waivePlaceholder')}
            className="min-h-25 w-full rounded-md border border-border bg-background p-2 text-sm outline-hidden focus:ring-1 focus:ring-primary"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowWaiveDialog(false);
                setWaiveReason('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!waiveReason.trim() || waiveCompletion.isPending}
              onClick={handleWaive}
            >
              {t('acceptanceDetail.actions.waiveConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
