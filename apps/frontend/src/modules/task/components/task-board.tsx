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
  low: { text: 'Enhancement', tone: 'bg-accent-purple-light text-accent-purple' },
  medium: { text: 'Feature', tone: 'bg-accent-blue-light text-accent-blue' },
  high: { text: 'Bug', tone: 'bg-accent-yellow-light text-accent-yellow' },
  critical: { text: 'Security', tone: 'bg-accent-red-light text-accent-red' },
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
    headerText: 'text-muted-foreground',
    headerBg: 'bg-muted/30',
    badge: 'bg-muted/50 text-muted-foreground',
    columnBg: 'bg-muted/20',
    columnBorder: 'border-border',
  },
  in_progress: {
    icon: Loader2,
    headerText: 'text-accent-blue',
    headerBg: 'bg-accent-blue-light/30',
    badge: 'bg-accent-blue-light/50 text-accent-blue',
    columnBg: 'bg-accent-blue-light/15',
    columnBorder: 'border-accent-blue/20',
  },
  in_review: {
    icon: AlertCircle,
    headerText: 'text-accent-yellow',
    headerBg: 'bg-accent-yellow-light/30',
    badge: 'bg-accent-yellow-light/50 text-accent-yellow',
    columnBg: 'bg-accent-yellow-light/15',
    columnBorder: 'border-accent-yellow/20',
  },
  done: {
    icon: CheckCircle2,
    headerText: 'text-accent-green',
    headerBg: 'bg-accent-green-light/30',
    badge: 'bg-accent-green-light/50 text-accent-green',
    columnBg: 'bg-accent-green-light/15',
    columnBorder: 'border-accent-green/20',
  },
  canceled: {
    icon: XCircle,
    headerText: 'text-muted-foreground',
    headerBg: 'bg-muted/30',
    badge: 'bg-muted/50 text-muted-foreground',
    columnBg: 'bg-muted/20',
    columnBorder: 'border-border',
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
                'flex min-h-[560px] flex-col overflow-hidden rounded-lg border transition-colors',
                theme.columnBg,
                theme.columnBorder,
                dragOverColumn === column.status && 'ring-2 ring-accent-blue/25',
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
                  <h3 className={cn('text-sm font-medium', theme.headerText)}>{column.title}</h3>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none', theme.badge)}>{columnTasks.length}</span>
                </div>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-background/70 hover:text-foreground dark:hover:bg-muted/50"
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
                        'space-y-2.5 rounded-lg border border-border bg-card px-3 py-3 shadow-sm transition-all duration-200',
                        'cursor-grab select-none active:cursor-grabbing hover:-translate-y-0.5 hover:border-border hover:shadow-md',
                        'dark:shadow-none',
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
                                tone: priorityChipClasses[task.priority]?.tone ?? 'bg-muted/50 text-muted-foreground',
                                color: '',
                              },
                            ]
                        ).map((label) => (
                          <span
                            key={label.id}
                            className={cn('inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium leading-none', label.tone)}
                            style={{
                              backgroundColor: label.tone ? undefined : `${label.color}1f`,
                              color: label.tone ? undefined : label.color,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                        {labels.length > 2 ? <span className="text-xs text-muted-foreground">+{labels.length - 2}</span> : null}
                      </div>

                      <h4 className="line-clamp-2 text-sm font-semibold leading-[1.35] text-foreground">{task.title}</h4>

                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium tracking-[0.01em] text-muted-foreground">{identifier}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-accent-blue" />
                          {task.dueDate ? (
                            <span className={cn('inline-flex items-center gap-1 text-xs font-medium', isOverdue ? 'text-accent-red' : 'text-muted-foreground')}>
                              <CalendarClock size={11} />
                              {dueDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {typeof task.estimate === 'number' ? <span className="text-xs font-medium text-muted-foreground">{task.estimate}</span> : null}
                          {(task._count?.dependencies ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Link2 size={11} />
                              {task._count?.dependencies}
                            </span>
                          ) : null}
                          {(task._count?.comments ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                              <MessageCircle size={11} />
                              {task._count?.comments}
                            </span>
                          ) : null}
                          {task.assignee ? (
                            <Avatar className="h-6 w-6 border border-white shadow-sm dark:border-border">
                              {task.assignee.avatarUrl ? <AvatarImage src={task.assignee.avatarUrl} alt={task.assignee.displayName} /> : null}
                              <AvatarFallback className="text-xs">
                                {(task.assignee.displayName || task.assignee.username).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">?</span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {columnTasks.length === 0 ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center rounded-lg border border-dashed border-border bg-card/85 text-xs text-muted-foreground dark:bg-card/70">
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
