/**
 * ProjectTeamBindings - 项目「所属团队」绑定管理（项目详情 Team tab 顶部区块）
 *
 * TeamProject 是多对多裸联表：已绑定团队来自 project.teams（findOne 拼装），
 * 绑定/解绑走 POST/DELETE /teams/:teamId/projects，成功后由 hooks 统一失效缓存。
 * 团队 chip 点击跳团队详情，hover 出解绑按钮；添加入口为 Popover 搜索选择。
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/hooks/use-toast';
import {
  useBindTeamProject,
  useTeams,
  useUnbindTeamProject,
} from '@/modules/team-member/hooks';
import { useProjectDetail } from '../hooks/use-project-detail';

export function ProjectTeamBindings({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProjectDetail(projectId);
  const { data: teamsData } = useTeams({ status: 'active', limit: 100 });
  const bindTeam = useBindTeamProject();
  const unbindTeam = useUnbindTeamProject();
  const [addOpen, setAddOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  const boundTeams = useMemo(() => project?.teams ?? [], [project?.teams]);
  const boundIds = useMemo(() => new Set(boundTeams.map((team) => team.id)), [boundTeams]);

  const candidates = useMemo(() => {
    const all = teamsData?.teams ?? [];
    const kw = keyword.trim().toLowerCase();
    return all
      .filter((team) => !boundIds.has(team.id))
      .filter((team) => !kw || team.name.toLowerCase().includes(kw));
  }, [teamsData?.teams, boundIds, keyword]);

  const handleBind = (teamId: string, teamName: string) => {
    bindTeam.mutate(
      { teamId, projectId },
      {
        onSuccess: () => toast({ title: t('project.team.bindings.boundToast', { name: teamName }) }),
        onError: (err) =>
          toast({
            variant: 'destructive',
            title: t('project.team.bindings.failed'),
            description: err instanceof Error ? err.message : undefined,
          }),
      },
    );
  };

  const handleUnbind = (teamId: string, teamName: string) => {
    unbindTeam.mutate(
      { teamId, projectId },
      {
        onSuccess: () => toast({ title: t('project.team.bindings.unboundToast', { name: teamName }) }),
        onError: (err) =>
          toast({
            variant: 'destructive',
            title: t('project.team.bindings.failed'),
            description: err instanceof Error ? err.message : undefined,
          }),
      },
    );
  };

  return (
    <SectionCard
      title={t('project.team.bindings.title')}
      description={t('project.team.bindings.desc')}
      actions={
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="size-3.5" />
                {t('project.team.bindings.add')}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-64 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
              <Input
                autoFocus
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t('project.team.bindings.search')}
                className="h-7 pl-8 text-xs"
              />
            </div>
            <div className="mt-1.5 max-h-56 overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  {t('project.team.bindings.noneLeft')}
                </p>
              ) : (
                candidates.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    disabled={bindTeam.isPending}
                    onClick={() => handleBind(team.id, team.name)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 disabled:opacity-50"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: team.color || '#5E6AD2' }}
                    />
                    <span className="truncate">{team.name}</span>
                    <span className="ml-auto shrink-0 text-10 text-muted-foreground">
                      {t('project.sidebar.memberCount', { count: team.memberCount ?? 0 })}
                    </span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      }
    >
      {isLoading ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">{t('common.loading')}</p>
      ) : boundTeams.length === 0 ? (
        <EmptyState
          title={t('project.team.bindings.emptyTitle')}
          description={t('project.team.bindings.emptyDesc')}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1">
          {boundTeams.map((team) => (
            <span
              key={team.id}
              className="group inline-flex h-6 items-center gap-1.5 rounded-full border border-border pl-2 pr-1 text-xs transition-colors hover:bg-muted/60"
            >
              <button
                type="button"
                onClick={() => navigate(`/app/teams/${team.id}`)}
                className="flex min-w-0 items-center gap-1.5"
                title={team.name}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: team.color || '#5E6AD2' }}
                />
                <span className="max-w-40 truncate">{team.name}</span>
              </button>
              <button
                type="button"
                disabled={unbindTeam.isPending}
                onClick={() => handleUnbind(team.id, team.name)}
                className="flex size-4 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 disabled:opacity-50"
                title={t('project.team.bindings.unbind')}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
