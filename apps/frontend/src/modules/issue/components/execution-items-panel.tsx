/**
 * ExecutionItemsPanel - issue 统一执行项区块（4d）
 *
 * 人工/AI 共用执行单位：列表（标题 + 主体图标 + 状态徽标 + 工时）
 * + 添加人工执行项小表单 + 行内状态流转（draft→planned→in_progress→pending_approval→completed），
 * 失败/阻塞等次级流转收入 DropdownMenu。
 */
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bot, ListChecks, MoreHorizontal, Plus, ScrollText, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { eventClient } from '@/infrastructure/event-client';
import { cn } from '@/lib/utils';
import { aiHubApi } from '@/modules/ai-hub/api/ai-hub-api';
import { RunDetailsDialog } from '@/modules/executions/components/run-details-dialog';
import {
  useIssueExecutions,
  useCreateIssueExecution,
  useUpdateExecution,
} from '@/modules/execution/hooks/use-execution';
import { useProjectMembers } from '@/modules/team-member/hooks';
import type {
  ExecutionStatus,
  IssueExecution,
} from '@/modules/execution/api/execution-api';

/** 与后端 EXECUTION_TRANSITIONS 对齐（execution.service.ts） */
const EXECUTION_TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  draft: ['planned', 'in_progress', 'pending_approval', 'superseded'],
  planned: ['in_progress', 'pending_approval', 'blocked', 'superseded'],
  in_progress: ['pending_approval', 'completed', 'failed', 'blocked', 'superseded'],
  pending_approval: ['completed', 'failed', 'blocked', 'in_progress', 'superseded'],
  blocked: ['in_progress', 'planned', 'failed', 'superseded'],
  failed: ['in_progress', 'pending_approval', 'superseded'],
  completed: [],
  superseded: [],
};

/** 每个状态的主动作（行内主按钮），其余允许流转进次级菜单 */
const PRIMARY_TRANSITION: Partial<Record<ExecutionStatus, ExecutionStatus>> = {
  draft: 'planned',
  planned: 'in_progress',
  in_progress: 'pending_approval',
  pending_approval: 'completed',
  blocked: 'in_progress',
  failed: 'in_progress',
};

const STATUS_BADGE: Record<ExecutionStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  planned: 'bg-accent-blue/10 text-accent-blue',
  in_progress: 'bg-accent-blue/10 text-accent-blue',
  pending_approval: 'bg-accent-yellow/10 text-accent-yellow',
  completed: 'bg-accent-green/10 text-accent-green',
  failed: 'bg-destructive/10 text-destructive',
  blocked: 'bg-accent-orange/10 text-accent-orange',
  superseded: 'bg-muted/40 text-muted-foreground',
};

const STATUS_LABEL_KEY: Record<ExecutionStatus, string> = {
  draft: 'taskDetail.execStatusDraft',
  planned: 'taskDetail.execStatusPlanned',
  in_progress: 'taskDetail.execStatusInProgress',
  pending_approval: 'taskDetail.execStatusPendingApproval',
  completed: 'taskDetail.execStatusCompleted',
  failed: 'taskDetail.execStatusFailed',
  blocked: 'taskDetail.execStatusBlocked',
  superseded: 'taskDetail.execStatusSuperseded',
};

const TRANSITION_LABEL_KEY: Record<ExecutionStatus, string> = {
  draft: 'taskDetail.execStatusDraft',
  planned: 'taskDetail.execActionPlan',
  in_progress: 'taskDetail.execActionStart',
  pending_approval: 'taskDetail.execActionSubmitReview',
  completed: 'taskDetail.execActionApprove',
  failed: 'taskDetail.execStatusFailed',
  blocked: 'taskDetail.execStatusBlocked',
  superseded: 'taskDetail.execActionAbandon',
};

/** 分钟 → 紧凑展示（1h30m / 45m） */
function formatMinutes(mins?: number | null) {
  if (mins === null || mins === undefined) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 border-transparent px-1.5 text-10 font-medium', STATUS_BADGE[status])}
    >
      {t(STATUS_LABEL_KEY[status])}
    </Badge>
  );
}

/** 允许绑定派发的执行项状态（与后端 dispatch.service DISPATCHABLE_STATUSES 对齐） */
const DISPATCHABLE_STATUSES: ExecutionStatus[] = ['draft', 'planned', 'failed', 'blocked'];

