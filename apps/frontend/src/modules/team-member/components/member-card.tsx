/**
 * MemberCard - 成员卡片（成员列表页 grid 视图）
 *
 * 从 members-page 抽出的卡片形态：头像（悬浮成员卡）+ 名称/职务 + 信任徽标
 * + 描述 + 标签 + 底部归属/停用操作。
 */
import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Member } from '../types';
import { MemberAvatar } from './member-avatar';
import { MemberCardPopover } from './member-card-popover';
import { TrustLevelBadge } from './trust-level-badge';

export interface MemberCardProps {
  member: Member;
  /** 管理员可见操作（停用） */
  isAdmin?: boolean;
  onDeactivate?: (member: Member) => void;
}

export function MemberCard({ member, isAdmin, onDeactivate }: MemberCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <MemberCardPopover
            memberId={member.id}
            trigger={
              <MemberAvatar
                member={member}
                size="md"
                showBadge={false}
              />
            }
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/app/members/${member.id}`}
                className="truncate text-sm font-semibold hover:underline"
              >
                {member.displayName}
              </Link>
              {member.type === 'ai_agent' && (
                <Bot className="size-3.5 shrink-0 text-accent-purple" />
              )}
            </div>
            <p className="truncate text-11 text-muted-foreground">
              @{member.handle}
              {member.title ? ` · ${member.title}` : ''}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {member.isOnline && (
                <span className="size-1.5 rounded-full bg-accent-green" />
              )}
              <span className="text-10 text-muted-foreground">
                {member.status === 'active'
                  ? member.isOnline
                    ? t('members.status.online', '在线')
                    : t('members.status.active', '活跃')
                  : member.status}
              </span>
              <span className="font-mono text-10 text-muted-foreground/70">
                {member.shortId}
              </span>
            </div>
          </div>
          <TrustLevelBadge level={member.trustLevel} />
        </div>

        {(member.description ?? member.bio) && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {member.description ?? member.bio}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-1">
          {(member.tags ?? []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-10">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-11">
          <span className="truncate text-muted-foreground">
            {member.type === 'human'
              ? member.user?.username ?? t('members.standaloneUser', '独立用户')
              : member.aiModelConfig?.name ?? member.aiProvider ?? 'AI'}
          </span>
          {isAdmin && member.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-10 text-accent-red hover:text-accent-red"
              onClick={() => onDeactivate?.(member)}
            >
              {t('members.deactivate', '停用')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
