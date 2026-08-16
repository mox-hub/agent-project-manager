import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BarChart3, KanbanSquare, Milestone, Settings, Users, Briefcase } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ProjectDetailNavProps {
  projectId: string;
  className?: string;
}

export function ProjectDetailNav({ projectId, className }: ProjectDetailNavProps) {
  const { t } = useTranslation();

  const tabs = [
    { id: 'overview', label: t('project.detail.overview'), path: '', icon: BarChart3 },
    { id: 'board', label: t('project.detail.board'), path: 'board', icon: KanbanSquare },
    { id: 'milestones', label: t('project.detail.milestones'), path: 'milestones', icon: Milestone },
    { id: 'team', label: t('project.detail.team'), path: 'team', icon: Users },
    { id: 'roles', label: '执行角色', path: 'roles', icon: Briefcase },
    { id: 'settings', label: t('nav.settings'), path: 'settings', icon: Settings },
  ];
  return (
    <nav className={cn('flex flex-wrap items-center gap-0.5', className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const to = tab.path ? `/app/projects/${projectId}/${tab.path}` : `/app/projects/${projectId}`;
        return (
          <NavLink
            key={tab.id}
            to={to}
            end={!tab.path}
            className={({ isActive }) =>
              cn(
                'inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[13px] font-medium no-underline transition-colors',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )
            }
          >
            <Icon size={12} />
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
