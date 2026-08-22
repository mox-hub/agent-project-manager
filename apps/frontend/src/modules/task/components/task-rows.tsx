/**
 * TaskRowsList - 任务行列表组件（对齐 design-system「Task Rows」规范）
 *
 * 结构（与 /app/design-system#task-rows 一致）:
 * - GroupRow: 可折叠的状态分组头（chevron + 状态图标 + 名称 + 计数 + 进度条 + hover 加号）
 * - 任务行: [缩进占位] 状态章 + 短 ID + 优先级图标 + 标题 + 子任务进度胶囊
 *           ｜ 右侧: 名称列 + 标签 + 里程碑药丸 + 截止日期 + 头像
 * - 子任务行: 缩进一行、弱化样式，跟随父任务渲染
 * - 组尾 "Add task" 行: 触发 onCreateTask(status)
 */

import { useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUp,
  Circle,
  Clock,
  Loader,
  Minus,
  Plus,
  User,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import type { BugSeverity, Task } from '../api/task-api';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
type RowPriority = 'urgent' | 'high' | 'medium' | 'low';

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'canceled'];

const STATUS_CFG: Record<TaskStatus, { label: string; Icon: ElementType; color: string; bg: string }> = {
  todo: { label: 'Todo', Icon: Circle, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' },
  in_progress: { label: 'In Progress', Icon: Loader, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/60' },
  in_review: { label: 'In Review', Icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/60' },
  done: { label: 'Done', Icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
  canceled: { label: 'Canceled', Icon: XCircle, color: 'text-slate-400', bg: 'bg-muted' },
};

const PRIORITY_CFG: Record<RowPriority, { label: string; Icon: ElementType; color: string }> = {
  urgent: { label: 'Urgent', Icon: ChevronsUp, color: 'text-red-500' },
  high: { label: 'High', Icon: ArrowUp, color: 'text-orange-500' },
  medium: { label: 'Medium', Icon: Minus, color: 'text-blue-500' },
  low: { label: 'Low', Icon: ArrowDown, color: 'text-slate-400' },
};

const SEVERITY_BAR: Record<BugSeverity, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-300',
};

const MILESTONE_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { bg: 'bg-violet-50 dark:bg-violet-950/50', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
];

const GROUP_PROGRESS_COLOR: Record<TaskStatus, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  in_review: 'bg-amber-500',
  done: 'bg-emerald-500',
  canceled: 'bg-slate-300',
};

const AVATAR_PALETTE = ['#6366F1', '#F59E0B', '#EF4444', '#10B981'];

function normalizeStatus(status: string): TaskStatus {
  return (STATUS_ORDER as string[]).includes(status) ? (status as TaskStatus) : 'todo';
}

function normalizePriority(priority: string | undefined): RowPriority {
  switch (priority) {
    case 'critical':
    case 'urgent':
      return 'urgent';
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function colorOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done' || task.status === 'canceled') return false;
  return new Date(task.dueDate) < new Date();
}

function formatDue(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatusChip({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <div className={cn('w-5.5 h-5.5 rounded-md flex items-center justify-center shrink-0', cfg.bg)} title={cfg.label}>
      <cfg.Icon
        className={cn('w-3.5 h-3.5', cfg.color, status === 'in_progress' && 'animate-spin')}
        style={status === 'in_progress' ? { animationDuration: '2s' } : undefined}
      />
    </div>
  );
}

function PriorityIcon({ priority }: { priority: RowPriority }) {
  const cfg = PRIORITY_CFG[priority];
  return <cfg.Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.color)} title={cfg.label} />;
}

function MilestoneSlot({ name, idx = 0 }: { name?: string | null; idx?: number }) {
  if (!name) return <span className="w-27.5 shrink-0" />;
  const c = MILESTONE_COLORS[idx % 4];
  return (
    <span className="w-27.5 shrink-0 overflow-hidden">
      <span className={cn('inline-flex items-center text-10 font-medium px-2 py-0.5 rounded-full border whitespace-nowrap truncate', c.bg, c.text, c.border)}>
        {name}
      </span>
    </span>
  );
}

function LabelChip({ name, color }: { name: string; color?: string | null }) {
  return (
    <span
      className="inline-flex items-center text-10 px-1.5 py-0.5 rounded-sm font-medium whitespace-nowrap"
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {name}
    </span>
  );
}

function ProgressRing({ done, total, size = 14 }: { done: number; total: number; size?: number }) {
  const r = (size - 2.5) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = total > 0 ? done / total : 0;
  const stroke = ratio === 1 ? '#10B981' : ratio > 0 ? '#3B82F6' : '#94A3B8';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeDasharray={`${ratio * circ} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function SubtaskBadge({ done, total }: { done: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border bg-muted/60 text-10 font-medium text-muted-foreground shrink-0 ml-1.5">
      <ProgressRing done={done} total={total} />
      <span>{done}/{total}</span>
    </span>
  );
}

function AssigneeAvatar({ initials, color }: { initials?: string; color?: string }) {
  if (!initials) {
    return (
      <div className="w-5.5 h-5.5 rounded-full bg-muted flex items-center justify-center shrink-0">
        <User className="h-3 w-3 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <div
      className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-white text-9 font-semibold shrink-0"
      style={{ backgroundColor: color || '#6366F1' }}
    >
      {initials}
    </div>
  );
}

function assigneeNameOf(task: Task): string | undefined {
  if (task.assignee) return task.assignee.displayName || task.assignee.username;
  if (task.aiAgent) return task.aiAgent.name;
  return undefined;
}

interface TaskRowData {
  task: Task;
  children: Task[];
}

interface TaskRowItemProps {
  task: Task;
  milestoneIdx: number;
  nameOf: (task: Task) => string | undefined;
  onTaskClick?: (task: Task) => void;
}

function TaskRowItem({ task, milestoneIdx, nameOf, onTaskClick }: TaskRowItemProps) {
  const status = normalizeStatus(task.status);
  const priority = normalizePriority(task.priority);
  const idLabel = task.shortId || task.externalIdentifier || task.id.slice(0, 8);
  const isDone = status === 'done' || status === 'canceled';
  const overdue = isOverdue(task);
  const secondaryName = nameOf(task);
  const assigneeName = assigneeNameOf(task);

  const todoTotal = task.todoItems?.length ?? task._count?.subTasks ?? 0;
  const todoDone = task.todoItems?.filter((item) => item.completed).length ?? 0;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-1.5 hover:bg-accent/20 transition-colors',
        onTaskClick ? 'cursor-pointer' : 'cursor-default',
      )}
      onClick={onTaskClick ? () => onTaskClick(task) : undefined}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-4 h-4 shrink-0" />
        {task.type === 'bug' && task.severity ? (
          <div className={cn('w-1 h-5 rounded-full shrink-0', SEVERITY_BAR[task.severity])} title={`Severity: ${task.severity}`} />
        ) : null}
        <StatusChip status={status} />
        <span className="w-15 shrink-0 text-11 font-mono text-muted-foreground/50 truncate">{idLabel}</span>
        <PriorityIcon priority={priority} />
        <p className={cn('flex-1 text-xs truncate min-w-0', isDone ? 'text-muted-foreground' : 'text-foreground')}>{task.title}</p>
        {todoTotal > 0 ? <SubtaskBadge done={todoDone} total={todoTotal} /> : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-20 text-11 text-muted-foreground truncate">{secondaryName ?? ''}</span>
        <div className="w-35 flex gap-1 overflow-hidden">
          {task.taskTags?.map(({ tag }) => <LabelChip key={tag.id} name={tag.name} color={tag.color} />)}
        </div>
        <MilestoneSlot name={task.milestone?.name} idx={milestoneIdx} />
        {task.dueDate ? (
          <div className={cn('w-18 flex items-center gap-1 text-11', overdue ? 'text-accent-red' : 'text-muted-foreground')}>
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">{formatDue(task.dueDate)}</span>
          </div>
        ) : (
          <div className="w-18" />
        )}
        <AssigneeAvatar
          initials={assigneeName ? initialsOf(assigneeName) : undefined}
          color={assigneeName ? colorOf(assigneeName) : undefined}
        />
      </div>
    </div>
  );
}

function SubTaskRowItem({ task, milestoneIdx, nameOf, onTaskClick }: TaskRowItemProps) {
  const status = normalizeStatus(task.status);
  const priority = normalizePriority(task.priority);
  const idLabel = task.shortId || task.externalIdentifier || task.id.slice(0, 8);
  const secondaryName = nameOf(task);
  const assigneeName = assigneeNameOf(task);

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-1 hover:bg-accent/20 transition-colors bg-muted/5',
        onTaskClick ? 'cursor-pointer' : 'cursor-default',
      )}
      onClick={onTaskClick ? () => onTaskClick(task) : undefined}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 pl-5">
        <span className="w-4 h-4 shrink-0" />
        <StatusChip status={status} />
        <span className="w-15 shrink-0 text-11 font-mono text-muted-foreground/40 truncate">{idLabel}</span>
        <PriorityIcon priority={priority} />
        <p className="flex-1 text-xs text-muted-foreground truncate min-w-0">{task.title}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-20 text-11 text-muted-foreground truncate">{secondaryName ?? ''}</span>
        <div className="w-35" />
        <MilestoneSlot name={task.milestone?.name} idx={milestoneIdx} />
        <div className="w-18" />
        <AssigneeAvatar
          initials={assigneeName ? initialsOf(assigneeName) : undefined}
          color={assigneeName ? colorOf(assigneeName) : undefined}
        />
      </div>
    </div>
  );
}

export interface TaskRowsListProps {
  tasks: Task[];
  loading?: boolean;
  emptyMessage?: string;
  onTaskClick?: (task: Task) => void;
  /** 组头加号与组尾 "Add task" 行的回调（按状态预设新建），不传则隐藏入口 */
  onCreateTask?: (status: string) => void;
  /** 右侧名称列（w-20）的内容，默认显示负责人/AI Agent 名，跨项目场景可传项目名 */
  secondaryLabel?: (task: Task) => string | undefined;
  className?: string;
}

export function TaskRowsList({
  tasks,
  loading,
  emptyMessage = 'No tasks found',
  onTaskClick,
  onCreateTask,
  secondaryLabel,
  className,
}: TaskRowsListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const nameOf = secondaryLabel ?? assigneeNameOf;

  const { groups, milestoneIdxMap } = useMemo(() => {
    const idxMap = new Map<string, number>();
    tasks.forEach((task) => {
      const name = task.milestone?.name;
      if (name && !idxMap.has(name)) idxMap.set(name, idxMap.size);
    });

    // 子任务（parentTaskId 命中同组可见父任务）缩进挂到父行下，其余按普通行展示
    const grouped = new Map<TaskStatus, TaskRowData[]>();
    const buckets = new Map<TaskStatus, TaskRowData[]>();
    tasks.forEach((task) => {
      const status = normalizeStatus(task.status);
      if (!buckets.has(status)) buckets.set(status, []);
      buckets.get(status)!.push({ task, children: [] });
    });
    buckets.forEach((rows, status) => {
      const idSet = new Set(rows.map((row) => row.task.id));
      const parents: TaskRowData[] = [];
      rows.forEach((row) => {
        const parentId = row.task.parentTaskId;
        const parent = parentId && idSet.has(parentId) ? parents.find((p) => p.task.id === parentId) : undefined;
        if (parent) {
          parent.children.push(row.task);
        } else {
          parents.push(row);
        }
      });
      grouped.set(status, parents);
    });

    return { groups: grouped, milestoneIdxMap: idxMap };
  }, [tasks]);

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-border overflow-hidden bg-background', className)}>
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
          <Spinner />
          <span>Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={cn('rounded-lg border border-border overflow-hidden bg-background', className)}>
        <div className="text-center py-16 text-muted-foreground text-sm">{emptyMessage}</div>
      </div>
    );
  }

  const toggleGroup = (status: TaskStatus) => {
    setCollapsedGroups((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden bg-background', className)}>
      {STATUS_ORDER.filter((status) => groups.get(status)?.length).map((status) => {
        const rows = groups.get(status)!;
        const cfg = STATUS_CFG[status];
        const collapsed = collapsedGroups[status] ?? false;

        const groupTaskCount = rows.reduce((sum, row) => sum + 1 + row.children.length, 0);
        const subDone = rows.reduce(
          (sum, row) => sum + (row.task.todoItems?.filter((item) => item.completed).length ?? 0),
          0,
        );
        const subTotal = rows.reduce(
          (sum, row) => sum + (row.task.todoItems?.length ?? row.task._count?.subTasks ?? 0),
          0,
        );

        return (
          <div key={status} className="group/status">
            <div
              className="flex items-center gap-3 px-4 py-2 bg-muted/25 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => toggleGroup(status)}
            >
              <button
                className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroup(status);
                }}
              >
                {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <div className={cn('w-5.5 h-5.5 rounded-md flex items-center justify-center shrink-0', cfg.bg)}>
                <cfg.Icon
                  className={cn('w-3.5 h-3.5', cfg.color, status === 'in_progress' && 'animate-spin')}
                  style={status === 'in_progress' ? { animationDuration: '2s' } : undefined}
                />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{cfg.label}</span>
              <span className="text-11 text-muted-foreground/50 font-mono">{groupTaskCount}</span>
              {subTotal > 0 ? (
                <div className="flex items-center gap-2 flex-1 max-w-45">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', GROUP_PROGRESS_COLOR[status])}
                      style={{ width: `${Math.round((subDone / subTotal) * 100)}%` }}
                    />
                  </div>
                  <span className="text-10 text-muted-foreground shrink-0">{subDone}/{subTotal}</span>
                </div>
              ) : null}
              {onCreateTask ? (
                <button
                  className="ml-auto opacity-0 group-hover/status:opacity-100 p-1 rounded hover:bg-accent transition-colors"
                  title={`Add task to ${cfg.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTask(status);
                  }}
                >
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              ) : null}
            </div>

            {!collapsed ? (
              <>
                {rows.map(({ task, children }) => (
                  <div key={task.id}>
                    <TaskRowItem
                      task={task}
                      milestoneIdx={task.milestone?.name ? milestoneIdxMap.get(task.milestone.name) ?? 0 : 0}
                      nameOf={nameOf}
                      onTaskClick={onTaskClick}
                    />
                    {children.map((child) => (
                      <SubTaskRowItem
                        key={child.id}
                        task={child}
                        milestoneIdx={child.milestone?.name ? milestoneIdxMap.get(child.milestone.name) ?? 0 : 0}
                        nameOf={nameOf}
                        onTaskClick={onTaskClick}
                      />
                    ))}
                  </div>
                ))}
                {onCreateTask ? (
                  <div
                    className="flex items-center gap-2 px-4 py-1.5 border-t border-border/50 text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/10 cursor-pointer transition-colors"
                    onClick={() => onCreateTask(status)}
                  >
                    <span className="w-4 shrink-0" />
                    <Plus className="w-3 h-3" />
                    <span className="text-xs">Add task</span>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
