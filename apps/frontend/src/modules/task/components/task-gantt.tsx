import { useMemo } from 'react';
import { GanttChart, type GanttDateRange, type GanttChartItem } from '@/shared/components/gantt-chart';
import type { Task } from '../api/task-api';

interface TaskGanttProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onDateRangeChange?: (taskId: string, range: { startDate: string; dueDate: string }) => Promise<void> | void;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function mapTaskToRange(task: Task): { startDate: string; endDate: string } | null {
  const due = parseDate(task.dueDate);
  if (!due) return null;

  const explicitStart = parseDate(task.startDate);
  if (explicitStart) {
    const start = explicitStart <= due ? explicitStart : due;
    const end = explicitStart <= due ? due : explicitStart;
    return { startDate: toDateOnly(start), endDate: toDateOnly(end) };
  }

  const durationDays = Math.max(1, Math.ceil((task.estimate ?? 8) / 8));
  const derivedStart = addDays(due, -(durationDays - 1));
  return {
    startDate: toDateOnly(derivedStart),
    endDate: toDateOnly(due),
  };
}

export function TaskGantt({ tasks, onTaskClick, onDateRangeChange }: TaskGanttProps) {
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const items = useMemo<GanttChartItem[]>(() => {
    return tasks.reduce<GanttChartItem[]>((acc, task) => {
      const range = mapTaskToRange(task);
      if (!range) return acc;
      acc.push({
          id: task.id,
          title: task.title,
          startDate: range.startDate,
          endDate: range.endDate,
          status: task.status,
          priority: task.priority,
          meta: task.estimate ? `${task.estimate}h` : undefined,
      });
      return acc;
    }, []);
  }, [tasks]);

  const handleItemClick = (itemId: string) => {
    const task = taskMap.get(itemId);
    if (task) onTaskClick?.(task);
  };

  const handleDateChange = (itemId: string, range: GanttDateRange) => {
    return onDateRangeChange?.(itemId, {
      startDate: range.startDate,
      dueDate: range.endDate,
    });
  };

  return (
    <GanttChart
      items={items}
      onItemClick={handleItemClick}
      onItemDateChange={handleDateChange}
      leftColumnTitle="Task"
      emptyMessage="No tasks with valid dates to display"
    />
  );
}
