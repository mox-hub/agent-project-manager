/**
 * MemberTableView - 成员列表表格视图（CAP-A-29 视图形态完整性）
 *
 * 基于通用 DataTable；行点击进详情、右键菜单与 MemberList 同源
 * （查看详情 / 管理员停用），多选批量停用经页面 selectionActions 注入。
 */
import { useMemo, useState } from 'react';
import { Bot, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { TrustLevelBadge } from './trust-level-badge';
import { MemberAvatar } from './member-avatar';
import { isSystemAssistantMember } from '@/shared/member/types';
import { type DataListItem } from '@/shared/components/data-list';
import type { MenuItem } from '@/components/ui/context-menu';
import type { Member } from '../types';
import { cn } from '@/lib/utils';

export type MemberTableRow = Member & DataListItem;

export interface MemberTableViewProps {
  members: MemberTableRow[];
  loading?: boolean;
  onMemberClick: (member: MemberTableRow) => void;
  /** 管理员可见的停用入口（右键菜单） */
  isAdmin?: boolean;
  onDeactivate?: (member: MemberTableRow) => void;
  selectionActions?: (selected: MemberTableRow[], clear: () => void) => React.ReactNode;
  className?: string;
}

export function MemberTableView({
  members,
  loading = false,
  onMemberClick,
  isAdmin,
  onDeactivate,
  selectionActions,
  className,
}: MemberTableViewProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const onRowContextMenu = (member: MemberTableRow): MenuItem[] => {
    const items: MenuItem[] = [
      {
        id: 'view',
        label: t('members.context.view', '查看详情'),
        onClick: () => onMemberClick(member),
      },
    ];
    if (isAdmin && member.status === 'active' && onDeactivate && !isSystemAssistantMember(member)) {
      items.push({
        id: 'deactivate',
        label: t('members.deactivate', '停用'),
        destructive: true,
        onClick: () => onDeactivate(member),
      });
    }
    return items;
  };

  const columns = useMemo<ColumnDef<MemberTableRow, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (member) => member.displayName,
        header: t('members.columns.name'),
        size: 220,
        cell: ({ row }) => {
          const member = row.original;
          return (
            <span className="flex min-w-0 items-center gap-2">
              <MemberAvatar member={member} size="md" showBadge={false} />
              <span className="shrink-0 whitespace-nowrap text-sm font-medium text-foreground">
                {member.displayName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                @{member.handle}
                {member.title ? ` · ${member.title}` : ''}
              </span>
            </span>
          );
        },
      },
      {
        id: 'type',
        accessorFn: (member) => member.type,
        header: t('members.columns.type'),
        size: 90,
        cell: ({ row }) => {
          const isAi = row.original.type === 'ai_agent';
          const Icon = isAi ? Bot : UserIcon;
          return (
            <span className={cn('inline-flex items-center gap-1.5 text-xs', isAi ? 'text-accent-purple' : 'text-accent-blue')}>
              <Icon className="size-3.5" />
              {isAi ? 'AI' : t('members.filter.human', '人类')}
            </span>
          );
        },
      },
      {
        id: 'trust',
        accessorFn: (member) => member.trustLevel ?? 0,
        header: t('members.columns.trust'),
        size: 100,
        cell: ({ row }) => <TrustLevelBadge level={row.original.trustLevel} />,
      },
      {
        id: 'status',
        accessorFn: (member) => `${member.status}:${member.isOnline ? 1 : 0}`,
        header: t('members.columns.status'),
        size: 100,
        cell: ({ row }) => {
          const member = row.original;
          return (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  member.status === 'active'
                    ? member.isOnline
                      ? 'bg-accent-green'
                      : 'bg-accent-green/40'
                    : 'bg-muted-foreground/40',
                )}
              />
              {member.status === 'active'
                ? member.isOnline
                  ? t('members.status.online', '在线')
                  : t('members.status.active', '活跃')
                : member.status}
            </span>
          );
        },
      },
      {
        id: 'shortId',
        accessorFn: (member) => member.shortId,
        header: t('members.columns.id'),
        size: 90,
        cell: ({ row }) => (
          <span className="font-mono text-3xs text-muted-foreground/70">{row.original.shortId}</span>
        ),
      },
    ],
    [t],
  );

  return (
    <DataTable<MemberTableRow>
      columns={columns}
      data={members}
      getRowId={(member) => member.id}
      onRowClick={onMemberClick}
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
          {loading ? t('common.loading') : t('members.empty', '暂无成员')}
        </div>
      }
      className={className}
    />
  );
}
