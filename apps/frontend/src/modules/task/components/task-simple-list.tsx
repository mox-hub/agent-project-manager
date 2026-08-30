/**
 * TaskSimpleList - 任务页试点：基于自建 DataList 的任务列表适配
 *
 * 配置要点：
 * - 首要信息区（多选框右侧）：短ID + 优先级图标 + 标题
 * - 次要信息区（行最右）：项目名 + 标签 + 里程碑 + 截止日期 + 责任人头像
 * - 分组：按页面传入的 groupBy 元数据（status / severity / project / none）展示 grouping bar 手风琴
 * - 多选：DataList 内置悬浮胶囊，快捷操作由页面通过 onBatchActions 提供
 */

import { useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronsUp,
  Circle,
  Loader,
  Minus,
  XCircle,
} from 'lucide-react';
import { ListAvatar, ListChip, ListDate, ListIcon, ListText, DataList } from '@/components/ui/data-list';
import type { MenuItem } from '@/components/ui/context-menu';
import {
  useUpdateTask,
  useDeleteTask,
  useCreateSubTask,
  useCreateTask,
} from '../hooks/use-project-tasks';
import { buildTaskRowMenu } from '@/shared/context-menu/row-context-menu';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useMembers } from '@/modules/team-member/hooks';
import { useTags } from '@/modules/core-config/hooks/use-metadata';
import type { Task } from '../api/task-api';
import { cn } from '@/lib/utils';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
type RowPriority = 'urgent' | 'high' | 'medium' | 'low';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'canceled'];

// 状态/优先级配色与项目侧统一（shared/status/status-visuals 的 tone → accent token）
const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; order: number }> = {
  todo: { label: 'Todo', icon: Circle, color: 'text-muted-foreground', order: 0 },
  in_progress: { label: 'In Progress', icon: Loader, color: 'text-accent-blue', order: 1 },
  in_review: { label: 'In Review', icon: AlertCircle, color: 'text-accent-yellow', order: 2 },
  done: { label: 'Done', icon: CheckCircle2, color: 'text-accent-green', order: 3 },
  canceled: { label: 'Canceled', icon: XCircle, color: 'text-muted-foreground', order: 4 },
};

const SEVERITY_CONFIG: Record<Severity, { label: string; dotColor: string; order: number }> = {
  critical: { label: 'Critical', dotColor: 'bg-accent-red', order: 0 },
  high: { label: 'High', dotColor: 'bg-accent-yellow', order: 1 },
  medium: { label: 'Medium', dotColor: 'bg-accent-blue', order: 2 },
  low: { label: 'Low', dotColor: 'bg-muted-foreground', order: 3 },
};

const PRIORITY_CONFIG: Record<RowPriority, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  urgent: { icon: ChevronsUp, color: 'text-accent-red' },
  high: { icon: ArrowUp, color: 'text-accent-yellow' },
  medium: { icon: Minus, color: 'text-accent-blue' },
  low: { icon: ArrowDown, color: 'text-muted-foreground' },
};

const SEVERITY_BAR: Record<Severity, string> = {
  critical: 'bg-destructive',
  high: 'bg-accent-orange',
  medium: 'bg-accent-yellow',
  low: 'bg-muted',
};

function normalizeStatus(status: string | undefined): TaskStatus {
  return (STATUS_ORDER as string[]).includes(status ?? '') ? (status as TaskStatus) : 'todo';
}

