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

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {team.avatarUrl ? (
              <img
                src={team.avatarUrl}
                alt={team.name}
                className="size-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex size-10 shrink-0 items-center justify-center font-semibold text-white"
                style={{ backgroundColor: team.color || '#5E6AD2' }}
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
            <Badge variant="secondary" className="text-10">
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
              <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-10">
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
                className="h-6 px-2 text-10"
                title={t('teams.archive', '归档')}
                onClick={() => onArchive(team)}
              >
                <Archive className="size-3" />
              </Button>
            )}
            <Button asChild variant="ghost" size="sm" className="h-6 px-2">
              <Link to={`/app/teams/${team.id}`}>
                {t('teams.detail', '详情')} <ChevronRight className="size-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
