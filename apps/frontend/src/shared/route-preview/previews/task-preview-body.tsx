/**
 * 任务 / Bug 详情预览卡片 body（两者共用 ['task', id] 数据）
 * 所属项目名走二级缓存 ['project', task.projectId]，仅已有缓存时显示（不触发额外请求）
 */

import { AlertCircle } from 'lucide-react';
import { useTaskDetail } from '@/modules/issue/hooks/use-project-tasks';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useTranslation } from '@/hooks/useTranslation';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewFooterMeta,
  PreviewRow,
  PreviewSection,
  PriorityFlag,
  SeverityBar,
  formatPreviewDate,
  getStatusTone,
} from './preview-fields';

function formatStatus(status?: string | null): string {
  if (!status) return '—';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function TaskPreviewBody({ id, kind }: { id: string; kind: 'task' | 'bug' }) {
  const { t } = useTranslation();
  const { data: task, isLoading, isError } = useTaskDetail(id);
  // 二级展示所属项目（id 为空时 hook 内部 enabled=false，不发请求）
  const { data: project } = useProjectDetail(task?.projectId ?? undefined, {
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <PreviewBodySkeleton rows={4} />;
  if (isError || !task) return <PreviewBodyError />;

  const isAiAssignee = task.assigneeType === 'ai_agent';
  const assignee =
    isAiAssignee
      ? task.aiAgent?.name
      : (task.assignee?.displayName ?? task.assignee?.username);

  const isBlocker =
    kind === 'bug' &&
    (task.severity === 'critical' || task.priority === 'critical');

  const shortId = task.shortId ?? `#${task.id.slice(0, 8)}`;

  return (
    <div className="space-y-3">
      {/* 顶部 Hero 带：按工单类型分发的特色视觉带 */}
      {kind === 'bug' ? (
        isBlocker ? (
          <div className="flex items-center justify-between p-2 rounded-md bg-accent-red/10 border border-accent-red/30">
            <div className="flex items-center gap-2">
              <SeverityBar severity="critical" />
              <span className="text-10 font-bold text-accent-red uppercase tracking-wider">
                阻塞发布 (Blocker)
              </span>
            </div>
            <StatusPill tone="danger">{formatStatus(task.status)}</StatusPill>
          </div>
        ) : (
          <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
            <div className="flex items-center gap-1.5">
              <StatusPill tone={getStatusTone(task.status)}>
                {formatStatus(task.status)}
              </StatusPill>
              {task.severity && <SeverityBar severity={task.severity} />}
            </div>
            {task.milestone?.name && (
              <span className="text-10 font-mono text-muted-foreground">
                {task.milestone.name}
              </span>
            )}
          </div>
        )
      ) : (
        <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <StatusPill tone={getStatusTone(task.status)}>
              {formatStatus(task.status)}
            </StatusPill>
            <PriorityFlag priority={task.priority} />
          </div>
          {task.milestone?.name && (
            <span className="text-10 font-mono text-muted-foreground">
              {task.milestone.name}
            </span>
          )}
        </div>
      )}

      {task.description && (
        <p className="line-clamp-2 text-11 text-muted-foreground">{task.description}</p>
      )}

      <PreviewSection title={kind === 'bug' ? '排查上下文' : '工单属性'}>
        <PreviewRow label={t('routePreview.assignee')}>
          {assignee ? (
            <div className="flex items-center gap-1.5">
              <MemberAvatar
                size="xs"
                member={{
                  type: isAiAssignee ? 'ai_agent' : 'human',
                  displayName: assignee,
                  avatarUrl: task.assignee?.avatarUrl,
                }}
                fallbackInitials={assignee}
                showBadge={false}
              />
              <span className="truncate">{assignee}</span>
            </div>
          ) : (
            '—'
          )}
        </PreviewRow>
        <PreviewRow label={t('routePreview.task.project')}>
          {project?.name ?? '—'}
        </PreviewRow>
        {kind === 'bug' && task.bugEnvironment && (
          <PreviewRow label="复现环境">{task.bugEnvironment}</PreviewRow>
        )}
        {task.estimate != null && (
          <PreviewRow label="预估工时">
            <span className="font-mono text-10 text-muted-foreground">{task.estimate}h</span>
          </PreviewRow>
        )}
        {task.dueDate && (
          <PreviewRow label={t('routePreview.dueDate')}>{formatPreviewDate(task.dueDate)}</PreviewRow>
        )}
      </PreviewSection>

      <PreviewFooterMeta>
        {isBlocker ? (
          <span className="text-accent-red flex items-center gap-1 font-medium">
            <AlertCircle className="size-3" /> P0 紧急响应中
          </span>
        ) : (
          <span>截止 {formatPreviewDate(task.dueDate)}</span>
        )}
        <span className="ml-auto font-mono text-10">{shortId}</span>
      </PreviewFooterMeta>
    </div>
  );
}
