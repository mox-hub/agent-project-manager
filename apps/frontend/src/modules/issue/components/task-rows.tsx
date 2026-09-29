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
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataListSkeleton } from '@/shared/components/data-list';
import { EmptyState } from '@/components/semantic/empty-state';
import { SubtaskBadge } from '@/components/semantic/subtask-badge';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { PRIORITY_VISUALS, TASK_STATUS_VISUALS } from '@/shared/status/status-visuals';
import type { Task } from '../api/issue-api';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
type RowPriority = 'urgent' | 'high' | 'medium' | 'low';

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'canceled'];

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  canceled: 'Canceled',
};

const MILESTONE_COLORS = [
  { bg: 'bg-accent-blue/10', text: 'text-accent-blue', border: 'border-accent-blue/30' },
  { bg: 'bg-accent-purple/10', text: 'text-accent-purple', border: 'border-accent-purple/30' },
  { bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/30' },
  { bg: 'bg-accent-yellow/10', text: 'text-accent-yellow', border: 'border-accent-yellow/30' },
];

const GROUP_PROGRESS_COLOR: Record<TaskStatus, string> = {
  todo: 'bg-muted-foreground/40',
  in_progress: 'bg-accent-blue',
  in_review: 'bg-accent-yellow',
  done: 'bg-accent-green',
  canceled: 'bg-muted',
};

const AVATAR_PALETTE = ['hsl(var(--chart-1))', 'hsl(var(--chart-4))', 'hsl(var(--accent-red))', 'hsl(var(--accent-green))'];

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

/** 业务层映射包装：status → tone/icon（status-visuals 唯一链路），视觉由 StatusIconFrame 统一承载 */
function StatusChip({ status }: { status: TaskStatus }) {
  const visual = TASK_STATUS_VISUALS[status];
  return (
    <StatusIconFrame
      icon={visual.icon}
      tone={visual.tone}
      size="list"
      spin={status === 'in_progress'}
      title={STATUS_LABEL[status]}
    />
  );
}

function PriorityIcon({ priority }: { priority: RowPriority }) {
  const visual = PRIORITY_VISUALS[priority];
  return <StatusIconFrame icon={visual.icon} tone={visual.tone} size="list" title={priority} />;
}

function MilestoneSlot({ name, idx = 0 }: { name?: string | null; idx?: number }) {
  if (!name) return <span className="w-27.5 shrink-0" />;
  const c = MILESTONE_COLORS[idx % 4];
  return (
    <span className="w-27.5 shrink-0 overflow-hidden">
      <span className={cn('inline-flex items-center text-2xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap truncate', c.bg, c.text, c.border)}>
        {name}
      </span>
    </span>
  );
}

function LabelChip({ name, color }: { name: string; color?: string | null }) {
  return (
    <span
      className="inline-flex items-center text-3xs px-1.5 py-0.5 rounded-sm font-medium whitespace-nowrap"
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {name}
    </span>
  );
}

function AssigneeAvatar({ initials, color }: { initials?: string; color?: string }) {
  if (!initials) {
    return (
      <div className="w-5.5 h-5.5 rounded-full border border-dashed border-border flex items-center justify-center shrink-0">
        <User className="h-3 w-3 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <div
      className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-white text-3xs font-semibold shrink-0"
      style={{ backgroundColor: color || 'hsl(var(--chart-3))' }}
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

  const todoTotal = task.todoItems?.length ?? task._count?.subIssues ?? 0;
  const todoDone = task.todoItems?.filter((item) => item.completed).length ?? 0;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-1.5 hover:bg-accent transition-colors',
        onTaskClick ? 'cursor-pointer' : 'cursor-default',
      )}
      onClick={onTaskClick ? () => onTaskClick(task) : undefined}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-4 h-4 shrink-0" />
        <StatusChip status={status} />
        <span className="w-15 shrink-0 text-2xs font-mono text-muted-foreground/50 truncate">{idLabel}</span>
        <PriorityIcon priority={priority} />
        <p className={cn('flex-1 text-xs truncate min-w-0', isDone ? 'text-muted-foreground' : 'text-foreground')}>{task.title}</p>
        {todoTotal > 0 ? <SubtaskBadge done={todoDone} total={todoTotal} /> : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-20 text-2xs text-muted-foreground truncate">{secondaryName ?? ''}</span>
        <div className="w-35 flex gap-1 overflow-hidden">
          {task.issueTags?.map(({ tag }) => <LabelChip key={tag.id} name={tag.name} color={tag.color} />)}
        </div>
        <MilestoneSlot name={task.milestone?.name} idx={milestoneIdx} />
        {task.dueDate ? (
          <div className={cn('w-18 flex items-center gap-1 text-2xs', overdue ? 'text-accent-red' : 'text-muted-foreground')}>
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
        'flex items-center gap-2 px-4 py-1 hover:bg-accent transition-colors bg-muted/5',
        onTaskClick ? 'cursor-pointer' : 'cursor-default',
      )}
      onClick={onTaskClick ? () => onTaskClick(task) : undefined}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 pl-5">
        <span className="w-4 h-4 shrink-0" />
        <StatusChip status={status} />
        <span className="w-15 shrink-0 text-2xs font-mono text-muted-foreground/40 truncate">{idLabel}</span>
        <PriorityIcon priority={priority} />
        <p className="flex-1 text-xs text-muted-foreground truncate min-w-0">{task.title}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-20 text-2xs text-muted-foreground truncate">{secondaryName ?? ''}</span>
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

    // 子任务（parentIssueId 命中同组可见父任务）缩进挂到父行下，其余按普通行展示
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
        const parentId = row.task.parentIssueId;
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
      <div className={cn('overflow-hidden rounded-lg border border-border bg-background', className)}>
        <DataListSkeleton grouping />
      </div>
    );
  }

  if (tasks.length === 0) {
    return <EmptyState title={emptyMessage} className={className} />;
  }

  const toggleGroup = (status: TaskStatus) => {
    setCollapsedGroups((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden bg-background', className)}>
      {STATUS_ORDER.filter((status) => groups.get(status)?.length).map((status) => {
        const rows = groups.get(status)!;
        const collapsed = collapsedGroups[status] ?? false;

        const groupTaskCount = rows.reduce((sum, row) => sum + 1 + row.children.length, 0);
        const subDone = rows.reduce(
          (sum, row) => sum + (row.task.todoItems?.filter((item) => item.completed).length ?? 0),
          0,
        );
        const subTotal = rows.reduce(
          (sum, row) => sum + (row.task.todoItems?.length ?? row.task._count?.subIssues ?? 0),
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
              <StatusIconFrame
                icon={TASK_STATUS_VISUALS[status].icon}
                tone={TASK_STATUS_VISUALS[status].tone}
                size="list"
                spin={status === 'in_progress'}
                title={STATUS_LABEL[status]}
              />
              <span className="text-xs font-semibold text-muted-foreground">{STATUS_LABEL[status]}</span>
              <span className="text-2xs text-muted-foreground/50 font-mono">{groupTaskCount}</span>
              {subTotal > 0 ? (
                <div className="flex items-center gap-2 flex-1 max-w-45">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', GROUP_PROGRESS_COLOR[status])}
                      style={{ width: `${Math.round((subDone / subTotal) * 100)}%` }}
                    />
                  </div>
                  <span className="text-3xs text-muted-foreground shrink-0">{subDone}/{subTotal}</span>
                </div>
              ) : null}
              {onCreateTask ? (
                <button
                  className="ml-auto opacity-0 group-hover/status:opacity-100 p-1 rounded-md hover:bg-accent transition-colors"
                  title={`Add task to ${STATUS_LABEL[status]}`}
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
                    className="flex items-center gap-2 px-4 py-1.5 border-t border-border/50 text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
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
