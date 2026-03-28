import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ProjectDetailNavProps {
  projectId: string;
}

const tabs = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'board', label: 'Board', path: 'board' },
  { id: 'milestones', label: 'Milestones', path: 'milestones' },
  { id: 'team', label: 'Team', path: 'team' },
  { id: 'settings', label: 'Settings', path: 'settings' },
];

export function ProjectDetailNav({ projectId }: ProjectDetailNavProps) {
  return (
    <nav className="mb-6 flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const to = tab.path ? `/app/projects/${projectId}/${tab.path}` : `/app/projects/${projectId}`;
        return (
          <NavLink
            key={tab.id}
            to={to}
            end={!tab.path}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-colors',
                isActive
                  ? 'bg-muted/50 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
