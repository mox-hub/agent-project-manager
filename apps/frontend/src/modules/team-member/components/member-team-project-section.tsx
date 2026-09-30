/**
 * 团队与项目（个人页合并 tab）
 * 层级语义：先参与的团队，团队再参与项目（TeamProject 关联）——
 * 团队节点下挂该团队参与的项目；不经团队的直绑项目单列。
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Folder, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { SectionCard } from '@/components/semantic/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/infrastructure/api-client';
import { useMemberCard, useBindMemberProject, useUnbindMemberProject } from '../hooks';
import type { MemberCard } from '../types';

function ProjectDot({ color }: { color?: string | null }) {
  return (
    <span
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color || 'var(--color-brand-linear)' }}
    />
  );
}

/** 直绑项目（source=direct 或历史无 source 的绑定） */
function directProjects(card: MemberCard | undefined) {
  return (card?.projects ?? []).filter((p) => p.source !== 'team');
}

export function MemberTeamProjectSection({ memberId }: { memberId: string }) {
  const { t } = useTranslation();
  const { data: card } = useMemberCard(memberId);
  const bind = useBindMemberProject(memberId);
  const unbind = useUnbindMemberProject(memberId);

  const { data: projectsData } = useQuery({
    queryKey: ['projects-for-bind', memberId],
    queryFn: async () => {
      return api.get<{
        items: Array<{ id: string; name: string; color: string | null }>;
      }>('/projects', { limit: 100 });
    },
    staleTime: 60 * 1000,
  });

  const teams = card?.teams ?? [];
  const direct = directProjects(card);
  const boundIds = new Set((card?.projects ?? []).map((p) => p.projectId));
  const availableProjects = (projectsData?.items ?? []).filter(
    (p) => !boundIds.has(p.id),
  );

  return (
    <>
      <SectionCard
        title={t('memberDetail.teamProjects.teams', '所属团队与项目')}
        description={t(
          'memberDetail.teamProjects.teamsDesc',
          '先参与的团队，团队再参与项目',
        )}
      >
        {teams.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('memberDetail.noTeams', '不在任何团队')}
          </p>
        ) : (
          <ul className="space-y-2">
            {teams.map((tm) => (
              <li key={tm.teamId} className="rounded-md border border-border">
                <div className="flex items-center justify-between px-3 py-2">
                  <Link
                    to={`/app/teams/${tm.teamId}`}
                    className="flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    <Users className="size-3.5 text-muted-foreground" />
                    {tm.teamName}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-3xs">
                      {t(`memberDetail.teamProjects.${tm.role}`, tm.role)}
                    </Badge>
                    <Badge variant="secondary" className="text-3xs">
                      {t('memberDetail.teamProjects.projectCount', {
                        count: tm.projects.length,
                        defaultValue: '{{count}} 项目',
                      })}
                    </Badge>
                  </div>
                </div>
                {tm.projects.length > 0 && (
                  <ul className="space-y-0.5 border-t border-border px-3 py-1.5">
                    {tm.projects.map((p) => (
                      <li key={p.projectId}>
                        <Link
                          to={`/app/projects/${p.projectId}`}
                          className="flex items-center gap-2 rounded-sm px-1 py-1 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                        >
                          <ProjectDot color={p.color} />
                          <span className="truncate">{p.projectName}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t('memberDetail.boundProjects', '直绑项目')}>
        {direct.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('memberDetail.teamProjects.noDirect', '无直绑项目（项目经团队参与）')}
          </p>
        ) : (
          <ul className="space-y-1">
            {direct.map((p) => (
              <li
                key={p.projectId}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/30"
              >
                <Link
                  to={`/app/projects/${p.projectId}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <ProjectDot color={p.color} />
                  {p.projectName}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-3xs">
                    {p.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-3xs text-accent-red"
                    onClick={() => unbind.mutate(p.projectId)}
                  >
                    {t('memberDetail.unbind', '解除')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {availableProjects.length > 0 && (
        <SectionCard title={t('memberDetail.bindNewProject', '绑定到新项目')}>
          <ul className="space-y-1">
            {availableProjects.slice(0, 10).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/30"
              >
                <div className="flex items-center gap-2 text-sm">
                  <ProjectDot color={p.color} />
                  {p.name}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-3xs"
                  onClick={() => bind.mutate({ projectId: p.id, role: 'member' })}
                >
                  {t('memberDetail.bind', '绑定')}
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {teams.length === 0 && direct.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Folder className="size-3.5" />
          {t('memberDetail.teamProjects.allEmptyHint', '加入团队或直绑项目后展示')}
        </p>
      )}
    </>
  );
}
