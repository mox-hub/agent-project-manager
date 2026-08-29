/**
 * ProjectSimpleList - 基于自建 DataList 的项目列表适配
 *
 * 保留原 ProjectList 的展示字段，并做适应化改造（行式布局 + 多选）：
 * - 首要信息区：图标(彩色) + 名称 + 来源徽标
 * - 次要信息区：工作流状态(StatusPill) / 健康分 / 优先级 / 负责人 / 团队 / 成员 / 进度 / 起止日期(ListDate) / 更新时间
 * 行点击进入项目详情；多选悬浮胶囊操作由页面通过 selectionActions 注入。
 * 右键菜单与任务列表同款：枚举元数据二级子菜单直改（useUpdateProject），不可枚举字段走编辑对话框。
 */

import {
  FolderKanban,
  Rocket,
  Sparkles,
  Target,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataList, ListActionButton, ListChip, ListText, ListAvatar, ListDate } from '@/components/ui/data-list';
import { StatusPill } from '@/components/ui/status-pill';
import type { MenuItem } from '@/components/ui/context-menu';
import { buildProjectRowMenu } from '@/shared/context-menu/row-context-menu';
import {
  HEALTH_VISUALS,
  PRIORITY_VISUALS,
  PROJECT_WORKFLOW_VISUALS,
  TONE_TEXT_CLASS,
} from '@/shared/status/status-visuals';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useMembers } from '@/modules/team-member/hooks';
import { useUpdateProject } from '../hooks/use-project-mutations';
import { ProjectFormDialog } from './project-form-dialog';
import type { Project, ProjectPriority } from '../api/project-api';
import { cn } from '@/lib/utils';

type GroupBy = 'none' | 'status' | 'type';

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

function getSourceBadgeText(source?: Project['source']) {
  if (!source) return 'local';
  if (source === 'github_projects') return 'github';
  return source;
}

