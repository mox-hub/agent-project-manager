/**
 * 发版前因后果关联区（CAP-K-03 详情页）。
 *
 * 链路：发版 ← 圈定任务（scope.issueIds）← 每任务实时验收状态 + 执行运行记录 + 成本。
 * 纯前端组合现成端点（issue 详情 / acceptance listByTask / execution runs?issueId=），
 * 无后端新契约；门禁卡是发版时快照、本区为实时重查，验收未全绿行内高亮呼应。
 * draft 态内联圈定范围（勾选项目任务 → useUpdateRelease({ scopeIssueIds })）。
 */
import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ListChecks,
  Pencil,
  ShieldCheck,
  SquareTerminal,
} from 'lucide-react';
import { api } from '@/infrastructure/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { toast } from '@/components/ui/toast';
import { taskApi, type Task } from '@/modules/issue/api/issue-api';
import { useProjectTasks } from '@/modules/issue/hooks/use-project-tasks';
import {
  acceptanceApi,
  type Acceptance,
} from '@/modules/acceptance/api/acceptance-api';
import { acceptanceKeys } from '@/modules/acceptance/hooks/use-acceptance';
import {
  executionKeys,
  type ExecutionRunRecord,
} from '@/modules/executions/api/execution-api';
import { RunDetailsDialog } from '@/modules/executions/components/run-details-dialog';
import { RunStatusBadge } from '@/modules/executions/components/run-status';
import {
  formatCost,
  formatRunDuration,
} from '@/modules/executions/components/run-details-format';
import { getEntityIcon } from '@/shared/entity-icons/entity-icons';
import { TONE_TEXT_CLASS } from '@/shared/status/status-visuals';
import { useStatuses } from '@/modules/core-config/hooks/use-metadata';
import { cn } from '@/lib/utils';
import { useUpdateRelease } from '../hooks/use-releases';
import type { ReleaseRecord } from '../api/release-api';

interface TraceRowData {
  issueId: string;
  issue?: Task;
  acceptances: Acceptance[];
  runs: ExecutionRunRecord[];
  loading: boolean;
}

