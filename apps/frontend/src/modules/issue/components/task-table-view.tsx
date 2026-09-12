import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { TASK_STATUS_VISUALS, TONE_TEXT_CLASS } from '@/shared/status/status-visuals';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { ListAvatar, ListDate } from '@/components/ui/data-list';
import { AiExecutionBadge } from '@/shared/components/ai-execution-badge';
import type { Task } from '../api/issue-api';
import type { ActiveAiExecution } from '@/modules/execution/hooks/use-active-executions-map';
import { ArrowDown, ArrowUp, ChevronsUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskTableViewProps {
  tasks: Task[];
  loading?: boolean;
  onTaskClick?: (task: Task) => void;
  getAiExecution?: (task: Task) => ActiveAiExecution | null;
  getProjectName?: (projectId: string | null | undefined) => string;
  selectionActions?: (selected: Task[], clear: () => void) => React.ReactNode;
  className?: string;
}

const PRIORITY_CONFIG = {
  critical: { icon: ChevronsUp, color: 'text-accent-red', label: 'Critical' },
  high: { icon: ArrowUp, color: 'text-accent-yellow', label: 'High' },
  medium: { icon: Minus, color: 'text-accent-blue', label: 'Medium' },
  low: { icon: ArrowDown, color: 'text-muted-foreground', label: 'Low' },
};

export function TaskTableView({
  tasks,
  loading = false,
  onTaskClick,
  getAiExecution,
  getProjectName,
  selectionActions,
  className,
}: TaskTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const columns = useMemo<ColumnDef<Task, unknown>[]>(() => {
    return [
      {
        id: 'shortId',
        header: 'ID',
        size: 90,
        cell: ({ row }) => {
          const task = row.original;
          const id = task.shortId || task.externalIdentifier || task.id.slice(0, 8);
          const isBug = task.type === 'bug';
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span
                className={cn(
                  'h-3.5 w-1 rounded-full',
                  isBug ? 'bg-destructive' : 'bg-accent-blue',
                )}
              />
              <span>{id}</span>
            </div>
          );
        },
      },
      {
        id: 'title',
        header: 'Title',
        cell: ({ row }) => {
          const task = row.original;
          const todoTotal = task.todoItems?.length ?? task._count?.subIssues ?? 0;
          const todoDone = task.todoItems?.filter((item) => item.completed).length ?? 0;
          const ai = getAiExecution?.(task);

          return (
            <div className="flex items-center gap-2 min-w-0">
              {ai ? (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-accent-purple ring-2 ring-accent-purple/30 animate-pulse"
                  title="AI 接管执行中"
                />
              ) : null}
              <span className="truncate font-medium text-foreground">{task.title}</span>
              {todoTotal > 0 ? (
                <span className="shrink-0 rounded-full border border-border bg-muted/60 px-1.5 py-0.2 text-10 text-muted-foreground">
                  {todoDone}/{todoTotal}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'aiExecution',
        header: 'AI 接管状态',
        size: 140,
        cell: ({ row }) => {
          const task = row.original;
          const ai = getAiExecution?.(task);
          if (!ai) {
            return <span className="text-xs text-muted-foreground/40">-</span>;
          }
          return <AiExecutionBadge execution={ai} size="xs" variant="pill" />;
        },
      },
      {
        id: 'status',
        header: 'Status',
        size: 110,
        cell: ({ row }) => {
          const status = row.original.status || 'todo';
          const visual = TASK_STATUS_VISUALS[status] ?? TASK_STATUS_VISUALS.todo;
          return (
            <div className="flex items-center gap-1.5">
              <StatusIconFrame
                icon={visual.icon}
                tone={visual.tone}
                size="xs"
              />
              <span className={cn('text-xs capitalize', TONE_TEXT_CLASS[visual.tone])}>
                {status.replace('_', ' ')}
              </span>
            </div>
          );
        },
      },
      {
        id: 'priority',
        header: 'Priority',
        size: 90,
        cell: ({ row }) => {
          const priority = row.original.priority || 'medium';
          const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
          const Icon = cfg.icon;
          return (
            <div className="flex items-center gap-1 text-xs">
              <Icon className={cn('size-3.5', cfg.color)} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          );
        },
      },
      {
        id: 'assignee',
        header: 'Assignee',
        size: 130,
        cell: ({ row }) => {
          const task = row.original;
          const name = task.assignee?.displayName || task.assignee?.username || task.aiAgent?.name;
          if (!name) return <span className="text-xs text-muted-foreground/50">Unassigned</span>;
          return (
            <div className="flex items-center gap-1.5">
              <ListAvatar name={name} url={task.assignee?.avatarUrl} />
              <span className="truncate text-xs text-foreground">{name}</span>
            </div>
          );
        },
      },
      {
        id: 'project',
        header: 'Project',
        size: 110,
        cell: ({ row }) => {
          const name = getProjectName?.(row.original.projectId);
          if (!name) return <span className="text-xs text-muted-foreground/40">-</span>;
          return <span className="truncate text-xs text-muted-foreground">{name}</span>;
        },
      },
      {
        id: 'estimate',
        header: 'Estimate',
        size: 80,
        cell: ({ row }) => {
          const est = row.original.estimate;
          if (!est) return <span className="text-xs text-muted-foreground/40">-</span>;
          return <span className="font-mono text-xs text-muted-foreground">{est}h</span>;
        },
      },
      {
        id: 'dueDate',
        header: 'Due Date',
        size: 100,
        cell: ({ row }) => {
          const due = row.original.dueDate;
          const isOverdue = due && row.original.status !== 'done' && row.original.status !== 'canceled' && new Date(due) < new Date();
          return <ListDate value={due} overdue={isOverdue} />;
        },
      },
    ];
  }, [getAiExecution, getProjectName]);

  return (
    <div className={cn('w-full', className)}>
      <DataTable<Task>
        columns={columns}
        data={tasks}
        getRowId={(task) => task.id}
        onRowClick={onTaskClick}
        enableSelection={!!selectionActions}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        selectionActions={
          selectionActions
            ? (selectedRows, clear) => selectionActions(selectedRows, clear)
            : undefined
        }
        pageSize={50}
        emptyContent={
          <div className="p-8 text-center text-sm text-muted-foreground">
            {loading ? 'Loading tasks...' : 'No tasks to display'}
          </div>
        }
      />
    </div>
  );
}
