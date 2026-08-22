/**
 * row-context-menu - 统一列表行右键菜单构建器
 *
 * 在所有列表视图（任务 / Bug / 项目）中复用一套统一的右键菜单：
 * - 修改元数据（二级菜单：状态 / 优先级 / 严重度）
 * - 固定 / 取消固定
 * - 复制链接
 * - 创建子任务 / 创建父任务
 * - 删除（红色标记）
 *
 * 每个菜单项通过回调交由页面/组件调用对应 mutation，组件只负责结构。
 */

import type { ElementType, ReactNode } from 'react';
import {
  Link2,
  Pin,
  PinOff,
  FolderPlus,
  FolderTree,
  Trash2,
  Pencil,
  Briefcase,
  Check,
  Circle,
  Loader,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronsUp,
  ArrowUp,
  ArrowDown,
  Minus,
  User,
  Tag as TagIcon,
} from 'lucide-react';
import type { MenuItem } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { Task, TaskPriority, BugSeverity, UpdateTaskRequest } from '@/modules/task/api/task-api';

/** 复制文本到剪贴板（带降级方案） */
export function copyText(text: string): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => undefined);
    return;
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch {
    /* ignore */
  }
}

export const STATUS_CONFIG: Record<string, { label: string; Icon: ElementType; color: string }> = {
  todo: { label: 'Todo', Icon: Circle, color: 'text-slate-500' },
  in_progress: { label: 'In Progress', Icon: Loader, color: 'text-blue-500' },
  in_review: { label: 'In Review', Icon: AlertCircle, color: 'text-amber-500' },
  done: { label: 'Done', Icon: CheckCircle2, color: 'text-emerald-500' },
  canceled: { label: 'Canceled', Icon: XCircle, color: 'text-slate-400' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; Icon: ElementType; color: string }> = {
  critical: { label: 'Critical', Icon: ChevronsUp, color: 'text-red-500' },
  high: { label: 'High', Icon: ArrowUp, color: 'text-orange-500' },
  medium: { label: 'Medium', Icon: Minus, color: 'text-blue-500' },
  low: { label: 'Low', Icon: ArrowDown, color: 'text-slate-400' },
};

/** 严重度用标准色标签渲染（无需图标组件） */
export const SEVERITY_CONFIG: Record<BugSeverity, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#EF4444' },
  high: { label: 'High', color: '#F97316' },
  medium: { label: 'Medium', color: '#F59E0B' },
  low: { label: 'Low', color: '#94A3B8' },
};

export interface AssigneeMenuOption {
  id: string;
  displayName: string;
  handle?: string;
  avatarUrl?: string | null;
}

export interface TagMenuOption {
  id: string;
  name: string;
  color?: string | null;
}

export interface TaskRowMenuOptions {
  task: Task;
  /** 更新任务元数据 */
  onUpdate?: (data: UpdateTaskRequest) => void;
  /** 删除（确认由调用方负责） */
  onDelete?: () => void;
  /** 创建一个子任务 */
  onCreateChild?: () => void;
  /** 创建一个父任务并把当前任务挂到其下 */
  onCreateParent?: () => void;
  /** 固定/取消固定（本地 UI 状态） */
  pinned?: boolean;
  onTogglePin?: () => void;
  /** 当前行用于“复制链接”的完整路径，默认 /app/tasks/:id */
  linkPath?: string;
  /** 负责人候选（真实成员数据），用于“负责人”元数据字段 */
  assignees?: AssigneeMenuOption[];
  /** 可用标签（真实数据），用于“标签”元数据字段 */
  tags?: TagMenuOption[];
}

/** 二级菜单选中态对勾（靠右展示） */
function trail(cond: boolean): React.ReactNode {
  return cond ? <Check className="h-4 w-4 text-muted-foreground" /> : undefined;
}

const ASSIGNEE_PALETTE = ['#6366F1', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#06B6D4'];

function assigneeColor(handle: string): string {
  let h = 0;
  for (let i = 0; i < handle.length; i += 1) h = (h * 31 + handle.charCodeAt(i)) % 997;
  return ASSIGNEE_PALETTE[h % ASSIGNEE_PALETTE.length];
}

/** 负责人候选的头像（彩色缩写圆） */
function AssignMenuAvatar({ name, handle }: { name?: string; handle?: string }) {
  const key = handle || name || '';
  const initial = (name || '').trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-9 font-semibold text-white"
      style={{ backgroundColor: key ? assigneeColor(key) : '#94A3B8' }}
    >
      {initial}
    </span>
  );
}

/**
 * 构建统一的任务 / Bug 行右键菜单。
 */
