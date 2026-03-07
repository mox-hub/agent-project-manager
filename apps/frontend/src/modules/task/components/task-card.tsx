import type { ReactNode } from 'react';
import { notionColors, notionTypography, notionSpacing, notionRadii } from '@/shared/theme/notion-tokens';
import type { Task, TaskPriority } from './api/task-api';
import { CheckSquare, Calendar, User, MessageSquare, Paperclip } from 'lucide-react';

export interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onStatusChange?: (status: string) => void;
  draggable?: boolean;
}

const priorityColors: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  low: { bg: notionColors.accent.greenLight, text: notionColors.accent.green, border: notionColors.accent.green },
  medium: { bg: notionColors.accent.yellowLight, text: notionColors.accent.yellow, border: notionColors.accent.yellow },
  high: { bg: notionColors.accent.redLight, text: notionColors.accent.red, border: notionColors.accent.red },
  critical: { bg: notionColors.accent.redLight, text: notionColors.accent.red, border: notionColors.accent.red },
};

const statusConfig: Record<string, { bg: string; text: string }> = {
  todo: { bg: 'rgba(55, 53, 47, 0.08)', text: notionColors.text.secondary },
  in_progress: { bg: notionColors.accent.blueLight, text: notionColors.accent.blue },
  in_review: { bg: notionColors.accent.purpleLight, text: notionColors.accent.purple },
  done: { bg: notionColors.accent.greenLight, text: notionColors.accent.green },
};

export function TaskCard({ task, onClick, draggable = false }: TaskCardProps) {
  const priority = task.priority as TaskPriority || 'medium';
  const priorityStyle = priorityColors[priority] || priorityColors.medium;
  const statusStyle = statusConfig[task.status] || statusConfig.todo;

  const isCompleted = task.status === 'done';

  return (
    <div
      draggable={draggable}
      onClick={onClick}
      style={{
        padding: notionSpacing.md,
        borderRadius: notionRadii.md,
        border: `1px solid ${notionColors.border.default}`,
        backgroundColor: notionColors.background.default,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        opacity: isCompleted ? 0.7 : 1,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = notionColors.border.hover;
          e.currentTarget.style.backgroundColor = notionColors.background.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = notionColors.border.default;
          e.currentTarget.style.backgroundColor = notionColors.background.default;
        }
      }}
    >
      {/* Priority indicator - left border */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: notionSpacing.md,
          bottom: notionSpacing.md,
          width: 3,
          borderRadius: `${notionRadii.sm}px 0 0 ${notionRadii.sm}px`,
          backgroundColor: priorityStyle.border,
        }}
      />

      {/* Title */}
      <div
        style={{
          fontSize: notionTypography.fontSize.sm,
          fontWeight: notionTypography.fontWeight.medium,
          color: notionColors.text.primary,
          marginBottom: notionSpacing.sm,
          lineHeight: notionTypography.lineHeight.normal,
          textDecoration: isCompleted ? 'line-through' : 'none',
          paddingLeft: notionSpacing.sm,
        }}
      >
        {task.title}
      </div>

      {/* Description preview */}
      {task.description && (
        <div
          style={{
            fontSize: notionTypography.fontSize.xs,
            color: notionColors.text.secondary,
            marginBottom: notionSpacing.md,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            paddingLeft: notionSpacing.sm,
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
            gap: notionSpacing.xs,
            marginBottom: notionSpacing.md,
            paddingLeft: notionSpacing.sm,
          }}
        >
          {task.taskTags.map(({ tag }) => (
            <span
              key={tag.id}
              style={{
                padding: `${notionSpacing.xs - 2}px ${notionSpacing.sm - 2}px`,
                borderRadius: notionRadii.sm,
                fontSize: notionTypography.fontSize.xs - 1,
                backgroundColor: tag.color ? `${tag.color}20` : notionColors.accent.blueLight,
                color: tag.color || notionColors.accent.blue,
                fontWeight: notionTypography.fontWeight.medium,
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
          marginTop: notionSpacing.sm,
          paddingLeft: notionSpacing.sm,
        }}
      >
        {/* Status badge */}
        <span
          style={{
            padding: `${notionSpacing.xs - 2}px ${notionSpacing.sm - 2}px`,
            borderRadius: notionRadii.sm,
            fontSize: notionTypography.fontSize.xs - 1,
            fontWeight: notionTypography.fontWeight.medium,
            backgroundColor: statusStyle.bg,
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
            gap: notionSpacing.md,
            fontSize: notionTypography.fontSize.xs - 1,
            color: notionColors.text.tertiary,
          }}
        >
          {/* Comments count */}
          {task._count?.comments !== undefined && task._count.comments > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: notionSpacing.xs - 2 }}>
              <MessageSquare size={12} />
              {task._count.comments}
            </span>
          )}

          {/* Attachments count */}
          {task._count?.attachments !== undefined && task._count.attachments > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: notionSpacing.xs - 2 }}>
              <Paperclip size={12} />
              {task._count.attachments}
            </span>
          )}

          {/* Subtasks count */}
          {task._count?.subTasks !== undefined && task._count.subTasks > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: notionSpacing.xs - 2 }}>
              <CheckSquare size={12} />
              {task._count.subTasks}
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: notionSpacing.xs - 2,
                color: new Date(task.dueDate) < new Date() ? notionColors.accent.red : notionColors.text.tertiary,
              }}
            >
              <Calendar size={12} />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}

          {/* Assignee avatar */}
          {task.assignee && (
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: notionColors.accent.purpleLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: notionTypography.fontWeight.semibold,
                color: notionColors.accent.purple,
                border: `1px solid ${notionColors.border.default}`,
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
