/**
 * BoardView 的任务域预设：状态/严重度/项目分组列定义 + 默认三行卡片模型。
 * 非任务域（如项目看板）请直接构造 BoardColumnDef / BoardCardModel。
 */
import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronsUp,
  FolderKanban,
  Link2,
  ListTree,
  MessageCircle,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { TASK_STATUS_VISUALS, type StatusTone } from '@/shared/status/status-visuals';
import type { Task } from '@/modules/issue/api/issue-api';
import type {
  BoardAccentColor,
  BoardCardModel,
  BoardColumnDef,
} from '@/shared/components/board-view/board-view';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export const TASK_STATUS_KEYS = ['todo', 'in_progress', 'in_review', 'done', 'canceled'] as const;
export type TaskStatusKey = (typeof TASK_STATUS_KEYS)[number];

/** 状态 tone → 看板 accent 色（BoardAccentColor 与 status-visuals 的 StatusTone 词表对齐） */
const TONE_ACCENT: Record<StatusTone, BoardAccentColor> = {
  default: 'muted',
  info: 'blue',
  warning: 'yellow',
  success: 'green',
  danger: 'red',
};

/**
 * 任务状态视觉派生自 status-visuals.TASK_STATUS_VISUALS（唯一映射源，规范 v0 收敛，
 * 消灭看板侧的旧名图标副本 AlertCircle/CheckCircle2/XCircle）；
 * label（i18n）与列序等看板细节留在本地（getTaskStatusColumns）。
 */
export const STATUS_VISUAL = Object.fromEntries(
  TASK_STATUS_KEYS.map((key) => {
    const visual = TASK_STATUS_VISUALS[key];
    return [key, { icon: visual.icon, color: TONE_ACCENT[visual.tone] }];
  }),
) as Record<TaskStatusKey, { icon: LucideIcon; color: BoardAccentColor }>;

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

/** 任务分组时按项目生成列（含未绑定任务的「无项目」列），颜色循环 */
export function getProjectColumns(
  t: Translate,
  projects: { id: string; name: string }[],
  projectIdsInUse: Iterable<string>,
): BoardColumnDef[] {
  const usedIds = new Set(projectIdsInUse);
  const colorCycle: BoardAccentColor[] = ['blue', 'green', 'purple', 'yellow'];
  const columns: BoardColumnDef[] = [
    {
      id: 'none',
      title: t('common.noProject'),
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

const issueIdentifier = (task: Task) =>
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
      <span className="font-medium tracking-[0.01em]">{issueIdentifier(task)}</span>
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
        {(task._count?.subIssues ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-0.5" title="Subtasks">
            <ListTree size={11} />
            {task._count?.subIssues}
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
        <Avatar className="h-6 w-6 border border-white shadow-xs dark:border-border">
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

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  critical: 'bg-accent-red/15 text-accent-red border-accent-red/30',
  high: 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30',
  medium: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
  low: 'bg-muted/40 text-muted-foreground border-border/40',
};

/** Bug 行1：重要性/严重度图标 + Bug编号 + 严重度胶囊 + 状态图标 */
export function bugCardRow1(bug: Task, t?: Translate): ReactNode {
  const sevKey = (bug.severity ?? 'low') as SeverityKey;
  const sevVisual = SEVERITY_VISUAL[sevKey] ?? SEVERITY_VISUAL.low;
  const SevIcon = sevVisual.icon;
  const statusVisual = STATUS_VISUAL[(bug.status as TaskStatusKey) ?? 'todo'] ?? STATUS_VISUAL.todo;
  const StatusIcon = statusVisual.icon;
  const statusLabel = t?.(`task.status.${bug.status}`) ?? bug.status;
  const sevLabel = t?.(`task.bug.severity.${sevKey}`) ?? sevKey;

  return (
    <div className="flex w-full items-center justify-between gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <SevIcon
          size={13}
          className={STATUS_ICON_TEXT[sevVisual.color]}
          aria-label={sevKey}
        />
        <span className="font-mono text-xs font-semibold tracking-tight text-foreground truncate">
          {issueIdentifier(bug)}
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-sm border px-1 py-0 text-10 font-medium uppercase leading-tight',
            SEVERITY_BADGE_CLASS[sevKey] ?? SEVERITY_BADGE_CLASS.low,
          )}
        >
          {sevLabel}
        </span>
      </div>
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/40"
        title={statusLabel}
      >
        <StatusIcon
          size={12}
          className={cn(
            STATUS_ICON_TEXT[statusVisual.color],
            bug.status === 'in_progress' ? 'animate-spin [animation-duration:3s]' : '',
          )}
        />
      </span>
    </div>
  );
}

/** Bug 行3：截止日期/发现时间 + 子任务/关联 + 评论 + 项目 + 负责人 */
export function bugCardRow3(bug: Task, projectName?: string): ReactNode {
  const dueDate = bug.dueDate ? new Date(bug.dueDate) : null;
  const isOverdue = !!dueDate && dueDate.getTime() < Date.now() && bug.status !== 'done' && bug.status !== 'canceled';

  return (
    <div className="flex items-center justify-between gap-2 pt-0.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-11 text-muted-foreground">
        {dueDate ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 font-medium',
              isOverdue ? 'text-accent-red font-semibold' : 'text-muted-foreground',
            )}
            title={isOverdue ? '已超期' : '截止日期'}
          >
            <CalendarClock size={11} />
            {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : null}
        {projectName ? (
          <span
            className="max-w-20 truncate rounded-sm bg-muted/50 px-1 py-0.2 text-10 font-medium text-muted-foreground"
            title={projectName}
          >
            {projectName}
          </span>
        ) : null}
        {(bug._count?.subIssues ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-0.5" title="Subtasks">
            <ListTree size={11} />
            {bug._count?.subIssues}
          </span>
        ) : null}
        {(bug._count?.comments ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-0.5" title="Comments">
            <MessageCircle size={11} />
            {bug._count?.comments}
          </span>
        ) : null}
      </div>
      {bug.assignee ? (
        <Avatar className="size-5 shrink-0 border border-background shadow-2xs">
          {bug.assignee.avatarUrl ? (
            <AvatarImage src={bug.assignee.avatarUrl} alt={bug.assignee.displayName} />
          ) : null}
          <AvatarFallback className="text-10">
            {(bug.assignee.displayName || bug.assignee.username).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted/60 text-10 font-semibold text-muted-foreground/60"
          title="Unassigned"
        >
          ?
        </span>
      )}
    </div>
  );
}

export const bugCardModel: BoardCardModel<Task> = {
  title: (bug) => bug.title,
  row1: (bug) => bugCardRow1(bug),
  row3: (bug) => bugCardRow3(bug),
};
