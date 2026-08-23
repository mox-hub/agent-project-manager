/**
 * TeamList - 基于自建 DataList 的团队列表（团队列表页 list 视图）
 *
 * 行式布局 + 多选 + 右键菜单：
 * - 首要信息区：团队色块 + 名称 + @slug
 * - 次要信息区：成员数 / 项目数 / 归档徽标
 * 行点击进入团队详情；多选悬浮胶囊操作由页面通过 selectionActions 注入。
 */
import { Archive, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataList, ListAvatar, type DataListItem } from '@/components/ui/data-list';
import type { MenuItem } from '@/components/ui/context-menu';
import { Badge } from '@/components/ui/badge';
import type { Team } from '../types';

export type TeamListItem = Team & DataListItem;

export interface TeamListProps {
  teams: TeamListItem[];
  loading?: boolean;
  emptyMessage?: string;
  onTeamClick: (team: TeamListItem) => void;
  onArchive?: (team: TeamListItem) => void;
  selectionActions?: (selected: TeamListItem[], close: () => void) => React.ReactNode;
  className?: string;
}

export function TeamList({
  teams,
  loading,
  emptyMessage,
  onTeamClick,
  onArchive,
  selectionActions,
  className,
}: TeamListProps) {
  const { t } = useTranslation();

  const onItemContextMenu = (team: TeamListItem): MenuItem[] => {
    const items: MenuItem[] = [
      {
        id: 'view',
        label: t('teams.context.view', '查看详情'),
        icon: <Users className="size-4" />,
        onClick: () => onTeamClick(team),
      },
    ];
    if (team.status === 'active' && onArchive) {
      items.push({
        id: 'archive',
        label: t('teams.archive', '归档'),
        icon: <Archive className="size-4" />,
        destructive: true,
        onClick: () => onArchive(team),
      });
    }
    return items;
  };

  return (
    <DataList
      items={teams}
      loading={loading}
      emptyMessage={emptyMessage}
      className={className}
      selectable
      onItemClick={onTeamClick}
      onItemContextMenu={onItemContextMenu}
      selectionActions={selectionActions}
      renderLeading={(team) => (
        <>
          <ListAvatar name={team.name} url={team.avatarUrl} color={team.color || '#5E6AD2'} />
          <span className="min-w-0 shrink-0 whitespace-nowrap text-sm font-medium text-foreground">
            {team.name}
          </span>
          <span className="truncate font-mono text-xs text-muted-foreground">@{team.slug}</span>
        </>
      )}
      renderTrailing={(team) => (
        <>
          <span className="shrink-0 text-xs text-muted-foreground">
            {t('teams.memberCount', { defaultValue: '{{count}} 成员', count: team.memberCount ?? team._count?.members ?? 0 })}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {t('teams.projectCount', { defaultValue: '{{count}} 项目', count: team._count?.projects ?? 0 })}
          </span>
          {team.status === 'archived' && (
            <Badge variant="secondary" className="text-10">
              {t('teams.status.archived', '已归档')}
            </Badge>
          )}
        </>
      )}
    />
  );
}
