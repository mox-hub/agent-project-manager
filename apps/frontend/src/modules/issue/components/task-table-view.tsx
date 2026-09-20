import { useMemo, useState } from 'react';
import { type ColumnDef, type OnChangeFn, type SortingState } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { TASK_STATUS_VISUALS, TONE_TEXT_CLASS } from '@/shared/status/status-visuals';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { ListAvatar, ListDate } from '@/components/ui/data-list';
import { AiExecutionBadge } from '@/shared/components/ai-execution-badge';
import { IssueTypePill } from '@/shared/components/issue-type-pill';
import type { Task } from '../api/issue-api';
import { useIssueTypeOf } from '../hooks/use-issue-types';
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
  /**
   * 列显隐（P1-14）：「展示属性」chips 下发的开关表，键为展示属性 key
   * （id/status/assignee/priority/project/estimate/dueDate/labels/created/updated/aiExecution），
   * 值 false = 隐藏该列；不传 = 全部展示。
   */
  displayProperties?: Record<string, boolean>;
  /** 受控排序（P1-14）：页面级排序状态（与「显示」菜单 Ordering 同源），键 = 列 key */
  sorting?: { orderBy: string; orderDirection: 'asc' | 'desc' };
  /** 表头点击排序回调：上报新的排序键与方向（页面收口后回灌 sorting） */
  onSortChange?: (orderBy: string, orderDirection: 'asc' | 'desc') => void;
  maxHeight?: string;
  className?: string;
}

/** 展示属性 key → 表格列 id（仅 'id' 与列 shortId 名不同，其余同名对齐） */
const PROPERTY_TO_COLUMN: Record<string, string> = {
  id: 'shortId',
  status: 'status',
  assignee: 'assignee',
  priority: 'priority',
  project: 'project',
  estimate: 'estimate',
  dueDate: 'dueDate',
  labels: 'labels',
  created: 'created',
  updated: 'updated',
  aiExecution: 'aiExecution',
};

/** 全部可切换列的属性 key（页面据此初始化开关表与 chips 集合） */
export const TASK_TABLE_PROPERTY_KEYS = Object.keys(PROPERTY_TO_COLUMN);

const PRIORITY_CONFIG = {
  critical: { icon: ChevronsUp, color: 'text-accent-red', label: 'Critical' },
  high: { icon: ArrowUp, color: 'text-accent-yellow', label: 'High' },
  medium: { icon: Minus, color: 'text-accent-blue', label: 'Medium' },
  low: { icon: ArrowDown, color: 'text-muted-foreground', label: 'Low' },
};

const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/** 排序取值口径（accessorFn 与页面级 comparator 保持同源，避免表头排序与菜单排序互相打架） */
export const assigneeNameOf = (task: Task) =>
  task.assignee?.displayName || task.assignee?.username || task.aiAgent?.name || '';
export const issueTimeOf = (value: string | null | undefined) =>
  value ? new Date(value).getTime() : 0;

