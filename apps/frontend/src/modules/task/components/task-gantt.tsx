import { useMemo } from 'react';
import { notionColors, notionTypography, notionSpacing, notionRadii } from '@/shared/theme/notion-tokens';
import type { Task } from '../api/task-api';

interface TaskGanttProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function TaskGantt({ tasks, onTaskClick }: TaskGanttProps) {
  const { startDate, endDate, weeks, taskBars } = useMemo(() => {
    const tasksWithDueDate = tasks.filter(t => t.dueDate);

    if (tasksWithDueDate.length === 0) {
      return { startDate: new Date(), endDate: new Date(), weeks: [], taskBars: [] };
    }

    const dates = tasksWithDueDate.map(t => new Date(t.dueDate!));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add padding (1 week before and after)
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    // Align to week start (Sunday)
    const day = minDate.getDay();
    minDate.setDate(minDate.getDate() - day);

    // Generate weeks
    const weeks: { start: Date; end: Date; label: string }[] = [];
    const current = new Date(minDate);
    while (current <= maxDate) {
      const weekStart = new Date(current);
      weeks.push({
        start: weekStart,
        end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
        label: `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()}`,
      });
      current.setDate(current.getDate() + 7);
    }

    // Calculate task bars
    const totalDays = (maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000);
    const taskBarsData = tasksWithDueDate.map(task => {
      const dueDate = new Date(task.dueDate!);
      const startOffset = Math.max(0, (dueDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000));
      const duration = task.estimate ? Math.ceil(task.estimate / 8) : 1; // Assume 8h per day

      return {
        task,
        left: (startOffset / totalDays) * 100,
        width: Math.max((duration / totalDays) * 100, 2),
      };
    });

    return { startDate: minDate, endDate: maxDate, weeks, taskBars: taskBarsData };
  }, [tasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return notionColors.accent.green;
      case 'in_progress':
        return notionColors.accent.blue;
      case 'in_review':
        return notionColors.accent.yellow;
      case 'todo':
      default:
        return notionColors.text.tertiary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return notionColors.accent.red;
      case 'medium':
        return notionColors.accent.yellow;
      case 'low':
      default:
        return notionColors.accent.green;
    }
  };

  if (tasks.filter(t => t.dueDate).length === 0) {
    return (
      <div
        style={{
          padding: notionSpacing.xl,
          textAlign: 'center',
          color: notionColors.text.secondary,
          backgroundColor: notionColors.background.secondary,
          borderRadius: notionRadii.md,
        }}
      >
        No tasks with due dates to display in timeline
      </div>
    );
  }

  return (
    <div
      style={{
        overflowX: 'auto',
        backgroundColor: notionColors.background.default,
        borderRadius: notionRadii.md,
        border: `1px solid ${notionColors.border.default}`,
      }}
    >
      {/* Header with weeks */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${notionColors.border.default}`,
          position: 'sticky',
          top: 0,
          backgroundColor: notionColors.background.default,
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 200,
            minWidth: 200,
            padding: notionSpacing.md,
            fontWeight: notionTypography.fontWeight.semibold,
            fontSize: notionTypography.fontSize.sm,
            borderRight: `1px solid ${notionColors.border.default}`,
            backgroundColor: notionColors.background.secondary,
          }}
        >
          Task
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          {weeks.map((week, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                minWidth: 60,
                padding: notionSpacing.sm,
                textAlign: 'center',
                fontSize: notionTypography.fontSize.xs,
                color: notionColors.text.secondary,
                borderRight: `1px solid ${notionColors.border.default}`,
              }}
            >
              {week.label}
            </div>
          ))}
        </div>
      </div>

      {/* Task rows */}
      {taskBars.map(({ task, left, width }) => (
        <div
          key={task.id}
          style={{
            display: 'flex',
            borderBottom: `1px solid ${notionColors.border.default}`,
            cursor: 'pointer',
          }}
          onClick={() => onTaskClick?.(task)}
        >
          <div
            style={{
              width: 200,
              minWidth: 200,
              padding: notionSpacing.md,
              fontSize: notionTypography.fontSize.sm,
              borderRight: `1px solid ${notionColors.border.default}`,
              display: 'flex',
              alignItems: 'center',
              gap: notionSpacing.sm,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getStatusColor(task.status),
              }}
            />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 140,
              }}
            >
              {task.title}
            </span>
          </div>
          <div style={{ position: 'relative', flex: 1, height: 44 }}>
            {/* Background grid lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
              {weeks.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    borderRight: `1px solid ${notionColors.border.default}`,
                  }}
                />
              ))}
            </div>
            {/* Task bar */}
            <div
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                top: '50%',
                transform: 'translateY(-50%)',
                height: 24,
                backgroundColor: getStatusColor(task.status),
                borderRadius: notionRadii.sm,
                display: 'flex',
                alignItems: 'center',
                padding: `0 ${notionSpacing.sm}`,
                minWidth: 40,
              }}
            >
              <span
                style={{
                  fontSize: notionTypography.fontSize.xs,
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.estimate ? `${task.estimate}h` : ''}
              </span>
            </div>
            {/* Priority indicator */}
            <div
              style={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: getPriorityColor(task.priority),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
