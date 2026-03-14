import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { RefreshCw } from 'lucide-react';

export function ProjectDashboardInsights() {
  return (
    <section className="mb-8 grid grid-cols-1 gap-3 lg:grid-cols-2">
      <SectionCard title="Project Health" description="Overall health score based on multiple factors" contentClassName="p-4 pt-0">
        <div className="flex items-start justify-between">
          <div className="mt-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-content-text-tertiary">Status</p>
            <p className="mb-0 text-sm font-bold text-accent-green">On Track</p>
          </div>
          <div className="text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-green text-2xl font-extrabold text-white">
              92
            </div>
            <div className="mt-2">
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-wider text-content-text-tertiary">
                Change (30d)
              </p>
              <p className="mb-0 text-sm font-bold text-accent-green">+2.4 pts</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="AI Insights"
        description="Project context for AI assistant"
        actions={
          <Button variant="outline" size="sm">
            <RefreshCw size={12} />
            Refresh
          </Button>
        }
        contentClassName="grid grid-cols-2 gap-3 p-4 pt-0"
      >
        <div>
          <p className="mb-1 text-xs font-bold text-content-text">Team Size</p>
          <p className="mb-0 text-sm text-content-text-secondary">8 Members</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold text-content-text">Lifecycle Phase</p>
          <p className="mb-0 text-sm text-content-text-secondary">Active Development</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold text-content-text">Complexity</p>
          <Badge variant="warning">High</Badge>
        </div>
      </SectionCard>
    </section>
  );
}
