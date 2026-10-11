/**
 * TeamTableView - 团队列表表格视图（CAP-A-29 视图形态完整性）
 *
 * 基于通用 DataTable；行点击进详情、右键菜单与 TeamList 同源
 * （查看详情 / 归档），多选批量归档经页面 selectionActions 注入。
 */
import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ListAvatar } from '@/shared/components/data-list';
import type { MenuItem } from '@/components/ui/context-menu';
import type { DataListItem } from '@/shared/components/data-list';
import type { Team } from '../types';

export type TeamTableRow = Team & DataListItem;

export interface TeamTableViewProps {
  teams: TeamTableRow[];
  loading?: boolean;
  onTeamClick: (team: TeamTableRow) => void;
  onArchive?: (team: TeamTableRow) => void;
  selectionActions?: (selected: TeamTableRow[], clear: () => void) => React.ReactNode;
  className?: string;
}

export function TeamTableView({
  teams,
  loading = false,
  onTeamClick,
  onArchive,
  selectionActions,
  className,
}: TeamTableViewProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const onRowContextMenu = (team: TeamTableRow): MenuItem[] => {
    const items: MenuItem[] = [
      {
        id: 'view',
        label: t('teams.context.view', '查看详情'),
        onClick: () => onTeamClick(team),
      },
    ];
    if (team.status === 'active' && onArchive) {
      items.push({
        id: 'archive',
        label: t('teams.archive', '归档'),
        destructive: true,
        onClick: () => onArchive(team),
      });
    }
    return items;
  };

  const columns = useMemo<ColumnDef<TeamTableRow, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (team) => team.name,
        header: t('teams.columns.name'),
        size: 220,
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-2">
            <ListAvatar
              name={row.original.name}
              url={row.original.avatarUrl}
              color={row.original.color || 'var(--color-brand-linear)'}
            />
            <span className="shrink-0 whitespace-nowrap text-sm font-medium text-foreground">
              {row.original.name}
            </span>
            <span className="truncate font-mono text-xs text-muted-foreground">@{row.original.slug}</span>
          </span>
        ),
      },
      {
        id: 'members',
        accessorFn: (team) => team.memberCount ?? team._count?.members ?? 0,
        header: t('teams.columns.members'),
        size: 100,
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            {row.original.memberCount ?? row.original._count?.members ?? 0}
          </span>
        ),
      },
      {
        id: 'projects',
        accessorFn: (team) => team._count?.projects ?? 0,
        header: t('teams.columns.projects'),
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original._count?.projects ?? 0}</span>
        ),
      },
      {
        id: 'status',
        accessorFn: (team) => team.status,
        header: t('teams.columns.status'),
        size: 100,
        cell: ({ row }) =>
          row.original.status === 'archived' ? (
            <Badge variant="secondary" className="text-3xs">
              {t('teams.status.archived', '已归档')}
            </Badge>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent-green" />
              {t('teams.status.active', '活跃')}
            </span>
          ),
      },
    ],
    [t],
  );

  return (
    <DataTable<TeamTableRow>
      columns={columns}
      data={teams}
      getRowId={(team) => team.id}
      onRowClick={onTeamClick}
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
      emptyContent={
        <div className="p-8 text-center text-sm text-muted-foreground">
          {loading ? t('common.loading') : t('teams.emptyList', '暂无团队')}
        </div>
      }
      className={className}
    />
  );
}
