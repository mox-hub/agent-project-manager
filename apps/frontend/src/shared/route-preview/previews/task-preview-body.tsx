/**
 * 任务 / Bug 详情预览卡片 body（两者共用 ['task', id] 数据）
 * 所属项目名走二级缓存 ['project', task.projectId]，仅已有缓存时显示（不触发额外请求）
 */

import { useTaskDetail } from '@/modules/task/hooks/use-project-tasks';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewRow,
  StatusPreviewBadge,
  formatPreviewDate,
} from './preview-fields';

export function TaskPreviewBody({ id, kind }: { id: string; kind: 'task' | 'bug' }) {
  const { t } = useTranslation();
  const { data: task, isLoading, isError } = useTaskDetail(id);
  // 二级展示所属项目（id 为空时 hook 内部 enabled=false，不发请求）
  const { data: project } = useProjectDetail(task?.projectId ?? undefined, {
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <PreviewBodySkeleton rows={4} />;
  if (isError || !task) return <PreviewBodyError />;

  const assignee =
    task.assigneeType === 'ai_agent'
      ? task.aiAgent?.name
      : (task.assignee?.displayName ?? task.assignee?.username);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <StatusPreviewBadge status={task.status} />
        <StatusPreviewBadge status={task.priority} />
        {kind === 'bug' && task.severity && <StatusPreviewBadge status={task.severity} />}
      </div>

      {task.description && (
        <p className="line-clamp-2 text-11 text-muted-foreground">{task.description}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <PreviewRow label={t('routePreview.assignee')}>
          {assignee ? (
            <>
              {task.assigneeType === 'ai_agent' && (
                <span className="me-1 text-10 uppercase text-primary">
                  {t('routePreview.aiAgent')}
                </span>
              )}
              {assignee}
            </>
          ) : (
            '—'
          )}
        </PreviewRow>
        <PreviewRow label={t('routePreview.task.project')}>
          {project?.name ?? '—'}
        </PreviewRow>
        <PreviewRow label={t('routePreview.dueDate')}>{formatPreviewDate(task.dueDate)}</PreviewRow>
      </div>
    </div>
  );
}
