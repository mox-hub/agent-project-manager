import type { ReactNode } from 'react';
import { colors, radii, spacing, typography, shadows } from '@/shared/theme/tokens';
import type { Task, TaskPriority } from './api/task-api';
import { Button } from '@/shared/ui/button';

export interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onStatusChange?: (status: string) => void;
  draggable?: boolean;
}

const priorityColors: Record<TaskPriority, string> = {
  low: colors.success,
  medium: colors.warning,
  high: colors.error,
  critical: '#dc2626',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  todo: { bg: colors.neutralBg, text: colors.textSecondary },
  in_progress: { bg: colors.info + '20', text: colors.info },
  in_review: { bg: colors.warning + '20', text: colors.warning },
  done: { bg: colors.success + '20', text: colors.success },
};

export function TaskCard({ task, onClick, draggable = false }: TaskCardProps) {
  const priorityColor = priorityColors[task.priority as TaskPriority] || colors.textSecondary;
  const statusStyle = statusColors[task.status] || statusColors.todo;

  return (
    <div
      draggable={draggable}
      onClick={onClick}
      style={{
        padding: spacing.md,
        borderRadius: radii.md,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        opacity: task.status === 'done' ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = colors.accent;
          e.currentTarget.style.boxShadow = shadows.sm;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = colors.border;
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Priority indicator */}
      <div
        style={{
          width: 4,
          height: '100%',
          minHeight: 40,
          borderRadius: 2,
          background: priorityColor,
          position: 'absolute',
          left: 0,
          top: 0,
          marginLeft: -spacing.md,
        }}
      />

      {/* Title */}
      <div
        style={{
          fontSize: typography.sm,
          fontWeight: 500,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
          lineHeight: 1.4,
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </div>

      {/* Description preview */}
      {task.description && (
        <div
          style={{
            fontSize: typography.xs,
            color: colors.textSecondary,
            marginBottom: spacing.sm,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {task.description}
        </div>
      )}

      {/* Tags */}
      {task.taskTags && task.taskTags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing.xs,
            marginBottom: spacing.sm,
          }}
        >
          {task.taskTags.map(({ tag }) => (
            <span
              key={tag.id}
              style={{
                padding: `2px ${spacing.xs + 2}px`,
                borderRadius: radii.sm,
                fontSize: typography.xs - 2,
                background: (tag.color || colors.accent) + '20',
                color: tag.color || colors.accent,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.sm,
        }}
      >
        {/* Status badge */}
        <span
          style={{
            padding: `2px ${spacing.xs + 2}px`,
            borderRadius: radii.sm,
            fontSize: typography.xs - 2,
            fontWeight: 500,
            background: statusStyle.bg,
            color: statusStyle.text,
            textTransform: 'capitalize',
          }}
        >
          {task.status.replace('_', ' ')}
        </span>

        {/* Meta info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            fontSize: typography.xs - 2,
            color: colors.textTertiary,
          }}
        >
          {/* Subtasks count */}
          {task._count?.subTasks !== undefined && task._count.subTasks > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              {task._count.subTasks}
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span
              style={{
                color: new Date(task.dueDate) < new Date() ? colors.error : colors.textTertiary,
              }}
            >
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}

          {/* Assignee avatar */}
          {task.assignee && (
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: '#fff',
              }}
              title={task.assignee.displayName || task.assignee.username}
            >
              {(task.assignee.displayName || task.assignee.username)?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
