/**
 * BoardView 的任务域预设：状态/严重度/项目分组列定义 + 默认三行卡片模型。
 * 非任务域（如项目看板）请直接构造 BoardColumnDef / BoardCardModel。
 */
import type { ReactNode } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ChevronsUp,
  Circle,
  FolderKanban,
  Link2,
  ListTree,
  Loader2,
  MessageCircle,
  Minus,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Task } from '@/modules/task/api/task-api';
import type {
  BoardAccentColor,
  BoardCardModel,
  BoardColumnDef,
} from '@/shared/components/board-view/board-view';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export const TASK_STATUS_KEYS = ['todo', 'in_progress', 'in_review', 'done', 'canceled'] as const;
export type TaskStatusKey = (typeof TASK_STATUS_KEYS)[number];

export const STATUS_VISUAL: Record<TaskStatusKey, { icon: LucideIcon; color: BoardAccentColor }> = {
  todo: { icon: Circle, color: 'muted' },
  in_progress: { icon: Loader2, color: 'blue' },
  in_review: { icon: AlertCircle, color: 'yellow' },
  done: { icon: CheckCircle2, color: 'green' },
  canceled: { icon: XCircle, color: 'muted' },
};

/** 状态色 → 图标文字色（静态类名，避免 Tailwind JIT 收集不到动态拼接） */
const STATUS_ICON_TEXT: Record<BoardAccentColor, string> = {
  blue: 'text-accent-blue',
  green: 'text-accent-green',
  yellow: 'text-accent-yellow',
  red: 'text-accent-red',
  purple: 'text-accent-purple',
  muted: 'text-muted-foreground',
};

/** 任务状态看板列（可选排除 canceled） */
export function getTaskStatusColumns(t: Translate, includeCanceled = true): BoardColumnDef[] {
  return TASK_STATUS_KEYS.filter((key) => includeCanceled || key !== 'canceled').map((key) => ({
    id: key,
    title: t(`task.status.${key}`),
    icon: STATUS_VISUAL[key].icon,
    color: STATUS_VISUAL[key].color,
  }));
}

export const SEVERITY_KEYS = ['critical', 'high', 'medium', 'low'] as const;
export type SeverityKey = (typeof SEVERITY_KEYS)[number];

const SEVERITY_VISUAL: Record<SeverityKey, { icon: LucideIcon; color: BoardAccentColor }> = {
  critical: { icon: ChevronsUp, color: 'red' },
  high: { icon: ArrowUp, color: 'yellow' },
  medium: { icon: Minus, color: 'blue' },
  low: { icon: ArrowDown, color: 'muted' },
};

export function getSeverityColumns(t: Translate): BoardColumnDef[] {
  return SEVERITY_KEYS.map((key) => ({
    id: key,
    title: t(`task.bug.severity.${key}`),
    icon: SEVERITY_VISUAL[key].icon,
    color: SEVERITY_VISUAL[key].color,
  }));
}

/** 任务分组时按项目生成列（含未绑定任务的 Inbox 列），颜色循环 */
export function getProjectColumns(
  projects: { id: string; name: string }[],
  projectIdsInUse: Iterable<string>,
): BoardColumnDef[] {
  const usedIds = new Set(projectIdsInUse);
  const colorCycle: BoardAccentColor[] = ['blue', 'green', 'purple', 'yellow'];
  const columns: BoardColumnDef[] = [
    {
      id: 'inbox',
      title: 'Inbox',
      icon: FolderKanban,
      color: 'muted',
    },
  ];
  const visibleProjects = projects.filter((project) => usedIds.has(project.id));
  visibleProjects.forEach((project, index) => {
    columns.push({
      id: project.id,
      title: project.name,
      icon: FolderKanban,
      color: colorCycle[index % colorCycle.length],
    });
  });
  return columns;
}

// ── 卡片槽位 ────────────────────────────────────────────────────────────────

const PRIORITY_VISUAL: Record<string, { icon: LucideIcon; className: string }> = {
  critical: { icon: ChevronsUp, className: 'text-accent-red' },
  high: { icon: ArrowUp, className: 'text-accent-yellow' },
  medium: { icon: Minus, className: 'text-accent-blue' },
  low: { icon: ArrowDown, className: 'text-muted-foreground' },
};

const taskIdentifier = (task: Task) =>
  task.shortId || `APM-${task.id.slice(0, 4).toUpperCase()}`;

/** 行1：重要性图标 + 任务编号 + 状态图标 */
export function taskCardRow1(task: Task, t?: Translate): ReactNode {
  const priority = PRIORITY_VISUAL[task.priority] ?? PRIORITY_VISUAL.low;
  const PriorityIcon = priority.icon;
  const statusVisual = STATUS_VISUAL[(task.status as TaskStatusKey) ?? 'todo'] ?? STATUS_VISUAL.todo;
  const StatusIcon = statusVisual.icon;
  const statusLabel = t?.(`task.status.${task.status}`) ?? task.status;
  return (
    <>
      <PriorityIcon
        size={13}
        className={priority.className}
        aria-label={task.priority}
      />
      <span className="font-medium tracking-[0.01em]">{taskIdentifier(task)}</span>
      <span
        className="inline-flex h-5 items-center gap-1 rounded-md bg-muted/40 px-1"
        title={statusLabel}
      >
        <StatusIcon
          size={12}
          className={cn(
            STATUS_ICON_TEXT[statusVisual.color],
            task.status === 'in_progress' ? 'animate-spin [animation-duration:3s]' : '',
          )}
        />
      </span>
    </>
  );
}

/** 行3：截止日期 / 依赖 / 评论 / 子任务图标 / 负责人 */
export function taskCardRow3(task: Task): ReactNode {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = !!dueDate && dueDate.getTime() < Date.now();
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        {dueDate ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 font-medium',
              isOverdue ? 'text-accent-red' : 'text-muted-foreground',
            )}
          >
            <CalendarClock size={11} />
            {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : null}
        {typeof task.estimate === 'number' ? (
          <span className="font-medium text-muted-foreground">{task.estimate}</span>
        ) : null}
        {(task._count?.dependencies ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <Link2 size={11} />
            {task._count?.dependencies}
          </span>
        ) : null}
        {(task._count?.subTasks ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-0.5" title="Subtasks">
            <ListTree size={11} />
            {task._count?.subTasks}
          </span>
        ) : null}
        {(task._count?.comments ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <MessageCircle size={11} />
            {task._count?.comments}
          </span>
        ) : null}
      </div>
      {task.assignee ? (
        <Avatar className="h-6 w-6 border border-white shadow-sm dark:border-border">
          {task.assignee.avatarUrl ? (
            <AvatarImage src={task.assignee.avatarUrl} alt={task.assignee.displayName} />
          ) : null}
          <AvatarFallback className="text-xs">
            {(task.assignee.displayName || task.assignee.username).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          ?
        </span>
      )}
    </div>
  );
}

/** 任务默认卡片模型（页面可包一层 row1/row3 追加内容） */
export const taskCardModel: BoardCardModel<Task> = {
  title: (task) => task.title,
  row1: (task) => taskCardRow1(task),
  row3: (task) => taskCardRow3(task),
};

/** Bug 卡片：severity 左边框 */
const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-accent-red',
  high: 'border-l-accent-yellow',
  medium: 'border-l-accent-blue',
  low: 'border-l-muted-foreground/40',
};

export const bugCardModel: BoardCardModel<Task> = {
  ...taskCardModel,
  className: (bug) => cn('border-l-[3px]', SEVERITY_BORDER[bug.severity ?? 'low'] ?? SEVERITY_BORDER.low),
};
