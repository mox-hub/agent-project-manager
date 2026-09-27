/**
 * TeamCard - 团队卡片（团队列表页 grid 视图）
 *
 * 从 teams-page 抽出的卡片形态：团队色块头像 + 名称/@slug + 描述 + 标签
 * + 成员/项目计数 + 归档/详情操作。
 */
import { Link } from 'react-router-dom';
import { Archive, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Team } from '../types';

export interface TeamCardProps {
  team: Team;
  onArchive?: (team: Team) => void;
}

export function TeamCard({ team, onArchive }: TeamCardProps) {
  const { t } = useTranslation();
  const memberCount = team.memberCount ?? team._count?.members ?? 0;

  // 悬停反馈用 ring 而非阴影（宪法 §3.6：全站唯一阴影档 shadow-xs）：
  // Card 自带 ring-1 ring-border/50，悬停把环色加深即可，无需新增阴影。
  return (
    <Card className="group transition-shadow hover:ring-border" data-ai-entity={`team:${team.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {team.avatarUrl ? (
              <img
                src={team.avatarUrl}
                alt={team.name}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                style={{ backgroundColor: team.color || 'var(--color-brand-linear)' }}
              >
                {team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{team.name}</CardTitle>
              <CardDescription className="truncate text-xs">
                @{team.slug}
                {team.ownerName ? ` · ${t('teams.owner', '创始人')} ${team.ownerName}` : ''}
              </CardDescription>
            </div>
          </div>
          {team.status === 'archived' && (
            <Badge variant="secondary" className="text-3xs">
              {t('teams.status.archived', '已归档')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {team.description && (
          <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{team.description}</p>
        )}
        {(team.tags ?? []).length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {(team.tags ?? []).slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-3xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t('teams.memberCount', { defaultValue: '{{count}} 成员', count: memberCount })} ·{' '}
            {t('teams.projectCount', { defaultValue: '{{count}} 项目', count: team._count?.projects ?? 0 })}
          </span>
          <div className="flex items-center gap-1">
            {team.status === 'active' && onArchive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-3xs"
                title={t('teams.archive', '归档')}
                onClick={() => onArchive(team)}
              >
                <Archive className="size-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              nativeButton={false}
              render={<Link to={`/app/teams/${team.id}`} />}
            >
              {t('teams.detail', '详情')} <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
