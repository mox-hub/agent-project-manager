/**
 * ProjectSimpleList - 基于自建 DataList 的项目列表适配
 *
 * 保留原 ProjectList 的展示字段，并做适应化改造（行式布局 + 多选）：
 * - 首要信息区：图标(彩色) + 名称 + 来源徽标
 * - 次要信息区：状态 / 健康分 / 优先级 / 负责人 / 成员 / 进度 / 起止日期 / 更新时间
 * 行点击进入项目详情；多选悬浮胶囊操作由页面通过 selectionActions 注入。
 */

import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ChevronsUp,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CirclePause,
  Clock3,
  FolderKanban,
  LoaderCircle,
  Rocket,
  Slash,
  Sparkles,
  Target,
  Wrench,
  UserRound,
} from 'lucide-react';
import { DataList, ListActionButton, ListChip, ListText, ListAvatar } from '@/components/ui/data-list';
import type { MenuItem } from '@/components/ui/context-menu';
import { buildProjectRowMenu } from '@/shared/context-menu/row-context-menu';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  Project,
  ProjectHealthStatus,
  ProjectPriority,
  ProjectWorkflowStatus,
} from '../api/project-api';
import { cn } from '@/lib/utils';

type GroupBy = 'none' | 'status' | 'type';

const PRIORITY_STYLE: Record<ProjectPriority, { icon: string; text: string; ring: string }> = {
  low: { icon: 'text-accent-blue', text: 'text-accent-blue', ring: 'bg-accent-blue-light ring-accent-blue/30' },
  medium: { icon: 'text-accent-purple', text: 'text-accent-purple', ring: 'bg-accent-purple-light ring-accent-purple/30' },
  high: { icon: 'text-accent-yellow', text: 'text-accent-yellow', ring: 'bg-accent-yellow-light ring-accent-yellow/30' },
  urgent: { icon: 'text-accent-red', text: 'text-accent-red', ring: 'bg-accent-red-light ring-accent-red/30' },
};

const HEALTH_STYLE: Record<ProjectHealthStatus, { text: string; dot: string }> = {
  on_track: { text: 'text-accent-green', dot: 'bg-accent-green' },
  at_risk: { text: 'text-accent-yellow', dot: 'bg-accent-yellow' },
  off_track: { text: 'text-accent-red', dot: 'bg-accent-red' },
};

const WORKFLOW_STYLE: Record<ProjectWorkflowStatus, string> = {
  backlog: 'bg-muted/50 text-muted-foreground',
  planned: 'bg-accent-purple-light text-accent-purple',
  in_progress: 'bg-accent-blue-light text-accent-blue',
  completed: 'bg-accent-green-light text-accent-green',
  canceled: 'bg-muted/50 text-muted-foreground',
};

