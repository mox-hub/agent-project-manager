import { useMemo, useState, type ComponentType, type DragEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Task } from '@/modules/task/api/task-api';
import { AlertCircle, CalendarClock, CheckCircle2, Circle, Link2, Loader2, MessageCircle, Plus, XCircle } from 'lucide-react';

export interface TaskBoardColumn {
  id: string;
  title: string;
  status: string;
  wipLimit?: number;
}

export interface TaskBoardProps {
  projectId: string;
  tasks: Task[];
  columns: TaskBoardColumn[];
  loading?: boolean;
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatus: string) => void;
  onCreateTask?: (_status: string) => void;
}

const priorityChipClasses: Record<string, { text: string; tone: string }> = {
  low: { text: 'Enhancement', tone: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
  medium: { text: 'Feature', tone: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' },
  high: { text: 'Bug', tone: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300' },
  critical: { text: 'Security', tone: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300' },
};

const statusTheme: Record<string, {
  icon: ComponentType<{ size?: number; className?: string }>;
  headerText: string;
  headerBg: string;
  badge: string;
  columnBg: string;
  columnBorder: string;
}> = {
  todo: {
    icon: Circle,
    headerText: 'text-slate-600 dark:text-slate-300',
    headerBg: 'bg-slate-50 dark:bg-slate-900/70',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    columnBg: 'bg-slate-100/70 dark:bg-slate-900/55',
    columnBorder: 'border-slate-200 dark:border-slate-700',
  },
  in_progress: {
    icon: Loader2,
    headerText: 'text-blue-600 dark:text-blue-300',
    headerBg: 'bg-blue-50 dark:bg-blue-950/40',
    badge: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    columnBg: 'bg-blue-50/70 dark:bg-blue-950/30',
    columnBorder: 'border-blue-200 dark:border-blue-800',
  },
  in_review: {
    icon: AlertCircle,
    headerText: 'text-amber-600 dark:text-amber-300',
    headerBg: 'bg-amber-50 dark:bg-amber-950/40',
    badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    columnBg: 'bg-amber-50/70 dark:bg-amber-950/30',
    columnBorder: 'border-amber-200 dark:border-amber-800',
  },
  done: {
    icon: CheckCircle2,
    headerText: 'text-emerald-600 dark:text-emerald-300',
    headerBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    columnBg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    columnBorder: 'border-emerald-200 dark:border-emerald-800',
  },
  canceled: {
    icon: XCircle,
    headerText: 'text-slate-500 dark:text-slate-400',
    headerBg: 'bg-slate-50 dark:bg-slate-900/70',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    columnBg: 'bg-slate-100/70 dark:bg-slate-900/55',
    columnBorder: 'border-slate-200 dark:border-slate-700',
  },
};
const BOARD_RENDER_NOW = Date.now();

export function TaskBoard({
  tasks,
  columns,
  loading,
  onTaskClick,
  onTaskMove,
  onCreateTask,
}: TaskBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const taskMap = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    for (const column of columns) grouped.set(column.status, []);
    for (const task of tasks) {
      const key = task.status || 'todo';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(task);
    }
    return grouped;
  }, [columns, tasks]);

  const handleDragStart = (event: DragEvent, taskId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (event: DragEvent, status: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDrop = (event: DragEvent, status: string) => {
    event.preventDefault();
    const taskId = draggedTaskId ?? event.dataTransfer.getData('text/plain');
    if (!taskId) {
      handleDragEnd();
      return;
    }
    const task = tasks.find((item) => item.id === taskId);
    if (task && task.status !== status) {
      onTaskMove?.(taskId, status);
    }
    handleDragEnd();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="h-full overflow-x-auto pb-1">
      <div
        className="grid min-w-[1280px] gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(248px, 1fr))` }}
      >
        {columns.map((column) => {
          const columnTasks = taskMap.get(column.status) ?? [];
          const theme = statusTheme[column.status] ?? statusTheme.todo;
          const StatusIcon = theme.icon;

          return (
            <section
              key={column.id}
              className={cn(
                'flex min-h-[560px] flex-col overflow-hidden rounded-xl border transition-colors',
                theme.columnBg,
                theme.columnBorder,
                dragOverColumn === column.status && 'ring-2 ring-blue-500/25 dark:ring-blue-400/30',
              )}
              onDragOver={(event) => handleDragOver(event, column.status)}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              <header className={cn('flex h-10 items-center justify-between border-b px-3', theme.headerBg, theme.columnBorder)}>
                <div className="flex items-center gap-2">
                  <StatusIcon
                    size={13}
                    className={cn(theme.headerText, column.status === 'in_progress' ? 'animate-spin [animation-duration:3s]' : '')}
                  />
                  <h3 className={cn('text-[13px] font-medium', theme.headerText)}>{column.title}</h3>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none', theme.badge)}>{columnTasks.length}</span>
                </div>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  onClick={() => onCreateTask?.(column.status)}
                  aria-label={`Create task in ${column.title}`}
                >
                  <Plus size={12} />
                </button>
              </header>

              <div className="flex flex-1 flex-col gap-2 p-2">
                {columnTasks.map((task) => {
                  const labels = task.taskTags?.map(({ tag }) => tag).filter(Boolean) ?? [];
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                  const isOverdue = !!dueDate && dueDate.getTime() < BOARD_RENDER_NOW;
                  const identifier = `APM-${task.id.slice(0, 4).toUpperCase()}`;
                  const isDragging = draggedTaskId === task.id;

                  return (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        'space-y-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_1px_0_rgba(16,24,40,0.02)] transition-all duration-200',
                        'cursor-grab select-none active:cursor-grabbing hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_6px_14px_rgba(15,23,42,0.08)]',
                        'dark:border-slate-700 dark:bg-slate-900 dark:shadow-none dark:hover:border-slate-600',
                        isDragging && 'scale-[0.985] opacity-70',
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1">
                        {(labels.length
                          ? labels.slice(0, 2).map((label) => ({
                              id: label.id,
                              name: label.name,
                              tone: '',
                              color: label.color ?? '#64748b',
                            }))
                          : [
                              {
                                id: `priority-${task.id}`,
                                name: priorityChipClasses[task.priority]?.text ?? 'Task',
                                tone: priorityChipClasses[task.priority]?.tone ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                                color: '',
                              },
                            ]
                        ).map((label) => (
                          <span
                            key={label.id}
                            className={cn('inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-medium leading-none', label.tone)}
                            style={{
                              backgroundColor: label.tone ? undefined : `${label.color}1f`,
                              color: label.tone ? undefined : label.color,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                        {labels.length > 2 ? <span className="text-[10px] text-muted-foreground">+{labels.length - 2}</span> : null}
                      </div>

                      <h4 className="line-clamp-2 text-[14px] font-semibold leading-[1.35] text-foreground">{task.title}</h4>

                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium tracking-[0.01em] text-slate-500 dark:text-slate-400">{identifier}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                          {task.dueDate ? (
                            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', isOverdue ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
                              <CalendarClock size={11} />
                              {dueDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {typeof task.estimate === 'number' ? <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{task.estimate}</span> : null}
                          {(task._count?.dependencies ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <Link2 size={11} />
                              {task._count?.dependencies}
                            </span>
                          ) : null}
                          {(task._count?.comments ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <MessageCircle size={11} />
                              {task._count?.comments}
                            </span>
                          ) : null}
                          {task.assignee ? (
                            <Avatar className="h-[22px] w-[22px] border border-white shadow-sm dark:border-slate-700">
                              {task.assignee.avatarUrl ? <AvatarImage src={task.assignee.avatarUrl} alt={task.assignee.displayName} /> : null}
                              <AvatarFallback className="text-[10px]">
                                {(task.assignee.displayName || task.assignee.username).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">?</span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {columnTasks.length === 0 ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/85 text-xs text-muted-foreground dark:border-slate-700 dark:bg-slate-900/70">
                    Drag task here
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
