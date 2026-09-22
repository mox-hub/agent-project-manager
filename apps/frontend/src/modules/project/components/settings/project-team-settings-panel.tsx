import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonList } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProjectDashboardSummary } from '../../hooks/use-project-dashboard-summary';
import { ProjectTeamBindings } from '../project-team-bindings';

/**
 * 项目设置 · 团队分页面板（CAP-P-01 五期 IA 降级）：
 * 只读成员概览 + 项目-团队绑定；完整操作面（同步/角色等）保留在
 * /projects/:id/team 完整页，入口按钮跳转。
 */
function workloadColor(load: number) {
  if (load >= 70) return 'text-accent-red';
  if (load >= 40) return 'text-accent-yellow';
  return 'text-accent-green';
}

function workloadIndicatorClass(load: number) {
  if (load >= 70) return '[&_[data-slot=progress-indicator]]:bg-accent-red';
  if (load >= 40) return '[&_[data-slot=progress-indicator]]:bg-accent-yellow';
  return '[&_[data-slot=progress-indicator]]:bg-accent-green';
}

export function ProjectTeamSettingsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: summary, isLoading } = useProjectDashboardSummary(projectId);
  const members = summary?.teamWorkload ?? [];

  return (
    <div className="space-y-5">
      <SectionCard
        title={t('projectSettings.team.bindingsTitle')}
        description={t('projectSettings.team.bindingsDesc')}
      >
        <ProjectTeamBindings projectId={projectId} />
      </SectionCard>

      <SectionCard
        title={t('projectSettings.team.membersTitle')}
        description={t('projectSettings.team.membersDesc', { count: members.length })}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate(`/app/projects/${projectId}/team`)}
          >
            <ExternalLink size={14} />
            {t('projectSettings.team.openFull')}
          </Button>
        }
      >
        {isLoading ? (
          <SkeletonList count={3} avatar />
        ) : members.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Users size={16} className="shrink-0" />
            {t('projectSettings.team.empty')}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div key={member.memberId} className="flex items-center gap-3 py-2.5">
                <Avatar size="sm">
                  {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                  <AvatarFallback>{member.memberName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">{member.memberName}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('projectSettings.team.taskCount', { count: member.taskCount })}
                  </div>
                </div>
                <div className="flex w-32 shrink-0 items-center gap-2">
                  <Progress
                    value={member.percentage}
                    className={cn('h-1.5 flex-1', workloadIndicatorClass(member.percentage))}
                  />
                  <span
                    className={cn(
                      'w-10 text-right font-mono text-10 font-medium',
                      workloadColor(member.percentage),
                    )}
                  >
                    {member.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
