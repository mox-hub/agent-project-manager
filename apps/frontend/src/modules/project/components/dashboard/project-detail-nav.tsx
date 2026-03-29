import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BarChart3, KanbanSquare, Milestone, Settings, Users } from 'lucide-react';

interface ProjectDetailNavProps {
  projectId: string;
  className?: string;
}

const tabs = [
  { id: 'overview', label: 'Overview', path: '', icon: BarChart3 },
  { id: 'board', label: 'Board', path: 'board', icon: KanbanSquare },
  { id: 'milestones', label: 'Milestones', path: 'milestones', icon: Milestone },
  { id: 'team', label: 'Team', path: 'team', icon: Users },
  { id: 'settings', label: 'Settings', path: 'settings', icon: Settings },
];

export function ProjectDetailNav({ projectId, className }: ProjectDetailNavProps) {
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
