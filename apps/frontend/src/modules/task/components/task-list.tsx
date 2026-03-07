import { notionColors, notionTypography, notionSpacing, notionRadii } from '@/shared/theme/notion-tokens';
import type { Task, TaskPriority, TaskListParams } from './api/task-api';
import { CheckSquare, Calendar, User } from 'lucide-react';

export interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  params?: TaskListParams;
  onTaskClick?: (task: Task) => void;
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string }> = {
  low: { bg: notionColors.accent.greenLight, text: notionColors.accent.green },
  medium: { bg: notionColors.accent.yellowLight, text: notionColors.accent.yellow },
  high: { bg: notionColors.accent.redLight, text: notionColors.accent.red },
  critical: { bg: notionColors.accent.redLight, text: notionColors.accent.red },
};

const statusConfig: Record<string, { bg: string; text: string }> = {
  todo: { bg: 'rgba(55, 53, 47, 0.08)', text: notionColors.text.secondary },
  in_progress: { bg: notionColors.accent.blueLight, text: notionColors.accent.blue },
  in_review: { bg: notionColors.accent.purpleLight, text: notionColors.accent.purple },
  done: { bg: notionColors.accent.greenLight, text: notionColors.accent.green },
};

export function TaskList({
  tasks,
  loading,
  onTaskClick,
}: TaskListProps) {
  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: notionSpacing['4xl'] * 2,
          color: notionColors.text.secondary,
          fontSize: notionTypography.fontSize.sm,
        }}
      >
        Loading tasks...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: notionSpacing['4xl'] * 2,
          color: notionColors.text.tertiary,
          fontSize: notionTypography.fontSize.sm,
        }}
      >
        No tasks found
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: notionTypography.fontSize.sm,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: `1px solid ${notionColors.border.default}`,
              backgroundColor: notionColors.background.secondary,
            }}
          >
            <th
              style={{
                padding: `${notionSpacing.md}px ${notionSpacing.lg}px`,
                textAlign: 'left',
                fontWeight: notionTypography.fontWeight.medium,
                color: notionColors.text.tertiary,
                width: '40%',
                fontSize: notionTypography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Title
            </th>
            <th
              style={{
                padding: `${notionSpacing.md}px ${notionSpacing.lg}px`,
                textAlign: 'left',
                fontWeight: notionTypography.fontWeight.medium,
                color: notionColors.text.tertiary,
                width: '15%',
                fontSize: notionTypography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Status
            </th>
            <th
              style={{
                padding: `${notionSpacing.md}px ${notionSpacing.lg}px`,
                textAlign: 'left',
                fontWeight: notionTypography.fontWeight.medium,
                color: notionColors.text.tertiary,
                width: '10%',
                fontSize: notionTypography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Priority
            </th>
            <th
              style={{
                padding: `${notionSpacing.md}px ${notionSpacing.lg}px`,
                textAlign: 'left',
                fontWeight: notionTypography.fontWeight.medium,
                color: notionColors.text.tertiary,
                width: '15%',
                fontSize: notionTypography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Assignee
            </th>
            <th
              style={{
                padding: `${notionSpacing.md}px ${notionSpacing.lg}px`,
                textAlign: 'left',
                fontWeight: notionTypography.fontWeight.medium,
                color: notionColors.text.tertiary,
                width: '10%',
                fontSize: notionTypography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Due Date
            </th>
            <th
              style={{
                padding: `${notionSpacing.md}px ${notionSpacing.lg}px`,
                textAlign: 'center',
                fontWeight: notionTypography.fontWeight.medium,
                color: notionColors.text.tertiary,
                width: '10%',
                fontSize: notionTypography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Subtasks
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const statusStyle = statusConfig[task.status] || statusConfig.todo;
            const priority = task.priority as TaskPriority || 'medium';
            const priorityStyle = priorityConfig[priority] || priorityConfig.medium;
            const isCompleted = task.status === 'done';

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                style={{
                  borderBottom: `1px solid ${notionColors.border.default}`,
                  cursor: onTaskClick ? 'pointer' : 'default',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = notionColors.background.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td style={{ padding: notionSpacing.md }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: notionSpacing.md }}>
                    {/* Priority indicator */}
                    <div
                      style={{
                        width: 3,
                        height: 28,
                        borderRadius: notionRadii.sm,
                        backgroundColor: priorityStyle.text,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: notionTypography.fontWeight.medium,
                          color: notionColors.text.primary,
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          opacity: isCompleted ? 0.6 : 1,
                        }}
                      >
                        {task.title}
                      </div>
                      {task.description && (
                        <div
                          style={{
                            fontSize: notionTypography.fontSize.xs,
                            color: notionColors.text.tertiary,
                            maxWidth: 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: notionSpacing.xs - 2,
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
                            gap: notionSpacing.xs,
                            marginTop: notionSpacing.sm,
                          }}
                        >
                          {task.taskTags.slice(0, 3).map(({ tag }) => (
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
                          {task.taskTags.length > 3 && (
                            <span
                              style={{
                                fontSize: notionTypography.fontSize.xs - 1,
                                color: notionColors.text.tertiary,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              +{task.taskTags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: notionSpacing.md }}>
                  <span
                    style={{
                      padding: `${notionSpacing.xs}px ${notionSpacing.sm}px`,
                      borderRadius: notionRadii.sm,
                      fontSize: notionTypography.fontSize.xs,
                      fontWeight: notionTypography.fontWeight.medium,
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                      textTransform: 'capitalize',
                    }}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: notionSpacing.md }}>
                  <span
                    style={{
                      padding: `${notionSpacing.xs}px ${notionSpacing.sm}px`,
                      borderRadius: notionRadii.sm,
                      fontSize: notionTypography.fontSize.xs,
                      fontWeight: notionTypography.fontWeight.medium,
                      backgroundColor: priorityStyle.bg,
                      color: priorityStyle.text,
                      textTransform: 'capitalize',
                    }}
                  >
                    {task.priority || 'medium'}
                  </span>
                </td>
                <td style={{ padding: notionSpacing.md }}>
                  {task.assignee ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: notionSpacing.sm }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: notionColors.accent.purpleLight,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: notionTypography.fontSize.xs,
                          fontWeight: notionTypography.fontWeight.semibold,
                          color: notionColors.accent.purple,
                          border: `1px solid ${notionColors.border.default}`,
                        }}
                      >
                        {(task.assignee.displayName || task.assignee.username)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span style={{ fontSize: notionTypography.fontSize.sm, color: notionColors.text.primary }}>
                        {task.assignee.displayName || task.assignee.username}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: notionTypography.fontSize.sm, color: notionColors.text.tertiary }}>
                      Unassigned
                    </span>
                  )}
                </td>
                <td style={{ padding: notionSpacing.md }}>
                  {task.dueDate ? (
                    <span
                      style={{
                        fontSize: notionTypography.fontSize.sm,
                        color: new Date(task.dueDate) < new Date() && !isCompleted
                          ? notionColors.accent.red
                          : notionColors.text.secondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: notionSpacing.xs,
                      }}
                    >
                      <Calendar size={14} />
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ) : (
                    <span style={{ fontSize: notionTypography.fontSize.sm, color: notionColors.text.tertiary }}>
                      -
                    </span>
                  )}
                </td>
                <td style={{ padding: notionSpacing.md, textAlign: 'center' }}>
                  {task._count?.subTasks !== undefined && task._count.subTasks > 0 ? (
                    <span
                      style={{
                        fontSize: notionTypography.fontSize.sm,
                        color: notionColors.text.secondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: notionSpacing.xs,
                      }}
                    >
                      <CheckSquare size={14} />
                      {task._count.subTasks}
                    </span>
                  ) : (
                    <span style={{ fontSize: notionTypography.fontSize.sm, color: notionColors.text.tertiary }}>
                      -
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
