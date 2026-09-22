import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PROJECT_DETAIL_BASE_SEGMENT,
  PROJECT_DETAIL_TABS,
} from '@/shared/layout/project-detail-tabs';

interface ProjectDetailNavProps {
  projectId: string;
  className?: string;
}

export function ProjectDetailNav({ projectId, className }: ProjectDetailNavProps) {
  const { t } = useTranslation();

  // 页签单一数据源：shared/layout/project-detail-tabs（与 shell-layout 分段控件共用）
  const tabs = PROJECT_DETAIL_TABS.map((tab) => ({
    id: tab.segment || PROJECT_DETAIL_BASE_SEGMENT,
    label: t(tab.labelKey),
    path: tab.segment,
    icon: tab.icon,
  }));
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
