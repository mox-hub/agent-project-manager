/**
 * BugSimpleList - 基于自建 DataList 的 Bug 列表适配
 *
 * 保留原 BugListView 字段并适配：
 * - 首要信息区：严重度条 + 状态图标 + ID(完整展示) + Bug 图标 + 标题
 * - 次要信息区：项目 + 严重度标签 + 标签(+N) + 责任人头像
 * - 分组：按页面传入 groupBy（status / severity / project / none）
 */

import { useState } from 'react';
import { Bug, Circle, Loader, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import {
  DataList,
  ListAvatar,
  ListChip,
  ListText,
  type DataListProgress,
} from '@/components/ui/data-list';
import type { Task } from '../api/task-api';
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
import { cn } from '@/lib/utils';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'canceled'];

const STAT_C = {
  todo: { label: 'Todo', color: 'text-muted-foreground', order: 0 },
  in_progress: { label: 'In Progress', color: 'text-accent-blue', order: 1 },
  in_review: { label: 'In Review', color: 'text-accent-yellow', order: 2 },
  done: { label: 'Done', color: 'text-accent-green', order: 3 },
  canceled: { label: 'Canceled', color: 'text-muted-foreground', order: 4 },
} as const;

const SEV_C = {
  critical: { label: 'Critical', color: 'text-destructive', dotColor: 'bg-destructive', order: 0 },
  high: { label: 'High', color: 'text-accent-orange', dotColor: 'bg-accent-orange', order: 1 },
  medium: { label: 'Medium', color: 'text-accent-yellow', dotColor: 'bg-accent-yellow', order: 2 },
  low: { label: 'Low', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground/40', order: 3 },
} as const;

function severityOf(bug: Task): Severity {
  return (['critical', 'high', 'medium', 'low'] as Severity[]).includes(bug.severity as Severity)
    ? (bug.severity as Severity)
    : bug.priority === 'critical'
      ? 'critical'
      : bug.priority === 'high'
        ? 'high'
        : bug.priority === 'medium'
          ? 'medium'
          : 'low';
}

function statusOf(bug: Task): TaskStatus {
  return (STATUS_ORDER as string[]).includes(bug.status) ? (bug.status as TaskStatus) : 'todo';
}

function idOf(bug: Task): string {
  return bug.shortId || bug.externalIdentifier || bug.id;
}

function assigneeNameOf(bug: Task): string {
  return bug.assignee?.displayName || bug.assignee?.username || '';
}

export type BugSimpleGroupBy = 'status' | 'severity' | 'project' | 'none';

export interface BugSimpleListProps {
  bugs: Task[];
  loading?: boolean;
  emptyMessage?: string;
  onBugClick?: (bug: Task) => void;
  groupBy?: BugSimpleGroupBy;
  onGroupCreate?: (key: string, items: Task[]) => void;
  groupProgress?: (items: Task[]) => DataListProgress | null;
  getProjectName?: (projectId: string | null | undefined) => string;
  selectionActions?: (selected: Task[], close: () => void) => React.ReactNode;
  className?: string;
}

export function BugSimpleList({
  bugs,
  loading,
  emptyMessage = 'No bugs found',
  onBugClick,
  groupBy = 'none',
  onGroupCreate,
  groupProgress,
  getProjectName,
  selectionActions,
  className,
}: BugSimpleListProps) {
  const groupFn = groupBy === 'none' ? undefined : (bug: Task) => groupValue(groupBy, bug);

  const groupMeta = (key: string) => {
    switch (groupBy) {
      case 'status': {
        const cfg = STAT_C[statusOf({ ...bugs[0], status: key } as Task)] ?? STAT_C.todo;
        return { label: cfg.label, order: cfg.order };
      }
      case 'severity': {
        const cfg = SEV_C[key as Severity] ?? SEV_C.medium;
        return {
          label: cfg.label,
          icon: <span className={cn('inline-block size-3 shrink-0 rounded-full', cfg.dotColor)} />,
          order: cfg.order,
        };
      }
      case 'project':
        return { label: getProjectName?.(key) ?? key, order: 0 };
      default:
        return { label: key };
    }
  };

  const progress = (items: Task[]) =>
    groupProgress
      ? groupProgress(items)
      : { done: items.filter((b) => b.status === 'done').length, total: items.length };

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

  const onItemContextMenu = (bug: Task): MenuItem[] =>
    buildTaskRowMenu({
      task: bug,
      linkPath: `/app/bugs/${bug.id}`,
      assignees,
      tags: tagOptions,
      pinned: pinnedIds.has(bug.id),
      onTogglePin: () =>
        setPinnedIds((prev) => {
          const next = new Set(prev);
          if (next.has(bug.id)) next.delete(bug.id);
          else next.add(bug.id);
          return next;
        }),
      onUpdate: (data) => updateTask.mutate({ taskId: bug.id, data }),
      onDelete: async () => {
        const ok = await confirmAction({
          title: `删除 Bug「${bug.title}」？`,
          description: '该操作会删除此 Bug 及其子任务，且不可撤销。',
          confirmText: '删除',
          cancelText: '取消',
          variant: 'destructive',
        });
        if (ok) deleteTask.mutate(bug.id);
      },
      onCreateChild: () => {
        const title = window.prompt('输入子任务标题');
        if (title?.trim()) {
          createSubTask.mutate({ parentTaskId: bug.id, title: title.trim() });
        }
      },
      onCreateParent: () => {
        const title = window.prompt('输入父任务标题');
        if (!title?.trim()) return;
        createTask.mutate(
          { title: title.trim(), projectId: bug.projectId ?? undefined },
          {
            onSuccess: (parent) =>
              updateTask.mutate({ taskId: bug.id, data: { parentTaskId: parent.id } as never }),
          },
        );
      },
    });

  return (
    <DataList
      items={bugs}
      loading={loading}
      emptyMessage={emptyMessage}
      className={className}
      selectable
      groupBy={groupFn}
      groupLabel={groupMeta}
      renderGroupProgress={progress}
      onGroupCreate={onGroupCreate}
      onItemClick={onBugClick}
      onItemContextMenu={onItemContextMenu}
      selectionActions={selectionActions}
      renderLeading={(bug) => {
        const sev = SEV_C[severityOf(bug)];
        const st = STAT_C[statusOf(bug)];
        return (
          <>
            {/* 严重度指示条 */}
            <span className={cn('h-6 w-1.5 shrink-0 rounded-full', sev.dotColor)} />
            {/* 状态图标 */}
            <span className={cn('w-4 shrink-0 text-center', st.color)}>
              <StatusGlyph status={statusOf(bug)} />
            </span>
            {/* ID 完整展示（不截断） */}
            <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground/50">{idOf(bug)}</span>
            {/* 标题（带 Bug 图标） */}
            <Bug className="size-4 shrink-0 text-destructive" />
            <ListText className="min-w-0 flex-1">{bug.title}</ListText>
          </>
        );
      }}
      renderTrailing={(bug) => {
        const sev = SEV_C[severityOf(bug)];
        const tags = bug.taskTags ?? [];
        const shown = tags.slice(0, 2);
        const extra = tags.length - shown.length;
        return (
          <>
            {/* 项目 */}
            <ListChip className="border border-border bg-muted/40 text-muted-foreground">{getProjectName?.(bug.projectId) ?? ''}</ListChip>
            {/* 严重度标签 */}
            <span className="flex shrink-0 items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', sev.dotColor)} />
              <span className={cn('whitespace-nowrap text-xs font-medium', sev.color)}>{sev.label}</span>
            </span>
            {/* 标签（可折叠 +N） */}
            <div className="flex shrink-0 items-center gap-1">
              {shown.map(({ tag }) => (
                <ListChip key={tag.id} color={tag.color}>{tag.name}</ListChip>
              ))}
              {extra > 0 ? <ListChip className="opacity-80 text-muted-foreground">+{extra}</ListChip> : null}
            </div>
            {/* 责任人 */}
            <ListAvatar name={assigneeNameOf(bug)} url={bug.assignee?.avatarUrl} />
          </>
        );
      }}
    />
  );
}

function StatusGlyph({ status }: { status: TaskStatus }) {
  const Icon =
    status === 'todo' ? Circle :
    status === 'in_progress' ? Loader :
    status === 'in_review' ? AlertCircle :
    status === 'done' ? CheckCircle2 : XCircle;
  return (
    <Icon
      className={cn('size-4', status === 'in_progress' && 'animate-spin')}
      style={status === 'in_progress' ? { animationDuration: '2s' } : undefined}
    />
  );
}

function groupValue(groupBy: Exclude<BugSimpleGroupBy, 'none'>, bug: Task): string {
  switch (groupBy) {
    case 'status':
      return statusOf(bug);
    case 'severity':
      return severityOf(bug);
    case 'project':
      return bug.projectId ?? 'unknown';
  }
}
