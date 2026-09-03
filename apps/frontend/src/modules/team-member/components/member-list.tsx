/**
 * MemberList - 基于自建 DataList 的成员列表（成员列表页 list 视图）
 *
 * 行式布局 + 多选 + 右键菜单：
 * - 首要信息区：头像 + 显示名 + @handle · 职务
 * - 次要信息区：类型图标 / 信任徽标 / 在线状态 / 短 ID
 * 行点击进入成员详情；多选悬浮胶囊操作由页面通过 selectionActions 注入。
 */
import { Bot, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataList, type DataListItem } from '@/components/ui/data-list';
import type { MenuItem } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { Member } from '../types';
import { MemberAvatar } from './member-avatar';
import { TrustLevelBadge } from './trust-level-badge';

export type MemberListItem = Member & DataListItem;

export interface MemberListProps {
  members: MemberListItem[];
  loading?: boolean;
  emptyMessage?: string;
  onMemberClick: (member: MemberListItem) => void;
  /** 管理员可见的停用入口（右键菜单） */
  isAdmin?: boolean;
  onDeactivate?: (member: MemberListItem) => void;
  selectionActions?: (selected: MemberListItem[], close: () => void) => React.ReactNode;
  className?: string;
}

export function MemberList({
  members,
  loading,
  emptyMessage,
  onMemberClick,
  isAdmin,
  onDeactivate,
  selectionActions,
  className,
}: MemberListProps) {
  const { t } = useTranslation();

  const onItemContextMenu = (member: MemberListItem): MenuItem[] => {
    const items: MenuItem[] = [
      {
        id: 'view',
        label: t('members.context.view', '查看详情'),
        icon: <UserIcon className="size-4" />,
        onClick: () => onMemberClick(member),
      },
    ];
    if (isAdmin && member.status === 'active' && onDeactivate) {
      items.push({
        id: 'deactivate',
        label: t('members.deactivate', '停用'),
        destructive: true,
        onClick: () => onDeactivate(member),
      });
    }
    return items;
  };

  return (
    <DataList
      items={members}
      loading={loading}
      emptyMessage={emptyMessage}
      className={className}
      selectable
      onItemClick={onMemberClick}
      onItemContextMenu={onItemContextMenu}
      selectionActions={selectionActions}
      renderLeading={(member) => (
        <>
          <MemberAvatar member={member} size="md" showBadge={false} />
          <span className="min-w-0 shrink-0 whitespace-nowrap text-sm font-medium text-foreground">
            {member.displayName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            @{member.handle}
            {member.title ? ` · ${member.title}` : ''}
          </span>
        </>
      )}
      renderTrailing={(member) => (
        <>
          {member.type === 'ai_agent' ? (
            <Bot className="size-4 shrink-0 text-accent-purple" />
          ) : (
            <UserIcon className="size-4 shrink-0 text-accent-blue" />
          )}
          <TrustLevelBadge level={member.trustLevel} score={member.trustScore} />
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
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
          <span className="shrink-0 font-mono text-10 text-muted-foreground/70">
            {member.shortId}
          </span>
        </>
      )}
    />
  );
}