function priorityOf(task: Task): RowPriority {
  switch (task.priority) {
    case 'critical':
      return 'urgent';
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
}

function severityOf(task: Task): Severity {
  return (['critical', 'high', 'medium', 'low'] as Severity[]).includes(task.severity as Severity)
    ? (task.severity as Severity)
    : task.priority === 'critical'
      ? 'critical'
      : task.priority === 'high'
        ? 'high'
        : task.priority === 'low'
          ? 'low'
          : 'medium';
}

function idOf(task: Task): string {
  return task.shortId || task.externalIdentifier || task.id.slice(0, 8);
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done' || task.status === 'canceled') return false;
  return new Date(task.dueDate) < new Date();
}

function assigneeNameOf(task: Task): string | undefined {
  if (task.assignee?.displayName || task.assignee?.username) return task.assignee.displayName || task.assignee.username;
  return task.aiAgent?.name;
}

const AVATAR_PALETTE = ['#6366F1', '#F59E0B', '#EF4444', '#10B981'];

function colorOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// ===== 子任务胶囊（对齐 design-system「SubtaskBadge — progress ring + count capsule」标准） =====

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
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground ml-1.5">
      <ProgressRing done={done} total={total} size={16} />
      <span>{done}/{total}</span>
    </span>
  );
}

export type TaskSimpleGroupBy = 'status' | 'severity' | 'project' | 'none';

export interface TaskSimpleListProps {
  tasks: Task[];
  loading?: boolean;
  emptyMessage?: string;
  onTaskClick?: (task: Task) => void;
  /** 页面提供的 grouping 条件（默认 none = 不分组） */
  groupBy?: TaskSimpleGroupBy;
  /** 分组内添加入口回调 */
  onGroupCreate?: (key: string, items: Task[]) => void;
  /** 分组进度：页面提供完成条件（此处返回任务完成数/总数） */
  groupProgress?: (items: Task[]) => { done: number; total: number } | null;
  getProjectName?: (projectId: string | null | undefined) => string;
  /** 多选快捷操作按钮组 */
  selectionActions?: (selected: Task[], close: () => void) => React.ReactNode;
  className?: string;
}