interface ExecutionItemRowProps {
  execution: IssueExecution;
  subjectName?: string;
  disabled?: boolean;
  onTransition: (execution: IssueExecution, next: ExecutionStatus) => void;
  onDispatchCli?: (execution: IssueExecution) => void;
  onViewLog?: (execution: IssueExecution) => void;
}

function ExecutionItemRow({ execution, subjectName, disabled, onTransition, onDispatchCli, onViewLog }: ExecutionItemRowProps) {
  const { t } = useTranslation();
  const isHuman = execution.subjectType === 'human';
  const SubjectIcon = isHuman ? UserRound : Bot;
  const allowed = EXECUTION_TRANSITIONS[execution.status] ?? [];
  const primary = PRIMARY_TRANSITION[execution.status];
  const secondary = allowed.filter((s) => s !== primary);
  const canDispatchCli =
    !isHuman && !!onDispatchCli && DISPATCHABLE_STATUSES.includes(execution.status);
  const estimate = formatMinutes(execution.estimate);
  const actual = formatMinutes(execution.actualSpent);

  return (
    <div className="rounded-lg border border-border bg-background px-2 py-1.5">
      <div className="flex items-center gap-2">
        <SubjectIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 min-w-0 truncate text-sm font-medium" title={execution.title ?? execution.goal}>
          {execution.title || execution.goal}
        </span>
        <ExecutionStatusBadge status={execution.status} />
        {onViewLog && (
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            title={t('taskDetail.execActionViewLog')}
            disabled={disabled}
            onClick={() => onViewLog(execution)}
          >
            <ScrollText className="size-3.5" />
          </button>
        )}
        {(secondary.length > 0 || canDispatchCli) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              title={t('taskDetail.execActionMore')}
              disabled={disabled}
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {secondary.map((next) => (
                <DropdownMenuItem key={next} onClick={() => onTransition(execution, next)}>
                  {t(TRANSITION_LABEL_KEY[next])}
                </DropdownMenuItem>
              ))}
              {canDispatchCli && (
                <DropdownMenuItem onClick={() => onDispatchCli?.(execution)}>
                  {t('taskDetail.execActionDispatchCli')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 pl-6 text-11 text-muted-foreground">
        {subjectName && <span className="truncate">{subjectName}</span>}
        {subjectName && (estimate || actual) && <span className="opacity-50">·</span>}
        {estimate && <span className="shrink-0">{t('taskDetail.execItemsEstimateShort', { value: estimate })}</span>}
        {actual && <span className="shrink-0">{t('taskDetail.execItemsActualShort', { value: actual })}</span>}
        <span className="flex-1" />
        {primary && (
          <Button
            variant="secondary"
            size="xs"
            className="h-5 px-1.5 text-10"
            disabled={disabled}
            onClick={() => onTransition(execution, primary)}
          >
            {t(TRANSITION_LABEL_KEY[primary])}
          </Button>
        )}
      </div>
    </div>
  );
}

interface ExecutionItemsPanelProps {
  issueId: string;
  projectId?: string | null;
}

export function ExecutionItemsPanel({ issueId, projectId }: ExecutionItemsPanelProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: executions = [], isLoading } = useIssueExecutions(issueId);
  const { data: members = [] } = useProjectMembers(projectId);
  const createExecution = useCreateIssueExecution();
  const updateExecution = useUpdateExecution();

  // WS 实时刷新：AI 派发/CLI 执行的状态变化不经前端 mutation，需订阅事件失效缓存
  useEffect(() => {
    const invalidate = () =>
      qc.invalidateQueries({ queryKey: ['execution', 'issueExecutions', issueId] });
    eventClient.on('execution.completed', invalidate);
    eventClient.on('execution.run.created', invalidate);
    eventClient.on('execution.run.updated', invalidate);
    return () => {
      eventClient.off('execution.completed', invalidate);
      eventClient.off('execution.run.created', invalidate);
      eventClient.off('execution.run.updated', invalidate);
    };
  }, [issueId, qc]);

  // 添加执行项小表单（标题必填 + 描述 + 执行人 + 预估工时）
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  // 执行记录弹窗当前展示的执行项 id
  const [logRunId, setLogRunId] = useState<string | null>(null);

  const humanMembers = members.filter((m) => m.type === 'human');
  const memberNameById = new Map(members.map((m) => [m.id, m.displayName || m.handle]));
  const busy = createExecution.isPending || updateExecution.isPending;

  // 4d-3：绑定既有执行项发起 CLI 派发（不新建执行项）
  const dispatchCli = useMutation({
    mutationFn: (execution: IssueExecution) =>
      aiHubApi.dispatchTaskToCli(issueId, { executionId: execution.id }),
    onSuccess: (data) => {
      toast.success(t('taskDetail.execDispatchCliSuccess'));
      qc.invalidateQueries({ queryKey: ['execution', 'issueExecutions', issueId] });
      if (data.executionRunId) {
        qc.invalidateQueries({ queryKey: ['executionRuns'] });
      }
    },
    onError: (err) => {
      toast.error(
        t('taskDetail.execDispatchCliError') +
          ': ' +
          (err instanceof Error ? err.message : String(err)),
      );
    },
  });

  const handleCreate = async () => {
    if (!title.trim() || !subjectId) return;
    const hours = parseFloat(estimateHours);
    try {
      await createExecution.mutateAsync({
        issueId,
        data: {
          subjectType: 'human',
          title: title.trim(),
          description: description.trim() || undefined,
          subjectId,
          estimate: Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : undefined,
        },
      });
      setTitle('');
      setDescription('');
      setEstimateHours('');
      setFormOpen(false);
    } catch {
      // 错误提示由 hook 统一 toast
    }
  };

  const handleTransition = async (execution: IssueExecution, next: ExecutionStatus) => {
    try {
      await updateExecution.mutateAsync({
        id: execution.id,
        issueId,
        data: { status: next },
      });
    } catch {
      // 错误提示由 hook 统一 toast（含状态机校验文案）
    }
  };

  return (
    // 主栏区块：与子任务区（SubTaskSection）同层级同形态
    <div className="shrink-0">
      <div className="px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListChecks className="size-3" />
          {t('taskDetail.executionItemsSection')}
          {executions.length > 0 && (
            <span className="text-10 font-normal">({executions.length})</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className={cn(
            'inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            formOpen && 'text-accent-blue',
          )}
          title={formOpen ? t('common.cancel') : t('taskDetail.execItemsAdd')}
        >
          <Plus className={cn('size-3.5 transition-transform', formOpen && 'rotate-45')} />
        </button>
      </div>

      {/* 添加人工执行项表单 */}
      {formOpen && (
        <div className="mx-6 mb-2 flex flex-col gap-1.5 rounded-lg border border-border bg-muted/20 p-2">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('taskDetail.execItemsTitlePlaceholder')}
            className="h-7 text-xs"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('taskDetail.execItemsDescPlaceholder')}
            className="h-7 text-xs"
          />
          <div className="flex items-center gap-1.5">
            <NativeSelect
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="h-7 flex-1 text-xs"
            >
              <NativeSelectOption value="">
                {humanMembers.length === 0
                  ? t('taskDetail.execItemsNoMembers')
                  : t('taskDetail.execItemsAssigneePlaceholder')}
              </NativeSelectOption>
              {humanMembers.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.displayName || m.handle}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
              placeholder={t('taskDetail.execItemsEstimatePlaceholder')}
              title={t('taskDetail.execItemsEstimate')}
              className="h-7 w-16 text-xs"
            />
            <Button
              size="xs"
              className="h-7"
              disabled={!title.trim() || !subjectId || busy}
              onClick={() => void handleCreate()}
            >
              {createExecution.isPending ? <Spinner className="size-3 text-inherit" /> : t('taskDetail.execItemsSave')}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="px-6 py-1.5 text-xs text-muted-foreground">
          <Spinner className="mr-2 inline size-3 text-inherit" />
          {t('taskDetail.execItemsLoading')}
        </div>
      ) : executions.length === 0 ? (
        <div className="px-6 pb-2 text-xs text-muted-foreground">
          {t('taskDetail.execItemsEmpty')}
        </div>
      ) : (
        <div className="px-6 pb-3 flex flex-col gap-1">
          {executions.map((execution) => (
            <ExecutionItemRow
              key={execution.id}
              execution={execution}
              subjectName={
                execution.subjectId ? memberNameById.get(execution.subjectId) : undefined
              }
              disabled={busy || dispatchCli.isPending}
              onTransition={handleTransition}
              onDispatchCli={(execution) => dispatchCli.mutate(execution)}
              onViewLog={(execution) => setLogRunId(execution.id)}
            />
          ))}
        </div>
      )}

      {/* 执行记录弹窗：状态/派发详情/时间线/事件日志（复用执行中心 RunDetailsDialog） */}
      <RunDetailsDialog
        runId={logRunId}
        open={logRunId !== null}
        onOpenChange={(open) => {
          if (!open) setLogRunId(null);
        }}
      />
    </div>
  );
}