export function ReleaseTraceSection({ release }: { release: ReleaseRecord }) {
  const { t } = useTranslation();
  const scopeIds = useMemo(
    () => release.scope?.issueIds ?? [],
    [release.scope?.issueIds],
  );
  const isDraft = release.status === 'draft';

  // 三路并行：issue 详情 / 每任务验收（实时）/ 每任务执行运行记录
  const issueQueries = useQueries({
    queries: scopeIds.map((issueId) => ({
      queryKey: ['task', issueId],
      queryFn: () => taskApi.getDetail(issueId),
      staleTime: 60_000,
    })),
  });
  const acceptanceQueries = useQueries({
    queries: scopeIds.map((issueId) => ({
      queryKey: acceptanceKeys.byTask(issueId),
      queryFn: () => acceptanceApi.listByTask(issueId),
      staleTime: 60_000,
    })),
  });
  const runQueries = useQueries({
    queries: scopeIds.map((issueId) => ({
      // 与 useExecutionRuns 同 key 结构，命中执行记录页已有缓存
      queryKey: executionKeys.runs({ issueId, limit: 50 }),
      queryFn: () =>
        api.get<{ runs?: ExecutionRunRecord[]; total?: number }>('/execution/runs', {
          issueId,
          limit: 50,
        }),
      staleTime: 60_000,
    })),
  });

  const rows: TraceRowData[] = scopeIds.map((issueId, i) => ({
    issueId,
    issue: issueQueries[i].data,
    acceptances: acceptanceQueries[i].data ?? [],
    runs: runQueries[i].data?.runs ?? [],
    loading: issueQueries[i].isLoading,
  }));

  const summary = useMemo(() => {
    let acceptancePassed = 0;
    let acceptanceTotal = 0;
    let runTotal = 0;
    let cost = 0;
    rows.forEach(({ acceptances, runs }) => {
      acceptances.forEach((a) => {
        acceptanceTotal += 1;
        if (a.status === 'passed') acceptancePassed += 1;
      });
      runTotal += runs.length;
      cost += runs.reduce((s, r) => s + (r.totalCost ?? 0), 0);
    });
    return { acceptancePassed, acceptanceTotal, runTotal, cost };
  }, [rows]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [detailRunId, setDetailRunId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ListChecks className="size-4 text-accent-blue" />
            {t('release.trace.title')}
          </CardTitle>
          {scopeIds.length > 0 ? (
            <p className="text-xs text-content-text-muted">
              {t('release.trace.summary', {
                issues: scopeIds.length,
                passed: summary.acceptancePassed,
                total: summary.acceptanceTotal,
                runs: summary.runTotal,
                cost: formatCost(summary.cost) ?? '$0.00',
              })}
            </p>
          ) : null}
        </div>
        {isDraft ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="mr-1 size-3" />
            {editing ? t('release.trace.closeEditor') : t('release.trace.editScope')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {editing && isDraft ? (
          <ScopeEditor release={release} onDone={() => setEditing(false)} />
        ) : null}

        {scopeIds.length === 0 && !editing ? (
          <EmptyState
            icon={ListChecks}
            title={t('release.trace.emptyTitle')}
            description={
              isDraft
                ? t('release.trace.emptyDraftDesc')
                : t('release.trace.emptyFixedDesc')
            }
            action={
              isDraft ? (
                <Button size="sm" onClick={() => setEditing(true)}>
                  {t('release.trace.editScope')}
                </Button>
              ) : undefined
            }
          />
        ) : scopeIds.length === 0 ? null : (
          rows.map((row) => (
            <TraceIssueRow
              key={row.issueId}
              row={row}
              expanded={expandedId === row.issueId}
              onToggle={() =>
                setExpandedId(expandedId === row.issueId ? null : row.issueId)
              }
              onOpenRun={(runId) => setDetailRunId(runId)}
            />
          ))
        )}
      </CardContent>

      <RunDetailsDialog
        runId={detailRunId}
        open={!!detailRunId}
        onOpenChange={(open) => {
          if (!open) setDetailRunId(null);
        }}
      />
      {/* 验收单跳转走行内 Link / 任务跳转走展开区 Link，无需额外状态 */}
    </Card>
  );
}

/** 单任务链路行：可展开显示验收单与执行运行记录两段子列表 */
function TraceIssueRow({
  row,
  expanded,
  onToggle,
  onOpenRun,
}: {
  row: TraceRowData;
  expanded: boolean;
  onToggle: () => void;
  onOpenRun: (runId: string) => void;
}) {
  const { t } = useTranslation();
  const issue = row.issue;
  const isBug = issue?.type === 'bug';
  const entity = getEntityIcon(isBug ? 'bug' : 'issue');
  const Icon = entity.icon;
  const detailHref = isBug ? `/app/bugs/${row.issueId}` : `/app/issues/${row.issueId}`;

  const passed = row.acceptances.filter((a) => a.status === 'passed').length;
  const hasFailed = row.acceptances.some((a) => a.status === 'failed');
  const acceptanceTone = hasFailed
    ? 'danger'
    : row.acceptances.length === 0
      ? 'default'
      : passed === row.acceptances.length
        ? 'success'
        : 'warning';
  const runCost = row.runs.reduce((s, r) => s + (r.totalCost ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent/20"
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <Icon className={cn('size-4 shrink-0', TONE_TEXT_CLASS[entity.tone])} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {issue?.title ?? row.issueId}
        </span>
        <StatusPill tone={acceptanceTone} className="shrink-0">
          <ShieldCheck className="size-3" />
          {row.acceptances.length === 0
            ? t('release.trace.noAcceptance')
            : t('release.trace.acceptanceRatio', { passed, total: row.acceptances.length })}
        </StatusPill>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <SquareTerminal className="size-3" />
          {t('release.trace.runCount', { count: row.runs.length })}
        </span>
        {runCost > 0 ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatCost(runCost)}
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-border bg-muted/20 px-3 py-3">
          {row.loading ? (
            <Skeleton className="h-6 w-2/3" />
          ) : (
            <>
              {/* 验收单段 */}
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-10 font-medium uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="size-3" />
                  {t('release.trace.acceptanceSection')}
                </p>
                {row.acceptances.length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground">
                    {t('release.trace.noAcceptanceDesc')}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {row.acceptances.map((a) => (
                      <li key={a.id}>
                        <Link
                          to={`/app/acceptance/${a.id}`}
                          className="flex items-center gap-2 rounded-md px-1 py-1 text-xs transition-colors hover:bg-accent/20"
                        >
                          <AcceptanceStatusPill status={a.status} />
                          <span className="min-w-0 flex-1 truncate">
                            {a.title || t('release.trace.unnamedAcceptance')}
                          </span>
                          {a.auditReport?.riskLevel ? (
                            <Badge variant="secondary" className="text-10">
                              {a.auditReport.riskLevel}
                            </Badge>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* 执行运行记录段 */}
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-10 font-medium uppercase tracking-wider text-muted-foreground">
                  <SquareTerminal className="size-3" />
                  {t('release.trace.runSection')}
                </p>
                {row.runs.length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground">
                    {t('release.trace.noRunsDesc')}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {row.runs.map((run) => {
                      const duration = formatRunDuration(run);
                      return (
                        <li key={run.id}>
                          <button
                            type="button"
                            onClick={() => onOpenRun(run.id)}
                            className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-xs transition-colors hover:bg-accent/20"
                          >
                            <RunStatusBadge status={run.status} />
                            <span className="min-w-0 flex-1 truncate">{run.goal}</span>
                            {duration ? (
                              <span className="shrink-0 text-11 text-muted-foreground">{duration}</span>
                            ) : null}
                            {run.totalCost ? (
                              <span className="shrink-0 text-11 text-muted-foreground">
                                {formatCost(run.totalCost)}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="pt-0.5">
                <Link
                  to={detailHref}
                  className="text-xs text-accent-blue hover:underline"
                >
                  {t('release.trace.openIssue')} →
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

const ACCEPTANCE_TONE: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default',
  pending: 'warning',
  in_review: 'info',
  passed: 'success',
  failed: 'danger',
  waived: 'default',
};

function AcceptanceStatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <StatusPill tone={ACCEPTANCE_TONE[status] ?? 'default'} className="shrink-0">
      {t(`acceptance.status.${status}`, status)}
    </StatusPill>
  );
}

/** draft 态范围圈定编辑器：项目任务 checkbox 列表 + 保存 scopeIssueIds */
function ScopeEditor({
  release,
  onDone,
}: {
  release: ReleaseRecord;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const initialIds = useMemo(
    () => new Set(release.scope?.issueIds ?? []),
    [release.scope?.issueIds],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialIds));
  const { data, isLoading } = useProjectTasks(release.projectId, { pageSize: 200 });
  const tasks = data?.data ?? [];
  const update = useUpdateRelease(release.id);
  // 状态显示名走 StatusDefinition 动态解析（六站体系状态键可自定义，静态 i18n 键必有缺口）
  const { data: statusDefs } = useStatuses();
  const statusNameOf = (key: string) =>
    statusDefs?.find((s) => s.key === key)?.name ?? t(`task.status.${key}`, key);

  const dirty = useMemo(() => {
    if (selected.size !== initialIds.size) return true;
    for (const id of selected) if (!initialIds.has(id)) return true;
    return false;
  }, [selected, initialIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () => {
    update.mutate(
      { scopeIssueIds: [...selected] },
      {
        onSuccess: () => {
          toast.success(t('release.trace.scopeSaved'));
          onDone();
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div className="rounded-lg border border-border">
      <p className="border-b border-border px-3 py-2 text-xs font-medium text-content-text">
        {t('release.trace.scopeEditorTitle')}
      </p>
      {/* max-h 必须落在 viewport 上：根容器高度不定时 h-full 百分比失效，
          viewport 会被内容撑高溢出根容器，压住底栏且无从滚动 */}
      <ScrollArea className="[&_[data-slot=scroll-area-viewport]]:max-h-64">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            {t('release.trace.noProjectTasks')}
          </p>
        ) : (
          tasks.map((task) => (
            <label
              key={task.id}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-accent/10"
            >
              <Checkbox
                checked={selected.has(task.id)}
                onCheckedChange={() => toggle(task.id)}
              />
              <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {statusNameOf(task.status)}
              </span>
            </label>
          ))
        )}
      </ScrollArea>
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {t('release.trace.selectedCount', { count: selected.size })}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onDone}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!dirty || update.isPending}
            onClick={save}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
