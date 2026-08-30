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
  User,
  Tag as TagIcon,
} from 'lucide-react';
import type { MenuItem } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { Task, TaskPriority, BugSeverity, UpdateTaskRequest } from '@/modules/task/api/task-api';
import type { Project, UpdateProjectRequest } from '@/modules/project/api/project-api';
import {
  HEALTH_VISUALS,
  PRIORITY_VISUALS,
  PROJECT_STATUS_VISUALS,
  PROJECT_WORKFLOW_VISUALS,
  RISK_VISUALS,
  TASK_STATUS_VISUALS,
  TONE_TEXT_CLASS,
  type StatusVisual,
} from '@/shared/status/status-visuals';

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

/** 从统一视觉映射取（图标 + tone 色） */
const fromVisual = (visual: StatusVisual) => ({
  Icon: visual.icon as ElementType,
  color: TONE_TEXT_CLASS[visual.tone],
});

export const STATUS_CONFIG: Record<string, { label: string; Icon: ElementType; color: string }> = {
  todo: { label: 'Todo', ...fromVisual(TASK_STATUS_VISUALS.todo) },
  in_progress: { label: 'In Progress', ...fromVisual(TASK_STATUS_VISUALS.in_progress) },
  in_review: { label: 'In Review', ...fromVisual(TASK_STATUS_VISUALS.in_review) },
  done: { label: 'Done', ...fromVisual(TASK_STATUS_VISUALS.done) },
  canceled: { label: 'Canceled', ...fromVisual(TASK_STATUS_VISUALS.canceled) },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; Icon: ElementType; color: string }> = {
  critical: { label: 'Critical', ...fromVisual(PRIORITY_VISUALS.critical) },
  high: { label: 'High', ...fromVisual(PRIORITY_VISUALS.high) },
  medium: { label: 'Medium', ...fromVisual(PRIORITY_VISUALS.medium) },
  low: { label: 'Low', ...fromVisual(PRIORITY_VISUALS.low) },
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
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-10 font-semibold text-white"
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
  /** 当前项目数据（子菜单当前值打勾用） */
  project?: Project;
  /** i18n 翻译函数（枚举 label 来自 status-visuals 的 labelKey） */
  t?: (key: string) => string;
  /** 就地更新枚举元数据（状态/工作流/优先级/健康/风险/负责人） */
  onUpdate?: (data: UpdateProjectRequest) => void;
  /** 负责人可选项（真实成员） */
  owners?: AssigneeMenuOption[];
  /** 打开基本信息编辑对话框（名称/描述/类型/可见性/编号/类别/起止日期） */
  onEditBasic?: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
  onDelete?: () => void;
  onEditMetadata?: () => void;
}

/** 枚举字段子菜单：当前值打勾，点选即调 onUpdate */
function projectEnumMeta(
  id: string,
  label: string,
  visuals: Record<string, StatusVisual>,
  order: string[],
  current: string | null | undefined,
  t: (key: string) => string,
  onPick: (value: string) => void,
): MenuItem {
  const currentCfg = current ? visuals[current] : undefined;
  const CurrentIcon = currentCfg?.icon;
  return {
    id,
    label,
    icon: CurrentIcon ? (
      <CurrentIcon className={cn('h-4 w-4', currentCfg ? TONE_TEXT_CLASS[currentCfg.tone] : undefined)} />
    ) : (
      <Pencil className="h-4 w-4" />
    ),
    children: order
      .filter((value) => visuals[value])
      .map((value) => {
        const v = visuals[value];
        return {
          id: `${id}-${value}`,
          label: t(v.labelKey),
          icon: <v.icon className={cn('h-4 w-4', TONE_TEXT_CLASS[v.tone])} />,
          trailing: current === value ? <Check className="h-3.5 w-3.5" /> : undefined,
          onClick: () => onPick(value),
        };
      }),
  };
}

/**
 * 构建统一的项目行右键菜单（任务同款：枚举元数据二级子菜单直改 + 编辑基本信息 + 固定 + 复制链接 + 删除）。
 */
export function buildProjectRowMenu(opts: ProjectRowMenuOptions): MenuItem[] {
  const t = opts.t ?? ((key: string) => key);
  const project = opts.project;
  const onUpdate = (data: UpdateProjectRequest) => opts.onUpdate?.(data);

  const metadataItems: MenuItem[] = [
    projectEnumMeta(
      'meta-status',
      '状态',
      PROJECT_STATUS_VISUALS,
      ['active', 'archived'],
      project?.status,
      t,
      (value) => onUpdate({ status: value as UpdateProjectRequest['status'] }),
    ),
    projectEnumMeta(
      'meta-workflow',
      '工作流状态',
      PROJECT_WORKFLOW_VISUALS,
      ['backlog', 'planned', 'in_progress', 'completed', 'canceled'],
      project?.workflowStatus,
      t,
      (value) => onUpdate({ workflowStatus: value as UpdateProjectRequest['workflowStatus'] }),
    ),
    projectEnumMeta(
      'meta-priority',
      '优先级',
      PRIORITY_VISUALS,
      ['low', 'medium', 'high', 'urgent'],
      project?.priority,
      t,
      (value) => onUpdate({ priority: value as UpdateProjectRequest['priority'] }),
    ),
    projectEnumMeta(
      'meta-health',
      '健康度',
      HEALTH_VISUALS,
      ['on_track', 'at_risk', 'off_track'],
      project?.healthStatus,
      t,
      (value) => onUpdate({ healthStatus: value as UpdateProjectRequest['healthStatus'] }),
    ),
    projectEnumMeta(
      'meta-risk',
      '风险',
      RISK_VISUALS,
      ['low', 'medium', 'high', 'critical'],
      project?.riskLevel,
      t,
      (value) => onUpdate({ riskLevel: value as UpdateProjectRequest['riskLevel'] }),
    ),
  ];

  // 负责人（真实成员数据）
  const owners = opts.owners ?? [];
  const currentOwnerId = project?.ownerId;
  const currentOwner = owners.find((m) => m.id === currentOwnerId);
  metadataItems.push({
    id: 'meta-owner',
    label: '负责人',
    icon: currentOwner ? (
      <AssignMenuAvatar
        name={currentOwner.displayName}
        handle={currentOwner.handle ?? currentOwner.displayName}
      />
    ) : (
      <User className="h-4 w-4 text-muted-foreground" />
    ),
    children: [
      {
        id: 'owner-none',
        label: '未分配',
        icon: <User className="h-4 w-4 text-muted-foreground" />,
        trailing: !currentOwnerId ? <Check className="h-3.5 w-3.5" /> : undefined,
        onClick: () => onUpdate({ ownerId: '' }),
      },
      ...owners.map((m) => ({
        id: `owner-${m.id}`,
        label: m.displayName,
        icon: (
          <AssignMenuAvatar name={m.displayName} handle={m.handle ?? m.displayName} />
        ),
        trailing: currentOwnerId === m.id ? <Check className="h-3.5 w-3.5" /> : undefined,
        onClick: () => onUpdate({ ownerId: m.id }),
      })),
    ],
  });

  // 编辑基本信息（不可枚举字段走对话框）
  metadataItems.push({
    id: 'edit-basic',
    label: '编辑基本信息',
    icon: <Pencil className="h-4 w-4" />,
    onClick: () => opts.onEditBasic?.(),
    separatorAfter: true,
  });

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
      icon: <Briefcase className="h-4 w-4" />,
      onClick: () => copyText(`${window.location.origin}${opts.linkPath}`),
    },
    { id: 'delete', label: '删除项目', icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => opts.onDelete?.() },
  ];
}
