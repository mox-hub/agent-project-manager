/**
 * TaskSimpleList - 任务页试点：基于自建 DataList 的任务列表适配
 *
 * 配置要点：
 * - 首要信息区（多选框右侧）：短ID + 优先级图标 + 标题
 * - 次要信息区（行最右）：项目名 + 标签 + 里程碑 + 截止日期 + 责任人头像
 * - 分组：按页面传入的 groupBy 元数据（status / severity / project / none）展示 grouping bar 手风琴
 * - 多选：DataList 内置悬浮胶囊，快捷操作由页面通过 onBatchActions 提供
 */

import {
  ArrowDown,
  ArrowUp,
  ChevronsUp,
  Minus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ListAvatar, ListChip, ListDate, ListIcon, ListText, DataList } from '@/components/ui/data-list';
import { useIssueRowMenu } from '@/shared/context-menu/use-issue-row-menu';
import { TASK_STATUS_VISUALS, TONE_TEXT_CLASS } from '@/shared/status/status-visuals';
import type { Task } from '../api/issue-api';
import { cn } from '@/lib/utils';
import { AiExecutionBadge } from '@/shared/components/ai-execution-badge';
import type { ActiveAiExecution } from '@/modules/execution/hooks/use-active-executions-map';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
type RowPriority = 'urgent' | 'high' | 'medium' | 'low';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'canceled'];

// 状态图标/文字色统一取 shared/status/status-visuals 唯一映射源（tone → accent token），
// 本组件只保留分组排序（order）与英文分组标签（labelKey 版待 i18n 批次统一）。
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  canceled: 'Canceled',
};

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  order: number;
}

const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = Object.fromEntries(
  STATUS_ORDER.map((status, order) => {
    const visual = TASK_STATUS_VISUALS[status];
    return [
      status,
      {
        label: STATUS_LABEL[status],
        icon: visual.icon,
        color: TONE_TEXT_CLASS[visual.tone],
        order,
      },
    ];
  }),
) as Record<TaskStatus, StatusConfig>;

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
  /** 获取任务的活跃 AI 执行状态 */
  getAiExecution?: (task: Task) => ActiveAiExecution | null;
  /** 列表密度（dense: 32px 紧凑 / comfortable: 40px 默认） */
  density?: 'dense' | 'comfortable';
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
  getAiExecution,
  density = 'comfortable',
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

  // —— 统一行右键菜单（list / kanban 共用 useIssueRowMenu，菜单内容一致） ——
  const onItemContextMenu = useIssueRowMenu();

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
        const todoTotal = task.todoItems?.length ?? task._count?.subIssues ?? 0;
        const todoDone = task.todoItems?.filter((item) => item.completed).length ?? 0;
        const aiExecution = getAiExecution?.(task);
        return (
          <>
            {aiExecution ? (
              <span
                className="h-6 w-1 shrink-0 rounded-full bg-accent-purple ring-2 ring-accent-purple/30 animate-pulse"
                title={`AI 接管中: ${aiExecution.agentName} (${aiExecution.stepSummary || '执行中'})`}
              />
            ) : null}
            {task.type === 'bug' ? (
              <span className={cn('h-6 w-1.5 shrink-0 rounded-full', SEVERITY_BAR[severityOf(task)])} />
            ) : null}
            {/* ID 完整展示，不截断 */}
            <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground/50">{idOf(task)}</span>
            <ListIcon icon={PRIORITY_CONFIG[priorityOf(task)].icon} className={PRIORITY_CONFIG[priorityOf(task)].color} />
            <ListText className="min-w-0 flex-1">{task.title}</ListText>
            {aiExecution ? (
              <AiExecutionBadge execution={aiExecution} size="xs" variant="compact" />
            ) : null}
            {/* 子任务胶囊（design-system 标准），展示在任务标题右侧 */}
            {todoTotal > 0 ? <SubtaskBadge done={todoDone} total={todoTotal} /> : null}
          </>
        );
      }}
      renderTrailing={(task) => {
        const tags = task.issueTags ?? [];
        const shownTags = tags.slice(0, 2);
        const extraTags = tags.length - shownTags.length;
        const aiExecution = getAiExecution?.(task);
        return (
          <>
            {/* 项目名称完整展示，不截断 */}
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{getProjectName?.(task.projectId) ?? ''}</span>
            {density !== 'dense' ? (
              <div className="flex shrink-0 items-center gap-1">
                {shownTags.map(({ tag }) => (
                  <ListChip key={tag.id} color={tag.color}>{tag.name}</ListChip>
                ))}
                {extraTags > 0 ? <ListChip className="opacity-80 text-muted-foreground">+{extraTags}</ListChip> : null}
              </div>
            ) : null}
            {task.milestone?.name && density !== 'dense' ? (
              <ListChip className="border border-border bg-muted/40 text-muted-foreground">{task.milestone.name}</ListChip>
            ) : (
              <span className="w-0" />
            )}
            <ListDate value={task.dueDate} overdue={isOverdue(task)} />
            {aiExecution ? (
              <AiExecutionBadge execution={aiExecution} size="xs" variant="pill" />
            ) : (
              <ListAvatar
                name={assigneeNameOf(task)}
                url={task.assignee?.avatarUrl}
                color={assigneeNameOf(task) ? colorOf(assigneeNameOf(task)!) : undefined}
              />
            )}
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
      // 无项目任务用空串作分组键，标签由调用方 getProjectName 的 falsy 分支渲染为「无项目」
      return task.projectId ?? '';
  }
}