function isOverdue(project: Project): boolean {
  if (!project.targetDate) return false;
  if (project.workflowStatus === 'completed' || project.status === 'archived') return false;
  return new Date(project.targetDate).getTime() < Date.now();
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
  const { t } = useTranslation();
  const groupFn = groupBy === 'none' ? undefined : (project: Project) => groupValue(groupBy, project);

  const groupLabel = (key: string) => {
    switch (groupBy) {
      case 'status': {
        return {
          label: key === 'active' ? t('status.project.active') : key === 'archived' ? t('status.project.archived') : key,
          icon: <span className={cn('inline-block size-3 rounded-full', key === 'active' ? 'bg-accent-green' : 'bg-muted-foreground')} />,
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

  // —— 统一行右键菜单（任务同款：枚举直改 + 编辑对话框） ——
  const navigate = useNavigate();
  const confirmAction = useConfirm();
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const updateProject = useUpdateProject();
  const { data: membersData } = useMembers({ limit: 200 });
  const ownerOptions = membersData?.items ?? [];

  const onItemContextMenu = (project: Project): MenuItem[] =>
    buildProjectRowMenu({
      linkPath: `/app/projects/${project.id}`,
      project,
      t,
      owners: ownerOptions,
      onUpdate: (data) => updateProject.mutate({ projectId: project.id, data }),
      onEditBasic: () => setEditingProject(project),
      pinned: pinnedIds.has(project.id),
      onTogglePin: () =>
        setPinnedIds((prev) => {
          const next = new Set(prev);
          if (next.has(project.id)) next.delete(project.id);
          else next.add(project.id);
          return next;
        }),
      // 删除属危险操作，统一引导到项目设置的危险区确认
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
    <>
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
        const workflowKey = project.workflowStatus || 'planned';
        const workflowVisual = PROJECT_WORKFLOW_VISUALS[workflowKey] ?? PROJECT_WORKFLOW_VISUALS.planned;
        const WorkflowIcon = workflowVisual.icon;
        const healthKey = project.healthStatus || 'at_risk';
        const healthVisual = HEALTH_VISUALS[healthKey] ?? HEALTH_VISUALS.at_risk;
        const HealthIcon = healthVisual.icon;
        const priority = (project.priority || 'medium') as ProjectPriority;
        const priorityVisual = PRIORITY_VISUALS[priority] ?? PRIORITY_VISUALS.medium;
        const PriorityIcon = priorityVisual.icon;
        const owner = project.owner || (project.members ?? []).find((m) => m.role === 'owner')?.user;
        const members = project.members ?? [];
        const teams = project.teams ?? [];
        const progressValue = Math.max(0, Math.min(100, project.progress ?? 0));
        const rowUpdatedAt = project.lastActivityAt || project.updatedAt;
        return (
          <>
            {/* 工作流状态（StatusPill 统一 tone） */}
            <StatusPill tone={workflowVisual.tone}>
              <WorkflowIcon className="size-3" />
              {t(workflowVisual.labelKey)}
            </StatusPill>
            {/* 健康分 */}
            <span className="flex shrink-0 items-center gap-1.5">
              <HealthIcon className={cn('size-4', TONE_TEXT_CLASS[healthVisual.tone])} />
              <span className={cn('text-xs font-medium', TONE_TEXT_CLASS[healthVisual.tone])}>{project.healthScore ?? '—'}</span>
            </span>
            {/* 优先级（图标 + 文字） */}
            <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs font-medium', TONE_TEXT_CLASS[priorityVisual.tone])}>
              <PriorityIcon className="size-3.5" />
              {t(priorityVisual.labelKey)}
            </span>
            {/* 负责人 */}
            {owner ? (
              <ListAvatar
                name={owner.displayName || owner.username}
                url={owner.avatarUrl}
                color="hsl(var(--primary))"
              />
            ) : (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><UserRound className="size-4" />{t('project.menu.unassigned')}</span>
            )}
            {/* 所属团队 */}
            {teams.length > 0 ? (
              <span className="flex shrink-0 items-center gap-1">
                {teams.slice(0, 2).map((team) => (
                  <ListChip key={team.id} color={team.color ?? undefined}>
                    {team.name}
                  </ListChip>
                ))}
                {teams.length > 2 ? (
                  <span className="text-xs text-muted-foreground">+{teams.length - 2}</span>
                ) : null}
              </span>
            ) : null}
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
            {/* 起止日期（ListDate，目标日期逾期红显） */}
            {project.startDate ? (
              <ListDate value={project.startDate} />
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground">—</span>
            )}
            {project.targetDate ? (
              <ListDate value={project.targetDate} overdue={isOverdue(project)} />
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground">—</span>
            )}
            {/* 进度（真实 progress 字段） */}
            <span className="flex shrink-0 items-center gap-2">
              <span className="h-1.5 w-16 overflow-hidden rounded bg-muted/50">
                <span
                  className={cn('block h-full rounded', workflowVisual.tone === 'success' ? 'bg-accent-green' : 'bg-accent-blue')}
                  style={{ width: `${progressValue}%` }}
                />
              </span>
              <span className="tabular-nums text-xs text-muted-foreground">{progressValue}%</span>
            </span>
            {/* 更新时间 */}
            <ListText className="shrink-0 text-muted-foreground">{formatDate(rowUpdatedAt)}</ListText>
          </>
        );
      }}
      />
      {/* 编辑基本信息对话框（右键「编辑基本信息」入口） */}
      <ProjectFormDialog
        open={!!editingProject}
        onOpenChange={(open) => {
          if (!open) setEditingProject(null);
        }}
        project={editingProject}
      />
    </>
  );
}

function groupValue(groupBy: Exclude<GroupBy, 'none'>, project: Project): string {
  if (groupBy === 'status') return project.status || 'active';
  return project.type || 'team';
}

export { ListActionButton };