export function TaskSimpleList({
  tasks,
  loading,
  emptyMessage = 'No tasks',
  onTaskClick,
  groupBy = 'none',
  onGroupCreate,
  groupProgress,
  getProjectName,
  selectionActions,
  className,
}: TaskSimpleListProps) {
  const groupFn = groupBy === 'none' ? undefined : (task: Task) => groupValue(groupBy, task);

  const groupMeta = (key: string, items: Task[]) => {
    switch (groupBy) {
      case 'status': {
        const cfg = STATUS_CONFIG[normalizeStatus(key)] ?? STATUS_CONFIG.todo;
        const Icon = cfg.icon;
        return { label: cfg.label, icon: <Icon className={cn('size-4', cfg.color)} />, order: cfg.order };
      }
      case 'severity': {
        const cfg = SEVERITY_CONFIG[severityOf({ ...items[0], severity: key } as Task)] ?? SEVERITY_CONFIG.medium;
        return { label: cfg.label, order: cfg.order };
      }
      case 'project': {
        return {
          label: getProjectName?.(key) ?? key,
          order: 0,
        };
      }
      default:
        return { label: key };
    }
  };

  const progress = (items: Task[]) =>
    groupProgress ? groupProgress(items) : { done: items.filter((t) => t.status === 'done' || t.status === 'canceled').length, total: items.length };

  // —— 统一行右键菜单 ——
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createSubTask = useCreateSubTask();
  const createTask = useCreateTask();
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const confirmAction = useConfirm();

  // 真实元数据（负责人候选 + 可用标签）
  const membersQuery = useMembers({ limit: 200 });
  const tagsQuery = useTags();
  const assignees = (membersQuery.data?.items ?? []).map((m) => ({
    id: m.id,
    displayName: m.displayName,
    handle: m.handle,
    avatarUrl: m.avatarUrl,
  }));
  const tagOptions = (tagsQuery.data ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color }));

  const onItemContextMenu = (task: Task): MenuItem[] =>
    buildTaskRowMenu({
      task,
      assignees,
      tags: tagOptions,
      pinned: pinnedIds.has(task.id),
      onTogglePin: () =>
        setPinnedIds((prev) => {
          const next = new Set(prev);
          if (next.has(task.id)) next.delete(task.id);
          else next.add(task.id);
          return next;
        }),
      onUpdate: (data) => updateTask.mutate({ taskId: task.id, data }),
      onDelete: async () => {
        const ok = await confirmAction({
          title: `删除任务「${task.title}」？`,
          description: '该操作会删除此任务及其子任务，且不可撤销。',
          confirmText: '删除',
          cancelText: '取消',
          variant: 'destructive',
        });
        if (ok) deleteTask.mutate(task.id);
      },
      onCreateChild: () => {
        const title = window.prompt('输入子任务标题');
        if (title?.trim()) {
          createSubTask.mutate({ parentTaskId: task.id, title: title.trim() });
        }
      },
      onCreateParent: () => {
        const title = window.prompt('输入父任务标题');
        if (!title?.trim()) return;
        createTask.mutate(
          { title: title.trim(), projectId: task.projectId ?? undefined },
          {
            onSuccess: (parent) =>
              updateTask.mutate({ taskId: task.id, data: { parentTaskId: parent.id } as never }),
          },
        );
      },
    });

  return (
    <DataList
      items={tasks}
      loading={loading}
      emptyMessage={emptyMessage}
      className={className}
      selectable
      groupBy={groupFn}
      groupLabel={groupMeta}
      renderGroupProgress={progress}
      onGroupCreate={onGroupCreate}
      onItemClick={onTaskClick}
      onItemContextMenu={onItemContextMenu}
      selectionActions={selectionActions}
      renderLeading={(task) => {
        const todoTotal = task.todoItems?.length ?? task._count?.subTasks ?? 0;
        const todoDone = task.todoItems?.filter((item) => item.completed).length ?? 0;
        return (
          <>
            {task.type === 'bug' ? (
              <span className={cn('h-6 w-1.5 shrink-0 rounded-full', SEVERITY_BAR[severityOf(task)])} />
            ) : null}
            {/* ID 完整展示，不截断 */}
            <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground/50">{idOf(task)}</span>
            <ListIcon icon={PRIORITY_CONFIG[priorityOf(task)].icon} className={PRIORITY_CONFIG[priorityOf(task)].color} />
            <ListText className="min-w-0 flex-1">{task.title}</ListText>
            {/* 子任务胶囊（design-system 标准），展示在任务标题右侧 */}
            {todoTotal > 0 ? <SubtaskBadge done={todoDone} total={todoTotal} /> : null}
          </>
        );
      }}
      renderTrailing={(task) => {
        const tags = task.taskTags ?? [];
        const shownTags = tags.slice(0, 2);
        const extraTags = tags.length - shownTags.length;
        return (
          <>
            {/* 项目名称完整展示，不截断 */}
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{getProjectName?.(task.projectId) ?? ''}</span>
            <div className="flex shrink-0 items-center gap-1">
              {shownTags.map(({ tag }) => (
                <ListChip key={tag.id} color={tag.color}>{tag.name}</ListChip>
              ))}
              {extraTags > 0 ? <ListChip className="opacity-80 text-muted-foreground">+{extraTags}</ListChip> : null}
            </div>
            {task.milestone?.name ? (
              <ListChip className="border border-border bg-muted/40 text-muted-foreground">{task.milestone.name}</ListChip>
            ) : (
              <span className="w-0" />
            )}
            <ListDate value={task.dueDate} overdue={isOverdue(task)} />
            <ListAvatar
              name={assigneeNameOf(task)}
              url={task.assignee?.avatarUrl}
              color={assigneeNameOf(task) ? colorOf(assigneeNameOf(task)!) : undefined}
            />
          </>
        );
      }}
    />
  );
}

function groupValue(groupBy: Exclude<TaskSimpleGroupBy, 'none'>, task: Task): string {
  switch (groupBy) {
    case 'status':
      return normalizeStatus(task.status);
    case 'severity':
      return severityOf(task);
    case 'project':
      return task.projectId ?? 'inbox';
  }
}
