import { useMemo } from 'react';
import type { Task } from '../api/task-api';
import { cn } from '@/lib/utils';

interface TaskGanttProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const statusColors: Record<string, string> = {
  done: 'bg-accent-green',
  in_progress: 'bg-accent-blue',
  in_review: 'bg-accent-yellow',
  todo: 'bg-content-text-tertiary',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-accent-red',
  high: 'bg-accent-red',
  medium: 'bg-accent-yellow',
  low: 'bg-accent-green',
};

export function TaskGantt({ tasks, onTaskClick }: TaskGanttProps) {
  const { weeks, taskBars } = useMemo(() => {
    const tasksWithDueDate = tasks.filter(t => t.dueDate);

    if (tasksWithDueDate.length === 0) {
      return { weeks: [], taskBars: [] };
    }

    const dates = tasksWithDueDate.map(t => new Date(t.dueDate!));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    const day = minDate.getDay();
    minDate.setDate(minDate.getDate() - day);

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

    const totalDays = (maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000);
    const taskBarsData = tasksWithDueDate.map(task => {
      const dueDate = new Date(task.dueDate!);
      const startOffset = Math.max(0, (dueDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000));
      const duration = task.estimate ? Math.ceil(task.estimate / 8) : 1;

      return {
        task,
        left: (startOffset / totalDays) * 100,
        width: Math.max((duration / totalDays) * 100, 2),
      };
    });

    return { weeks, taskBars: taskBarsData };
  }, [tasks]);

  if (tasks.filter(t => t.dueDate).length === 0) {
    return (
      <div className="p-6 text-center text-content-text-secondary bg-content-bg-secondary rounded-md">
        No tasks with due dates to display in timeline
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-content-bg rounded-md border border-content-border">
      {/* Header with weeks */}
      <div className="flex border-b border-content-border sticky top-0 bg-content-bg z-10">
        <div className="w-[200px] min-w-[200px] p-3 font-semibold text-sm border-r border-content-border bg-content-bg-secondary">
          Task
        </div>
        <div className="flex flex-1">
          {weeks.map((week, idx) => (
            <div
              key={idx}
              className="flex-1 min-w-[60px] p-2 text-center text-xs text-content-text-secondary border-r border-content-border"
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
          className="flex border-b border-content-border cursor-pointer hover:bg-content-bg-secondary"
          onClick={() => onTaskClick?.(task)}
        >
          <div className="w-[200px] min-w-[200px] p-3 text-sm border-r border-content-border flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', statusColors[task.status] || 'bg-content-text-tertiary')} />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px]">
              {task.title}
            </span>
          </div>
          <div className="relative flex-1 h-11">
            {/* Background grid lines */}
            <div className="absolute inset-0 flex">
              {weeks.map((_, idx) => (
                <div key={idx} className="flex-1 border-r border-content-border" />
              ))}
            </div>
            {/* Task bar */}
            <div
              className={cn('absolute h-6 rounded flex items-center px-2 min-w-[40px]', statusColors[task.status] || 'bg-content-text-tertiary')}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <span className="text-xs text-white overflow-hidden text-ellipsis whitespace-nowrap">
                {task.estimate ? `${task.estimate}h` : ''}
              </span>
            </div>
            {/* Priority indicator */}
            <div
              className={cn('absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full', priorityColors[task.priority || 'low'] || 'bg-content-text-tertiary')}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