export function TaskTableView({
  tasks,
  loading = false,
  onTaskClick,
  getAiExecution,
  getProjectName,
  selectionActions,
  displayProperties,
  sorting,
  onSortChange,
  maxHeight = 'calc(100vh - 220px)',
  className,
}: TaskTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const issueTypeOf = useIssueTypeOf();

  const columns = useMemo<ColumnDef<Task, unknown>[]>(() => {
    return [
      {
        id: 'shortId',
        // accessorFn 让表头真正可排序（此前仅 id 无 accessor，getCanSort 恒 false → 死开关）
        accessorFn: (task) => task.shortId || task.externalIdentifier || task.id.slice(0, 8),
        header: 'ID',
        size: 90,
        cell: ({ row }) => {
          const task = row.original;
          const id = task.shortId || task.externalIdentifier || task.id.slice(0, 8);
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <IssueTypePill meta={issueTypeOf(task)} variant="frame" />
              <span>{id}</span>
            </div>
          );
        },
      },
      {
        id: 'title',
        accessorFn: (task) => task.title,
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
        accessorFn: (task) => (getAiExecution?.(task)?.isExecuting ? 1 : 0),
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
        accessorFn: (task) => task.status || 'todo',
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
        accessorFn: (task) => PRIORITY_RANK[task.priority || 'medium'] ?? 0,
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
        accessorFn: (task) => assigneeNameOf(task),
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
        accessorFn: (task) => getProjectName?.(task.projectId) ?? '',
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
        accessorFn: (task) => task.estimate ?? 0,
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
        accessorFn: (task) => issueTimeOf(task.dueDate),
        header: 'Due Date',
        size: 100,
        cell: ({ row }) => {
          const due = row.original.dueDate;
          const isOverdue = due && row.original.status !== 'done' && row.original.status !== 'canceled' && new Date(due) < new Date();
          return <ListDate value={due} overdue={isOverdue} />;
        },
      },
      {
        id: 'labels',
        accessorFn: (task) => task.issueTags?.[0]?.tag?.name ?? '',
        header: 'Labels',
        size: 110,
        cell: ({ row }) => {
          const tags = row.original.issueTags ?? [];
          if (tags.length === 0) return <span className="text-xs text-muted-foreground/40">-</span>;
          return (
            <div className="flex items-center gap-1 overflow-hidden">
              {tags.slice(0, 2).map(({ tag }) => (
                <span
                  key={tag.id}
                  className="shrink-0 rounded-full border border-border bg-muted/50 px-1.5 py-0.2 text-10 text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
              {tags.length > 2 ? (
                <span className="shrink-0 text-10 text-muted-foreground">+{tags.length - 2}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'created',
        accessorFn: (task) => issueTimeOf(task.createdAt),
        header: 'Created',
        size: 100,
        cell: ({ row }) => <ListDate value={row.original.createdAt} />,
      },
      {
        id: 'updated',
        accessorFn: (task) => issueTimeOf(task.updatedAt),
        header: 'Updated',
        size: 100,
        cell: ({ row }) => <ListDate value={row.original.updatedAt} />,
      },
    ];
  }, [getAiExecution, getProjectName, issueTypeOf]);

  // 列显隐（P1-14）：按展示属性 key 对齐列 id；未传开关表 = 全部展示
  const visibleColumns = useMemo(() => {
    if (!displayProperties) return columns;
    return columns.filter((column) => {
      const propertyKey = Object.keys(PROPERTY_TO_COLUMN).find(
        (key) => PROPERTY_TO_COLUMN[key] === column.id,
      );
      // 不在开关表内的列（如未来的扩展列）默认展示
      if (!propertyKey) return true;
      return displayProperties[propertyKey] !== false;
    });
  }, [columns, displayProperties]);

  // 受控排序（P1-14）：页面级 orderBy/orderDirection ↔ tanstack SortingState
  const sortingState: SortingState = useMemo(() => {
    if (!sorting?.orderBy) return [];
    return [{ id: sorting.orderBy, desc: sorting.orderDirection === 'desc' }];
  }, [sorting]);

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sortingState) : updater;
    // 表头三态循环点击到「清除」时回落默认排序（priority desc，与页面初值一致）
    if (next.length === 0) {
      onSortChange?.('priority', 'desc');
      return;
    }
    onSortChange?.(next[0].id, next[0].desc ? 'desc' : 'asc');
  };

  return (
    <div className={cn('w-full', className)}>
      <DataTable<Task>
        columns={visibleColumns}
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
        sorting={sortingState}
        onSortingChange={onSortChange ? handleSortingChange : undefined}
        pageSize={50}
        stickyHeader
        maxHeight={maxHeight}
        emptyContent={
          <div className="p-8 text-center text-sm text-muted-foreground">
            {loading ? '任务加载中…' : '暂无任务'}
          </div>
        }
      />
    </div>
  );
}
