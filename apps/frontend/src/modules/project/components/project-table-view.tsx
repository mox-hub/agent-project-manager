/**
 * ProjectTableView - 项目列表表格视图（CAP-A-29 视图形态完整性）
 *
 * 基于通用 DataTable；列口径与 ProjectSimpleList 对齐（同列键/同视觉词表），
 * 列显隐沿用页内 displayMenu 下发的可见列集合（app-store projectListVisibleColumns），
 * 行右键菜单与列表视图同源（buildProjectRowMenu），不新造写路径。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { FolderKanban, Rocket, Sparkles, Target, Wrench } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { StatusPill } from '@/components/semantic/status-pill';
import { ListAvatar, ListDate } from '@/shared/components/data-list';
import { buildProjectRowMenu } from '@/shared/context-menu/row-context-menu';
import type { MenuItem } from '@/components/ui/context-menu';
import {
  HEALTH_VISUALS,
  PRIORITY_VISUALS,
  PROJECT_WORKFLOW_VISUALS,
  TONE_TEXT_CLASS,
} from '@/shared/status/status-visuals';
import { useStatusVisualMap, type StatusVisualEntry } from '@/modules/core-config/hooks/use-status-visual-map';
import type { Project, ProjectPriority } from '../api/project-api';
import { cn } from '@/lib/utils';

/** 表格列键：与页面 getColumnOptions/displayMenu 同一词表（icon 为独立列可显隐） */
export type ProjectTableColumnKey =
  | 'icon'
  | 'name'
  | 'health'
  | 'priority'
  | 'owner'
  | 'members'
  | 'start'
  | 'target'
  | 'progress'
  | 'updated'
  | 'status';

export interface ProjectTableViewProps {
  projects: Project[];
  loading?: boolean;
  onProjectClick?: (project: Project) => void;
  /** 行右键菜单（与列表视图同源；不传则无右键菜单） */
  onRowContextMenu?: (project: Project) => MenuItem[];
  /** 多选批量操作（对齐列表视图 selectionActions） */
  selectionActions?: (selected: Project[], clear: () => void) => React.ReactNode;
  /** 可见列集合（页内 displayMenu 维护；不传 = 全部展示） */
  visibleColumns?: ProjectTableColumnKey[];
  className?: string;
}

function getProjectIconNode(icon?: string | null) {
  if (icon === 'rocket') return <Rocket className="size-4" />;
  if (icon === 'target') return <Target className="size-4" />;
  if (icon === 'tooling') return <Wrench className="size-4" />;
  if (icon === 'spark') return <Sparkles className="size-4" />;
  return <FolderKanban className="size-4" />;
}

const priorityRank: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };

function isOverdue(project: Project): boolean {
  if (!project.targetDate) return false;
  if (project.workflowStatus === 'completed' || project.workflowStatus === 'canceled') return false;
  return new Date(project.targetDate) < new Date();
}

