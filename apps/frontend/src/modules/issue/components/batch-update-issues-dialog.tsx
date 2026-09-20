import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useMembers } from '@/modules/team-member/hooks';
import { taskApi, type TaskPriority } from '../api/issue-api';

/** 批量修改的工单引用（P1-12：与 AiAssignIssueRef 同形态，多带 shortId 用于失败定位展示） */
export interface BatchUpdateIssueRef {
  id: string;
  title: string;
  shortId?: string | null;
}

interface BatchUpdateIssuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: BatchUpdateIssueRef[];
  /** 全部请求落定（无论成败）后回调：页面借此 refetch */
  onCompleted?: () => void;
}

const STATUS_OPTIONS = ['todo', 'in_progress', 'in_review', 'done', 'canceled'] as const;
const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary';

/**
 * 批量修改工单（P1-12）：状态 / 优先级 / 负责人 三个可选字段，留空 = 不修改。
 *
 * 前端循环方案：逐条调用现有 PATCH /issues/:id（真批量端点属契约变更，本项不做）。
 * 与 AiAssignDialog 批量派发同款「allSettled 逐条 + 汇总 toast」形态（P0-5 已落）：
 * 直连 taskApi.update 而非 useUpdateTask，避免 hook 级 onError 对每条失败重复弹 toast；
 * 汇总 toast 逐条报成功/失败（弱网部分失败不静默）。
 */
export function BatchUpdateIssuesDialog({
  open,
  onOpenChange,
  issues,
  onCompleted,
}: BatchUpdateIssuesDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // 拉全仓成员（含 AI 员工）：负责人可改派人类成员或 AI 员工
  const { data: membersData } = useMembers({ limit: 200 });
  const members = membersData?.items ?? [];

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [pending, setPending] = useState(false);

  const hasChanges = status !== '' || priority !== '' || assigneeId !== '';

  const resetAndClose = () => {
    setStatus('');
    setPriority('');
    setAssigneeId('');
    onOpenChange(false);
  };

  const labelOf = (issue: BatchUpdateIssueRef) =>
    issue.shortId || issue.title.slice(0, 12) || issue.id.slice(0, 8);

  const handleApply = async () => {
    if (!hasChanges || pending || issues.length === 0) return;
    setPending(true);
    try {
      const data: Parameters<typeof taskApi.update>[1] = {};
      if (status) data.status = status;
      if (priority) data.priority = priority as TaskPriority;
      if (assigneeId) {
        const member = members.find((m) => m.id === assigneeId);
        data.assigneeId = assigneeId;
        // AI 员工作为主负责人时需声明 assigneeType（与创建/单条编辑口径一致）
        if (member?.type === 'ai_agent') data.assigneeType = 'ai_agent';
      }

      const results = await Promise.allSettled(
        issues.map((issue) => taskApi.update(issue.id, data)),
      );

      const failures = results
        .map((result, index) => ({ result, issue: issues[index] }))
        .filter((entry): entry is { result: PromiseRejectedResult; issue: BatchUpdateIssueRef } =>
          entry.result.status === 'rejected',
        );
      const okCount = issues.length - failures.length;

      if (failures.length === 0) {
        toast.success(
          t('task.batchUpdate.success', '已更新 {{count}} 条工单', { count: okCount }),
        );
      } else {
        // 部分失败：逐条列出失败项标识与原因（前 3 条），弱网不静默
        const firstError =
          failures[0]?.result.reason instanceof Error
            ? failures[0].result.reason.message
            : String(failures[0]?.result.reason ?? '未知错误');
        const detail = failures
          .slice(0, 3)
          .map((entry) => `「${labelOf(entry.issue)}」${firstError}`)
          .join('、');
        const more =
          failures.length > 3
            ? t('task.batchUpdate.andMore', '等 {{count}} 条', { count: failures.length })
            : '';
        const message = t('task.batchUpdate.partial', '已更新 {{success}} 条、失败 {{failed}} 条：{{detail}}{{more}}', {
          success: okCount,
          failed: failures.length,
          detail,
          more,
        });
        if (okCount === 0) {
          toast.error(message, { duration: 8000 });
        } else {
          toast.warning(message, { duration: 8000 });
        }
      }

      // 与 useUpdateTask 的缓存失效口径一致（列表 + 单条详情）
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['allBugs'] });
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      issues.forEach((issue) => {
        queryClient.invalidateQueries({ queryKey: ['task', issue.id] });
      });

      onCompleted?.();
      resetAndClose();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && resetAndClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-accent-blue" />
            {t('task.batchUpdate.title', '批量修改 {{count}} 条工单', { count: issues.length })}
          </DialogTitle>
          <DialogDescription>
            {t(
              'task.batchUpdate.desc',
              '选择要修改的字段，留空的字段保持不变；修改将逐条应用到选中工单。',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="batch-update-status">
              {t('task.status.group', 'Status')}
            </label>
            <select
              id="batch-update-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">{t('task.batchUpdate.noChange', '不修改')}</option>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`task.status.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="batch-update-priority">
              {t('viewDisplay.properties.priority', 'Priority')}
            </label>
            <select
              id="batch-update-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">{t('task.batchUpdate.noChange', '不修改')}</option>
              {PRIORITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`task.priority.${value}`, value)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="batch-update-assignee">
              {t('viewDisplay.properties.assignee', 'Assignee')}
            </label>
            <select
              id="batch-update-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">{t('task.batchUpdate.noChange', '不修改')}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {(member.type === 'ai_agent' ? '[AI] ' : '') + (member.displayName || member.handle || member.id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={resetAndClose} disabled={pending}>
            {t('common.cancel', '取消')}
          </Button>
          <Button onClick={handleApply} disabled={!hasChanges || pending}>
            {pending ? <Spinner className="size-4" /> : null}
            {pending
              ? t('task.batchUpdate.applying', '更新中…')
              : t('task.batchUpdate.apply', '应用到 {{count}} 条', { count: issues.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