const GROUP_ORDER: Record<string, number> = {
  active: 0,
  archived: 1,
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function getProjectIconNode(icon?: string | null) {
  if (icon === 'rocket') return <Rocket className="size-4" />;
  if (icon === 'target') return <Target className="size-4" />;
  if (icon === 'tooling') return <Wrench className="size-4" />;
  if (icon === 'spark') return <Sparkles className="size-4" />;
  return <FolderKanban className="size-4" />;
}

function getPriorityIcon(priority: ProjectPriority) {
  if (priority === 'urgent') return <ChevronsUp className={cn('size-4', PRIORITY_STYLE[priority].icon)} />;
  if (priority === 'high') return <ArrowUp className={cn('size-4', PRIORITY_STYLE[priority].icon)} />;
  if (priority === 'low') return <ArrowDown className={cn('size-4', PRIORITY_STYLE[priority].icon)} />;
  return <Slash className={cn('size-4', PRIORITY_STYLE[priority].icon)} />;
}

function getHealthIcon(status: ProjectHealthStatus) {
  return status === 'on_track'
    ? <CircleCheck className={cn('size-4', HEALTH_STYLE[status].text)} />
    : status === 'off_track'
      ? <CircleAlert className={cn('size-4', HEALTH_STYLE[status].text)} />
      : <CirclePause className={cn('size-4', HEALTH_STYLE[status].text)} />;
}

function getWorkflowIcon(status: ProjectWorkflowStatus) {
  if (status === 'completed') return <CheckCircle2 className="size-3.5 text-accent-green" />;
  if (status === 'in_progress') return <LoaderCircle className="size-3.5 animate-spin text-accent-blue" />;
  if (status === 'planned') return <Clock3 className="size-3.5 text-accent-purple" />;
  if (status === 'canceled') return <CirclePause className="size-3.5 text-muted-foreground" />;
  return <CircleDashed className="size-3.5 text-muted-foreground" />;
}

function getSourceBadgeText(source?: Project['source']) {
  if (!source) return 'local';
  if (source === 'github_projects') return 'github';
  return source;
}

export interface ProjectSimpleListProps {
  projects: Project[];
  loading?: boolean;
  emptyMessage?: string;
  onProjectClick: (project: Project) => void;
  groupBy?: GroupBy;
  groupProgress?: (items: Project[]) => { done: number; total: number } | null;
  onGroupCreate?: (key: string, items: Project[]) => void;
  selectionActions?: (selected: Project[], close: () => void) => React.ReactNode;
  className?: string;
}

export function ProjectSimpleList({
  projects,
  loading,
  emptyMessage = 'No projects yet',
  onProjectClick,
  groupBy = 'none',
  groupProgress,
  onGroupCreate,
  selectionActions,
  className,
}: ProjectSimpleListProps) {
  const groupFn = groupBy === 'none' ? undefined : (project: Project) => groupValue(groupBy, project);

  const groupLabel = (key: string) => {
    switch (groupBy) {
      case 'status': {
        return {
          label: key === 'active' ? 'Active' : key === 'archived' ? 'Archived' : key,
          icon: <span className={cn('inline-block size-3 rounded-full', key === 'active' ? 'bg-emerald-500' : 'bg-slate-400')} />,
          order: GROUP_ORDER[key] ?? 9,
        };
      }
      case 'type':
        return { label: key, order: 0 };
      default:
        return { label: key };
    }
  };

  const progress = (items: Project[]) =>
    groupProgress ? groupProgress(items) : { done: items.filter((p) => p.workflowStatus === 'completed').length, total: items.length };

  // —— 统一行右键菜单 ——
  const navigate = useNavigate();
  const confirmAction = useConfirm();
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());

  const onItemContextMenu = (project: Project): MenuItem[] =>
    buildProjectRowMenu({
      linkPath: `/app/projects/${project.id}`,
      pinned: pinnedIds.has(project.id),
      onTogglePin: () =>
        setPinnedIds((prev) => {
          const next = new Set(prev);
          if (next.has(project.id)) next.delete(project.id);
          else next.add(project.id);
          return next;
        }),
      // 项目元数据编辑与删除入口统一引导到项目设置的危险区
      onEditMetadata: () => navigate(`/app/projects/${project.id}/settings`),
      onDelete: async () => {
        const ok = await confirmAction({
          title: `删除项目「${project.name}」？`,
          description: '删除项目会级联影响其下的任务与资源，请到项目设置中确认后操作。',
          confirmText: '前往设置',
          cancelText: '取消',
          variant: 'destructive',
        });
        if (ok) navigate(`/app/projects/${project.id}/settings`);
      },
    });

  return (
    <DataList
      items={projects}
      loading={loading}
      emptyMessage={emptyMessage}
      className={className}
      selectable
      groupBy={groupFn}
      groupLabel={groupLabel}
      renderGroupProgress={progress}
      onGroupCreate={onGroupCreate}
      onItemClick={onProjectClick}
      onItemContextMenu={onItemContextMenu}
      selectionActions={selectionActions}
      renderLeading={(project) => {
        const color = project.color || '#5E6AD2';
        return (
          <>
            {/* 图标 */}
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-white"
              style={{ background: color }}
              title={project.icon || 'folder'}
            >
              {getProjectIconNode(project.icon)}
            </span>
            {/* 名称（完整展示，不截断）+ 来源徽标 */}
            <span className="min-w-0 shrink-0 whitespace-nowrap text-sm font-medium text-foreground">{project.name}</span>
            <ListChip className="border border-border bg-muted/40 uppercase text-muted-foreground">
              {getSourceBadgeText(project.source)}
            </ListChip>
          </>
        );
      }}
      renderTrailing={(project) => {
        const health = HEALTH_STYLE[project.healthStatus || 'at_risk'];
        const priority = project.priority || 'medium';
        const workflow = project.workflowStatus || 'planned';
        const owner = project.owner || (project.members ?? []).find((m) => m.role === 'owner')?.user;
        const members = project.members ?? [];
        const progress = Math.max(0, Math.min(100, project.progress ?? 0));
        const taskCount = project._count?.tasks;
        const rowUpdatedAt = project.lastActivityAt || project.updatedAt;
        return (
          <>
            {/* 状态 */}
            <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-0.5 text-xs capitalize', WORKFLOW_STYLE[workflow])}>
              {getWorkflowIcon(workflow)}
              <span>{workflow.replace('_', ' ')}</span>
            </span>
            {/* 健康分 */}
            <span className="flex shrink-0 items-center gap-1.5">
              {getHealthIcon(project.healthStatus || 'at_risk')}
              <span className={cn('text-xs font-medium', health.text)}>{project.healthScore ?? '—'}</span>
            </span>
            {/* 优先级 */}
            <span className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1', PRIORITY_STYLE[priority].ring)}>
              {getPriorityIcon(priority)}
            </span>
            {/* 负责人 */}
            {owner ? (
              <ListAvatar
                name={owner.displayName || owner.username}
                url={owner.avatarUrl}
                color="hsl(var(--primary))"
              />
            ) : (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><UserRound className="size-4" />Unassigned</span>
            )}
            {/* 成员头像堆叠 */}
            <div className="flex shrink-0 -space-x-2">
              {members.slice(0, 3).map((member) => (
                <ListAvatar
                  key={member.user.id}
                  name={member.user.displayName || member.user.username}
                  url={member.user.avatarUrl}
                  color="hsl(var(--muted-foreground))"
                />
              ))}
              {members.length > 3 ? (
                <span className="inline-flex size-6 items-center justify-center rounded-full border border-background bg-muted text-10 font-medium text-muted-foreground">
                  +{members.length - 3}
                </span>
              ) : null}
            </div>
            {/* 起止日期 */}
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="size-3.5" /> {formatDate(project.startDate)}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="size-3.5" /> {formatDate(project.targetDate)}
            </span>
            {/* 进度 */}
            <span className="flex shrink-0 items-center gap-2">
              <span className="h-1.5 w-16 overflow-hidden rounded bg-muted/50">
                <span className="block h-full rounded bg-accent-blue" style={{ width: `${progress}%` }} />
              </span>
              <span className="tabular-nums text-xs text-muted-foreground">{progress}%</span>
              {taskCount != null ? (
                <span className="text-xs text-muted-foreground">{Math.round((taskCount * progress) / 100)}/{taskCount}</span>
              ) : null}
            </span>
            {/* 更新时间 */}
            <ListText className="shrink-0 text-muted-foreground">{formatDate(rowUpdatedAt)}</ListText>
          </>
        );
      }}
    />
  );
}

function groupValue(groupBy: Exclude<GroupBy, 'none'>, project: Project): string {
  if (groupBy === 'status') return project.status || 'active';
  return project.type || 'team';
}

export { ListActionButton };