export function ProjectTableView({
  projects,
  loading = false,
  onProjectClick,
  onRowContextMenu,
  selectionActions,
  visibleColumns,
  className,
}: ProjectTableViewProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const workflowVisualMap = useStatusVisualMap('project');

  const columns = useMemo<ColumnDef<Project, unknown>[]>(() => {
    const all: Array<{ key: ProjectTableColumnKey; column: ColumnDef<Project, unknown> }> = [
      {
        key: 'icon',
        column: {
          id: 'icon',
          header: '',
          enableSorting: false,
          size: 48,
          cell: ({ row }) => {
            const project = row.original;
            const color = project.color || 'var(--color-brand-linear)';
            return (
              <span
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-white"
                style={{ background: color }}
                title={project.icon || 'folder'}
              >
                {getProjectIconNode(project.icon)}
              </span>
            );
          },
        },
      },
      {
        key: 'name',
        column: {
          id: 'name',
          accessorFn: (project) => project.name,
          header: t('project.columns.name'),
          size: 200,
          cell: ({ row }) => (
            <span className="min-w-0 truncate font-medium text-foreground">{row.original.name}</span>
          ),
        },
      },
      {
        key: 'status',
        column: {
          id: 'status',
          accessorFn: (project) => project.workflowStatus || 'planned',
          header: t('project.columns.status'),
          size: 110,
          cell: ({ row }) => {
            const project = row.original;
            const workflowKey = project.workflowStatus || 'planned';
            const workflowVisual: StatusVisualEntry = workflowVisualMap.get(workflowKey)
              ?? { ...(PROJECT_WORKFLOW_VISUALS[workflowKey] ?? PROJECT_WORKFLOW_VISUALS.planned) };
            const WorkflowIcon = workflowVisual.icon;
            return (
              <StatusPill tone={workflowVisual.tone}>
                <WorkflowIcon
                  strokeWidth={2.5}
                  className="size-3"
                  style={workflowVisual.color ? { color: workflowVisual.color } : undefined}
                />
                {t(workflowVisual.labelKey)}
              </StatusPill>
            );
          },
        },
      },
      {
        key: 'health',
        column: {
          id: 'health',
          accessorFn: (project) => project.healthScore ?? -1,
          header: t('project.columns.health'),
          size: 90,
          cell: ({ row }) => {
            const project = row.original;
            const healthKey = project.healthStatus || 'at_risk';
            const healthVisual = HEALTH_VISUALS[healthKey] ?? HEALTH_VISUALS.at_risk;
            const HealthIcon = healthVisual.icon;
            return (
              <span className="flex items-center gap-1.5">
                <HealthIcon className={cn('size-4', TONE_TEXT_CLASS[healthVisual.tone])} />
                <span className={cn('text-xs font-medium', TONE_TEXT_CLASS[healthVisual.tone])}>
                  {project.healthScore ?? '—'}
                </span>
              </span>
            );
          },
        },
      },
      {
        key: 'priority',
        column: {
          id: 'priority',
          accessorFn: (project) => priorityRank[project.priority || 'medium'] ?? 0,
          header: t('project.columns.priority'),
          size: 96,
          cell: ({ row }) => {
            const priority = (row.original.priority || 'medium') as ProjectPriority;
            const priorityVisual = PRIORITY_VISUALS[priority] ?? PRIORITY_VISUALS.medium;
            const PriorityIcon = priorityVisual.icon;
            return (
              <span className={cn('inline-flex items-center gap-1 text-xs font-medium', TONE_TEXT_CLASS[priorityVisual.tone])}>
                <PriorityIcon className="size-3.5" />
                {t(priorityVisual.labelKey)}
              </span>
            );
          },
        },
      },
      {
        key: 'owner',
        column: {
          id: 'owner',
          accessorFn: (project) =>
            project.owner?.displayName || project.owner?.username || '',
          header: t('project.columns.owner'),
          size: 120,
          cell: ({ row }) => {
            const owner = row.original.owner
              ?? (row.original.members ?? []).find((m) => m.role === 'owner')?.user;
            if (!owner) {
              return <span className="text-xs text-muted-foreground/50">—</span>;
            }
            const name = owner.displayName || owner.username || '';
            return (
              <span className="flex items-center gap-1.5">
                <ListAvatar name={name} url={owner.avatarUrl} color="hsl(var(--primary))" />
                <span className="truncate text-xs text-foreground">{name}</span>
              </span>
            );
          },
        },
      },
      {
        key: 'members',
        column: {
          id: 'members',
          accessorFn: (project) => (project.members ?? []).length,
          header: t('project.columns.members'),
          size: 110,
          enableSorting: false,
          cell: ({ row }) => {
            const members = row.original.members ?? [];
            if (members.length === 0) return <span className="text-xs text-muted-foreground/50">—</span>;
            return (
              <div className="flex -space-x-2">
                {members.slice(0, 3).map((member) => (
                  <ListAvatar
                    key={member.user.id}
                    name={member.user.displayName || member.user.username}
                    url={member.user.avatarUrl}
                    color="hsl(var(--muted-foreground))"
                  />
                ))}
                {members.length > 3 ? (
                  <span className="inline-flex size-6 items-center justify-center rounded-full border border-background bg-muted text-3xs font-medium text-muted-foreground">
                    +{members.length - 3}
                  </span>
                ) : null}
              </div>
            );
          },
        },
      },
      {
        key: 'start',
        column: {
          id: 'start',
          accessorFn: (project) => (project.startDate ? new Date(project.startDate).getTime() : 0),
          header: t('project.columns.start'),
          size: 100,
          cell: ({ row }) =>
            row.original.startDate ? (
              <ListDate value={row.original.startDate} />
            ) : (
              <span className="text-xs text-muted-foreground/50">—</span>
            ),
        },
      },
      {
        key: 'target',
        column: {
          id: 'target',
          accessorFn: (project) => (project.targetDate ? new Date(project.targetDate).getTime() : 0),
          header: t('project.columns.target'),
          size: 100,
          cell: ({ row }) =>
            row.original.targetDate ? (
              <ListDate value={row.original.targetDate} overdue={isOverdue(row.original)} />
            ) : (
              <span className="text-xs text-muted-foreground/50">—</span>
            ),
        },
      },
      {
        key: 'progress',
        column: {
          id: 'progress',
          accessorFn: (project) => project.progress ?? 0,
          header: t('project.columns.progress'),
          size: 110,
          cell: ({ row }) => {
            const progressValue = Math.max(0, Math.min(100, row.original.progress ?? 0));
            return (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-16 overflow-hidden rounded-xs bg-muted/50">
                  <span
                    className="block h-full rounded-xs bg-accent-blue"
                    style={{ width: `${progressValue}%` }}
                  />
                </span>
                <span className="tabular-nums text-xs text-muted-foreground">{progressValue}%</span>
              </span>
            );
          },
        },
      },
      {
        key: 'updated',
        column: {
          id: 'updated',
          accessorFn: (project) =>
            new Date(project.lastActivityAt || project.updatedAt).getTime(),
          header: t('project.columns.updated'),
          size: 100,
          cell: ({ row }) => <ListDate value={row.original.lastActivityAt || row.original.updatedAt} />,
        },
      },
    ];
    // 列显隐：按页内 displayMenu 下发的可见集合过滤（icon 列同规则可隐藏）
    if (!visibleColumns) return all.map((entry) => entry.column);
    return all
      .filter((entry) => visibleColumns.includes(entry.key))
      .map((entry) => entry.column);
  }, [t, workflowVisualMap, visibleColumns]);

  return (
    <DataTable<Project>
      columns={columns}
      data={projects}
      getRowId={(project) => project.id}
      onRowClick={onProjectClick}
      onRowContextMenu={onRowContextMenu}
      enableSelection={!!selectionActions}
      selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds}
      selectionActions={
        selectionActions
          ? (selectedRows, clear) => selectionActions(selectedRows, clear)
          : undefined
      }
      pageSize={50}
      stickyHeader
      maxHeight="calc(100vh - 260px)"
      emptyContent={
        <div className="p-8 text-center text-sm text-muted-foreground">
          {loading ? t('common.loading') : t('project.messages.noProjects')}
        </div>
      }
      className={className}
    />
  );
}
