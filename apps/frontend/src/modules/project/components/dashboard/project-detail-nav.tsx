import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BarChart3, BookMarked, ListTodo, Milestone, Settings } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ProjectDetailNavProps {
  projectId: string;
  className?: string;
}

export function ProjectDetailNav({ projectId, className }: ProjectDetailNavProps) {
  const { t } = useTranslation();

  // CAP-P-01 五期 IA 裁决（2026-09-22）：playbook/team 摘出主导航，降级为
  // 项目设置页分页（路由 /playbook /team 保留兼容，intake 管道总览卡为生命周期主入口）
  const tabs = [
    { id: 'overview', label: t('project.detail.overview'), path: '', icon: BarChart3 },
    { id: 'tasks', label: t('project.detail.tasks'), path: 'issues', icon: ListTodo },
    { id: 'milestones', label: t('project.detail.milestones'), path: 'milestones', icon: Milestone },
    { id: 'profile', label: t('project.detail.profile'), path: 'profile', icon: BookMarked },
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
                'inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium no-underline transition-colors',
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