export function buildTaskRowMenu(opts: TaskRowMenuOptions): MenuItem[] {
  const { task } = opts;
  const linkPath = opts.linkPath ?? `/app/tasks/${task.id}`;
  const assignees = opts.assignees ?? [];
  const tagOptions = opts.tags ?? [];
  const currentTagIds = new Set((task.taskTags ?? []).map((tt) => tt.tag.id));
  const currentAssigneeId = task.assignee?.id;
  const hasAssignee = !!currentAssigneeId || !!task.aiAgentId;

  // —— 元数据字段全部提升到一级菜单（每个字段的取值选项作为其二级菜单，对勾靠右） ——
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
  const statusMeta: MenuItem = {
    id: 'meta-status',
    label: '状态',
    icon: <statusCfg.Icon className={cn('h-4 w-4', statusCfg.color)} />,
    children: Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
      id: `st-${value}`,
      label: cfg.label,
      icon: <cfg.Icon className={cn('h-4 w-4', cfg.color)} />,
      trailing: trail(task.status === value),
      onClick: () => opts.onUpdate?.({ status: value }),
    })),
  };

  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const priorityMeta: MenuItem = {
    id: 'meta-priority',
    label: '优先级',
    icon: <priorityCfg.Icon className={cn('h-4 w-4', priorityCfg.color)} />,
    children: Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => ({
      id: `pri-${value}`,
      label: cfg.label,
      icon: <cfg.Icon className={cn('h-4 w-4', cfg.color)} />,
      trailing: trail(task.priority === value),
      onClick: () => opts.onUpdate?.({ priority: value as TaskPriority }),
    })),
  };

  const metadataItems: MenuItem[] = [statusMeta, priorityMeta];

  if (task.type === 'bug') {
    const sevCfg = SEVERITY_CONFIG[(task.severity ?? 'medium') as BugSeverity];
    metadataItems.push({
      id: 'meta-severity',
      label: '严重度',
      icon: <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: sevCfg.color }} />,
      children: Object.entries(SEVERITY_CONFIG).map(([value, cfg]) => ({
        id: `sev-${value}`,
        label: cfg.label,
        // 严重度以彩色标签（色块）渲染
        icon: <span className="inline-block size-3 shrink-0 rounded-full ring-1 ring-border/40" style={{ backgroundColor: cfg.color }} />,
        trailing: trail(task.severity === value),
        onClick: () => opts.onUpdate?.({ severity: value as BugSeverity }),
      })),
    });
  }

  // —— 负责人（真实成员数据） ——
  const currentAssignee = assignees.find((m) => m.id === currentAssigneeId);
  metadataItems.push({
    id: 'meta-assignee',
    label: '负责人',
    icon: currentAssignee ? (
      <AssignMenuAvatar name={currentAssignee.displayName} handle={currentAssignee.handle ?? currentAssignee.displayName} />
    ) : (
      <User className="h-4 w-4 text-muted-foreground" />
    ),
    children: [
      {
        id: 'assignee-none',
        label: '未分配',
        icon: <User className="h-4 w-4 text-muted-foreground" />,
        trailing: trail(!hasAssignee),
        onClick: () => opts.onUpdate?.({ assigneeId: '', assigneeType: 'user' }),
      },
      ...assignees.map((m) => ({
        id: `assignee-${m.id}`,
        label: m.displayName,
        icon: <AssignMenuAvatar name={m.displayName} handle={m.handle ?? m.displayName} />,
        trailing: trail(currentAssigneeId === m.id),
        onClick: () => opts.onUpdate?.({ assigneeId: m.id, assigneeType: 'user' }),
      })),
    ],
  });

  // —— 标签（真实数据，切换式） ——
  metadataItems.push({
    id: 'meta-tags',
    label: '标签',
    icon: <TagIcon className="h-4 w-4 text-muted-foreground" />,
    children: tagOptions.map((tg) => {
      const active = currentTagIds.has(tg.id);
      return {
        id: `tag-${tg.id}`,
        label: tg.name,
        icon: <span className="inline-block size-3 shrink-0 rounded-sm ring-1 ring-border/40" style={{ backgroundColor: tg.color || '#94A3B8' }} />,
        trailing: trail(active),
        onClick: () => {
          const next = new Set(currentTagIds);
          if (next.has(tg.id)) next.delete(tg.id);
          else next.add(tg.id);
          opts.onUpdate?.({ tags: Array.from(next) });
        },
      };
    }),
  });

  // 元数据组与后续操作组之间插入分隔线
  metadataItems[metadataItems.length - 1].separatorAfter = true;

  return [
    ...metadataItems,
    {
      id: 'pin',
      label: opts.pinned ? '取消固定' : '固定',
      icon: opts.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />,
      onClick: () => opts.onTogglePin?.(),
      separatorAfter: true,
    },
    {
      id: 'copy-link',
      label: '复制链接',
      icon: <Link2 className="h-4 w-4" />,
      onClick: () => copyText(`${window.location.origin}${linkPath}`),
    },
    {
      id: 'create-child',
      label: '创建子任务',
      icon: <FolderPlus className="h-4 w-4" />,
      onClick: () => opts.onCreateChild?.(),
    },
    {
      id: 'create-parent',
      label: '创建父任务',
      icon: <FolderTree className="h-4 w-4" />,
      onClick: () => opts.onCreateParent?.(),
    },
    { id: 'delete', label: '删除任务', icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => opts.onDelete?.() },
  ];
}

export interface ProjectRowMenuOptions {
  /** 项目名称/标识（仅展示用可省略） */
  name?: ReactNode;
  linkPath: string;
  pinned?: boolean;
  onTogglePin?: () => void;
  onDelete?: () => void;
  onEditMetadata?: () => void;
}

/**
 * 构建统一的项目行右键菜单（修改元数据入口 + 固定 + 复制链接 + 删除）。
 */
export function buildProjectRowMenu(opts: ProjectRowMenuOptions): MenuItem[] {
  return [
    {
      id: 'metadata',
      label: '修改元数据',
      icon: <Pencil className="h-4 w-4" />,
      onClick: () => opts.onEditMetadata?.(),
    },
    {
      id: 'pin',
      label: opts.pinned ? '取消固定' : '固定',
      icon: opts.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />,
      onClick: () => opts.onTogglePin?.(),
      separatorAfter: true,
    },
    {
      id: 'copy-link',
      label: '复制链接',
      icon: <Briefcase className="h-4 w-4" />,
      onClick: () => copyText(`${window.location.origin}${opts.linkPath}`),
    },
    { id: 'delete', label: '删除项目', icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => opts.onDelete?.() },
  ];
}
