import { colors, radii, spacing, typography } from '@/shared/theme/tokens';
import { Button } from '@/shared/ui/button';
import type { Task, TaskPriority, TaskListParams } from './api/task-api';

export interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  params?: TaskListParams;
  onTaskClick?: (task: Task) => void;
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
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
          padding: spacing.xl * 2,
          color: colors.textSecondary,
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
          padding: spacing.xl * 2,
          color: colors.textTertiary,
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
          fontSize: typography.sm,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: `1px solid ${colors.border}`,
              background: colors.neutralBg,
            }}
          >
            <th
              style={{
                padding: spacing.sm,
                textAlign: 'left',
                fontWeight: 500,
                color: colors.textSecondary,
                width: '40%',
              }}
            >
              Title
            </th>
            <th
              style={{
                padding: spacing.sm,
                textAlign: 'left',
                fontWeight: 500,
                color: colors.textSecondary,
                width: '15%',
              }}
            >
              Status
            </th>
            <th
              style={{
                padding: spacing.sm,
                textAlign: 'left',
                fontWeight: 500,
                color: colors.textSecondary,
                width: '10%',
              }}
            >
              Priority
            </th>
            <th
              style={{
                padding: spacing.sm,
                textAlign: 'left',
                fontWeight: 500,
                color: colors.textSecondary,
                width: '15%',
              }}
            >
              Assignee
            </th>
            <th
              style={{
                padding: spacing.sm,
                textAlign: 'left',
                fontWeight: 500,
                color: colors.textSecondary,
                width: '10%',
              }}
            >
              Due Date
            </th>
            <th
              style={{
                padding: spacing.sm,
                textAlign: 'center',
                fontWeight: 500,
                color: colors.textSecondary,
                width: '10%',
              }}
            >
              Subtasks
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const statusStyle = statusColors[task.status] || statusColors.todo;
            const priorityColor = priorityColors[task.priority as TaskPriority] || colors.textSecondary;

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                style={{
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: onTaskClick ? 'pointer' : 'default',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.neutralBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <td style={{ padding: spacing.sm }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    {/* Priority indicator */}
                    <div
                      style={{
                        width: 4,
                        height: 24,
                        borderRadius: 2,
                        background: priorityColor,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: 500,
                          color: colors.textPrimary,
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                          opacity: task.status === 'done' ? 0.6 : 1,
                        }}
                      >
                        {task.title}
                      </div>
                      {task.description && (
                        <div
                          style={{
                            fontSize: typography.xs,
                            color: colors.textTertiary,
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
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
                            gap: spacing.xs,
                            marginTop: spacing.xs,
                          }}
                        >
                          {task.taskTags.slice(0, 3).map(({ tag }) => (
                            <span
                              key={tag.id}
                              style={{
                                padding: `1px ${spacing.xs}`,
                                borderRadius: radii.sm,
                                fontSize: typography.xs - 2,
                                background: (tag.color || colors.accent) + '20',
                                color: tag.color || colors.accent,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {task.taskTags.length > 3 && (
                            <span style={{ fontSize: typography.xs - 2, color: colors.textTertiary }}>
                              +{task.taskTags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: spacing.sm }}>
                  <span
                    style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: radii.sm,
                      fontSize: typography.xs,
                      fontWeight: 500,
                      background: statusStyle.bg,
                      color: statusStyle.text,
                      textTransform: 'capitalize',
                    }}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: spacing.sm }}>
                  <span
                    style={{
                      fontSize: typography.xs,
                      fontWeight: 500,
                      color: priorityColor,
                      textTransform: 'capitalize',
                    }}
                  >
                    {task.priority}
                  </span>
                </td>
                <td style={{ padding: spacing.sm }}>
                  {task.assignee ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: colors.accent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: typography.xs,
                          fontWeight: 600,
                          color: '#fff',
                        }}
                      >
                        {(task.assignee.displayName || task.assignee.username)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span style={{ fontSize: typography.sm }}>
                        {task.assignee.displayName || task.assignee.username}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: typography.sm, color: colors.textTertiary }}>
                      Unassigned
                    </span>
                  )}
                </td>
                <td style={{ padding: spacing.sm }}>
                  {task.dueDate ? (
                    <span
                      style={{
                        fontSize: typography.sm,
                        color: new Date(task.dueDate) < new Date() && task.status !== 'done'
                          ? colors.error
                          : colors.textSecondary,
                      }}
                    >
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span style={{ fontSize: typography.sm, color: colors.textTertiary }}>
                      -
                    </span>
                  )}
                </td>
                <td style={{ padding: spacing.sm, textAlign: 'center' }}>
                  {task._count?.subTasks !== undefined && task._count.subTasks > 0 ? (
                    <span
                      style={{
                        fontSize: typography.sm,
                        color: colors.textSecondary,
                      }}
                    >
                      {task._count.subTasks}
                    </span>
                  ) : (
                    <span style={{ fontSize: typography.sm, color: colors.textTertiary }}>
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
