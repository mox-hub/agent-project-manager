import { useTranslation } from 'react-i18next';
import { CalendarRange, ListTodo, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SkeletonList } from '@/components/ui/skeleton';
import { useProjectTasks } from '../hooks/use-project-tasks';
import type { IterationRef } from '../api/issue-api';
import {
  deriveIterationStatus,
  ITERATION_STATUS_TONE,
} from '../lib/iteration-status';
import { formatDate } from '@/shared/lib/date-format';
import { cn } from '@/lib/utils';

interface IterationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** 展示的迭代；null 时不渲染内容（父级控制 open） */
  iteration: IterationRef | null;
  /** 有回调时展示「编辑」按钮（打开创建/编辑表单） */
  onEdit?: (iteration: IterationRef) => void;
}

/** 工单状态徽标色（克制复用 muted 语义，避免引入新色板） */
const ISSUE_STATUS_BADGE: Record<string, string> = {
  todo: 'bg-muted text-muted-foreground border-border',
  in_progress: 'bg-accent-blue-light text-accent-blue border-accent-blue/30',
  in_review: 'bg-accent-yellow-light text-accent-yellow border-accent-yellow/30',
  done: 'bg-accent-green-light text-accent-green border-accent-green/30',
};

/**
 * 迭代详情对话框（P1-19：迭代卡片可点）。展示名称/推导状态/日期区间/容量 +
 * 迭代内工单列表（GET /projects/:id/issues 按 filters.iterationId 过滤）。
 * 对话框形态跟随页内既有 Dialog 模式（克制：不做跳转，仅只读列表 + 编辑入口）。
 */
export function IterationDetailDialog({
  open,
  onOpenChange,
  projectId,
  iteration,
  onEdit,
}: IterationDetailDialogProps) {
  const { t } = useTranslation();

  const { data: tasksData, isLoading } = useProjectTasks(
    projectId,
    { filters: { iterationId: iteration?.id ? [iteration.id] : [] }, pageSize: 50 },
    { enabled: open && !!iteration?.id },
  );
  const issues = tasksData?.data ?? [];

  const status = iteration
    ? deriveIterationStatus(iteration)
    : null;
  const tone = status ? ITERATION_STATUS_TONE[status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-110">
        {iteration && tone ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <CalendarRange className="h-5 w-5 shrink-0 text-accent-purple" />
                <span className="min-w-0 break-all">{iteration.name}</span>
                <Badge className={tone.badgeClass}>{t(tone.labelKey)}</Badge>
              </DialogTitle>
              <DialogDescription>
                {t(
                  'project.milestonesPage.iterationDetailDesc',
                  '迭代内工单按 iterationId 关联，可编辑名称与起止日期。',
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarRange size={12} />
                  {formatDate(iteration.startDate)} → {formatDate(iteration.endDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ListTodo size={12} />
                  {t('project.milestonesPage.taskCount', {
                    count: iteration._count?.issues ?? issues.length,
                  })}
                </span>
              </div>

              <div
                className="max-h-64 space-y-1.5 overflow-y-auto"
                data-ai-component="project.project-milestones.iteration-detail.issues"
                data-ai-role="content"
              >
                {isLoading ? (
                  <SkeletonList count={3} />
                ) : issues.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {t(
                      'project.milestonesPage.iterationEmptyIssues',
                      '该迭代暂无工单，可在任务工作台把工单归入此迭代。',
                    )}
                  </p>
                ) : (
                  issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {issue.title}
                      </span>
                      <Badge
                        className={cn(
                          'shrink-0 text-10',
                          ISSUE_STATUS_BADGE[issue.status] ??
                            ISSUE_STATUS_BADGE.todo,
                        )}
                      >
                        {issue.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              {onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onEdit(iteration)}
                  data-ai-component="project.project-milestones.iteration-detail.edit"
                  data-ai-action="project.project-milestones.iteration-detail.edit.click"
                  data-ai-role="jump"
                >
                  <Pencil className="mr-1 size-3.5" />
                  {t('project.milestonesPage.editIteration', '编辑迭代')}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                {t('common.close', '关闭')}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
