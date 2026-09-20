import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, Radio, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AiAgentBadge } from '@/shared/components/ai-agent-badge';
import {
  useMembers,
} from '@/modules/team-member/hooks';
import { useProjectRoles, type ExecutionRole } from '@/modules/project-role';
import { useAssignTaskToAI } from '../hooks/use-ai-task-operations';
import { aiHubApi, type AssignTaskToAIResponse } from '@/modules/ai-hub/api/ai-hub-api';
import { toast } from '@/components/ui/toast';

/** 批量派发的工单引用（P0-5：同项目多选逐条派发） */
export interface AiAssignIssueRef {
  id: string;
  title: string;
}

interface AiAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 单任务模式的工单 ID（批量模式传首条，仅用于兜底展示） */
  issueId: string;
  /** 收件箱任务（未归属项目）也可指派 AI，此时无法自动派发 CLI，仅保存指派 */
  projectId?: string | null;
  taskTitle: string;
  /** 批量模式（P0-5）：传入多条同项目工单时逐条派发并汇总报告 */
  issues?: AiAssignIssueRef[];
  /** 重新派发场景：预选当前已指派的 AI 员工 */
  defaultMemberId?: string;
  onSuccess?: () => void;
}

export function AiAssignDialog({
  open,
  onOpenChange,
  issueId,
  projectId,
  taskTitle,
  issues,
  defaultMemberId,
  onSuccess,
}: AiAssignDialogProps) {
  const { t } = useTranslation();
  // 拉全仓注册的 AI 员工（不限于本项目绑定的成员）
  const { data: membersData, isLoading } = useMembers({
    type: 'ai_agent',
    limit: 200,
  });
  const members = membersData?.items ?? [];
  const { data: rolesData } = useProjectRoles(projectId ?? undefined);
  const assignTaskToAI = useAssignTaskToAI();
  const qc = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    defaultMemberId ?? null,
  );
  const [isBatchPending, setIsBatchPending] = useState(false);

  // 角色按 executionRole 索引
  const roleByExecutionRole = new Map(
    (rolesData?.projectRoles ?? []).map((r) => [r.executionRole, r] as const),
  );

  const isBatch = !!issues && issues.length > 1;
  const firstTitle = issues?.[0]?.title ?? taskTitle;
  const pending = isBatch ? isBatchPending : assignTaskToAI.isPending;

  /** 批量派发（P0-5）：逐条调用现有指派 API，完成后汇总「成功 N / 失败 M」。
   *  直连 aiHubApi 而非 useAssignTaskToAI，避免 hook 级 onError 对每条失败重复弹 toast。 */
  async function handleBatchAssign() {
    if (!selectedMemberId || !issues?.length) return;
    setIsBatchPending(true);
    try {
      const results = await Promise.allSettled(
        issues.map((it) =>
          aiHubApi.assignTaskToAI({
            issueId: it.id,
            memberId: selectedMemberId,
            projectId,
          }),
        ),
      );

      const failedIndexes: number[] = [];
      let cliDispatchFailures = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value as AssignTaskToAIResponse | undefined;
          if (data?.dispatchError) cliDispatchFailures += 1;
        } else {
          failedIndexes.push(index);
        }
      });
      const okCount = issues.length - failedIndexes.length;

      if (failedIndexes.length === 0) {
        toast.success(
          t('task.batchDispatch.success', '已派发 {{count}} 条任务给 AI 员工', {
            count: okCount,
          }),
        );
        if (cliDispatchFailures > 0) {
          toast.warning(
            t(
              'task.batchDispatch.cliFailedCount',
              '其中 {{count}} 条指派成功但 CLI 自动派发失败，可在执行面板重新派发',
              { count: cliDispatchFailures },
            ),
            { duration: 8000 },
          );
        }
      } else {
        // 部分失败：列出失败行的序号（多选列表内的第 N 条）与标题
        const detail = failedIndexes
          .slice(0, 3)
          .map((index) => `#${index + 1}「${issues[index].title.slice(0, 12)}」`)
          .join('、');
        const more =
          failedIndexes.length > 3
            ? t('task.batchDispatch.andMore', '等 {{count}} 条', {
                count: failedIndexes.length,
              })
            : '';
        toast.warning(
          t(
            'task.batchDispatch.partial',
            '已派发 {{success}} 条、失败 {{failed}} 条：{{detail}}{{more}}',
            {
              success: okCount,
              failed: failedIndexes.length,
              detail,
              more,
            },
          ),
          { duration: 8000 },
        );
      }

      // 与 useAssignTaskToAI 的缓存失效口径保持一致
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['acceptance'] });
      issues.forEach((it) => {
        qc.invalidateQueries({ queryKey: ['task', it.id] });
        qc.invalidateQueries({ queryKey: ['issue-assignees', it.id] });
      });

      onOpenChange(false);
      setSelectedMemberId(defaultMemberId ?? null);
      onSuccess?.();
    } finally {
      setIsBatchPending(false);
    }
  }

  function handleAssign() {
    if (!selectedMemberId) return;
    if (isBatch) {
      void handleBatchAssign();
      return;
    }

    assignTaskToAI.mutate(
      {
        issueId,
        memberId: selectedMemberId,
        projectId,
      },
      {
        onSuccess: (data) => {
          // P0-5 顺带清理 toast 拼接混乱：派发失败时合并为一条明确的警示，
          // 不再「成功 + CLI 失败 + 审计」三段挤成一团
          if (data?.dispatchError) {
            toast.warning(
              t(
                'task.aiAssign.assignedButDispatchFailed',
                '已指派给 AI 员工，但 CLI 自动派发失败：{{error}}',
                { error: data.dispatchError },
              ),
              { duration: 8000 },
            );
          } else if (data?.executionRunId) {
            toast.success(
              t('task.aiAssign.assignedWithRun', '已派发任务给 AI 员工（执行 {{id}}）', {
                id: data.executionRunId.slice(0, 8),
              }),
            );
          } else {
            toast.success(t('task.aiAssign.assigned', '已将任务指派给 AI 员工'));
          }
          // 两级审计 gate：派发黄牌警告（审计 red，不阻断执行）
          if (data?.auditWarning) {
            toast.warning(data.auditWarning, { duration: 8000 });
          }
          onOpenChange(false);
          setSelectedMemberId(defaultMemberId ?? null);
          qc.invalidateQueries({ queryKey: ['task', issueId] });
          qc.invalidateQueries({ queryKey: ['tasks'] });
          qc.invalidateQueries({ queryKey: ['acceptance'] });
          onSuccess?.();
        },
        onError: (err) => {
          toast.error(
            t('task.aiAssign.failed', '派发失败: {{message}}', {
              message: err instanceof Error ? err.message : String(err),
            }),
          );
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot size={16} className="text-accent-purple" />
            {isBatch
              ? t('task.batchDispatch.dialogTitle', '批量派发 {{count}} 条任务给 AI 员工', {
                  count: issues!.length,
                })
              : t('task.aiAssign.dialogTitle', '派发任务给 AI 员工')}
          </DialogTitle>
          <DialogDescription>
            {isBatch
              ? t(
                  'task.batchDispatch.dialogDesc',
                  '将逐条派发以下任务给选中的 AI 员工按角色绑定 CLI 自动执行：',
                )
              : t(
                  'task.aiAssign.dialogDesc',
                  '选择系统中注册的 AI 员工按角色绑定 CLI 自动执行：',
                )}
            <span className="font-medium">
              {' '}
              {isBatch
                ? t('task.batchDispatch.issueListPreview', '{{first}} 等 {{count}} 条', {
                    first: firstTitle,
                    count: issues!.length,
                  })
                : taskTitle}
            </span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Spinner className="size-4 mr-2 text-inherit" />
            {t('task.aiAssign.loadingMembers')}
          </div>
        ) : !members || members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <Bot size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('task.aiAssign.noMembers')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('task.aiAssign.noMembersHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {members.map((m) => {
              const role = m.defaultExecutionRole
                ? (roleByExecutionRole.get(m.defaultExecutionRole as ExecutionRole) as
                    | { defaultCliProviderId?: string | null }
                    | undefined)
                : null;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedMemberId === m.id
                      ? 'border-accent-purple bg-accent-purple-light/10'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AiAgentBadge
                        agentName={m.displayName ?? m.handle}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {m.displayName}
                          {m.handle && (
                            <span className="text-muted-foreground">
                              {' '}
                              @{m.handle}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {m.defaultExecutionRole && (
                            <Badge variant="secondary" className="text-xs">
                              {m.defaultExecutionRole}
                            </Badge>
                          )}
                          {role?.defaultCliProviderId && (
                            <Badge
                              variant="outline"
                              className="text-xs gap-1"
                            >
                              <Terminal className="h-3 w-3" />
                              {role.defaultCliProviderId}
                            </Badge>
                          )}
                          {m.defaultCliProviderId && (
                            <Badge className="text-xs gap-1">
                              <Terminal className="h-3 w-3" />
                              {m.defaultCliProviderId} (override)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {m.status === 'active' ? (
                      <Badge className="border-0 bg-accent-green-light/50 text-accent-green text-xs">
                        <Radio size={10} className="mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-muted text-muted-foreground text-xs">
                        {m.status}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            disabled={!selectedMemberId || pending}
            onClick={handleAssign}
          >
            {pending ? (
              <>
                <Spinner className="size-3.5 mr-1 text-inherit" />
                {t('task.aiAssign.dispatching')}
              </>
            ) : (
              t('task.aiAssign.dispatchAndExecute')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
