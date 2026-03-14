import { cn } from '@/lib/utils';
import type { DashboardTab } from './project-dashboard-data';

interface ProjectDashboardTabsProps {
  tabs: DashboardTab[];
  activeTab: DashboardTab['id'];
  onTabChange: (tab: DashboardTab['id']) => void;
}

export function ProjectDashboardTabs({ tabs, activeTab, onTabChange }: ProjectDashboardTabsProps) {
  return (
    <nav className="mb-8 flex gap-8 border-b border-content-border pb-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'border-b-2 border-transparent bg-transparent py-3 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'border-accent-blue text-accent-blue'
              : 'text-content-text-secondary hover:text-content-text',
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
