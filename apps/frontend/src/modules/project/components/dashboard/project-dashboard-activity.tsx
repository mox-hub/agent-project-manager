import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import type { TeamWorkloadMember } from './project-dashboard-data';
import { burnDownHeights } from './project-dashboard-data';

interface ProjectDashboardActivityProps {
  teamWorkload: TeamWorkloadMember[];
}

const burnDownColorClassByIndex = [
  'bg-accent-blue/40',
  'bg-accent-blue/40',
  'bg-accent-blue/60',
  'bg-accent-blue/60',
  'bg-accent-blue/70',
  'bg-accent-blue/70',
  'bg-accent-blue/80',
  'bg-content-bg-secondary',
  'bg-content-bg-secondary',
];

function getWorkloadColorClass(percentage: number) {
  if (percentage > 90) return 'bg-accent-yellow';
  if (percentage < 30) return 'bg-accent-green';
  return 'bg-accent-blue';
}

export function ProjectDashboardActivity({ teamWorkload }: ProjectDashboardActivityProps) {
  return (
    <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SectionCard
        title="Burn-down Progress"
        actions={
          <select className="rounded-sm border border-content-border bg-transparent px-2 py-1 text-[10px] font-bold text-content-text-secondary">
            <option>Current Sprint</option>
            <option>Last Sprint</option>
          </select>
        }
        className="lg:col-span-2"
        contentClassName="p-4 pt-0"
      >
        <div className="relative flex h-48 w-full flex-col-reverse gap-1">
          {burnDownHeights.map((height, index) => (
            <div
              key={`${height}-${index}`}
              className={`flex-1 rounded-t-sm transition-all ${burnDownColorClassByIndex[index]}`}
              style={{ height: `${height}%` }}
            />
          ))}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line
              x1="0"
              x2="100"
              y1="10"
              y2="90"
              stroke="var(--color-content-border)"
              strokeWidth="0.5"
              strokeDasharray="4"
            />
          </svg>
        </div>
        <div className="mt-3 flex justify-between text-[10px] font-bold text-content-text-tertiary">
          <span>DAY 1</span>
          <span>DAY 5</span>
          <span>DAY 10</span>
          <span>DAY 14</span>
        </div>
      </SectionCard>

      <SectionCard title="Team Workload" contentClassName="p-4 pt-0">
        <div className="flex flex-col gap-4">
          {teamWorkload.map((member) => (
            <div key={member.name}>
              <div className="mb-1 flex justify-between">
                <span className="text-xs font-medium text-content-text">{member.name}</span>
                <span className="text-xs text-content-text-secondary">
                  {member.percentage}% {member.status === 'high' ? '(High)' : ''}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-content-bg-secondary">
                <div
                  className={`h-full rounded-full transition-all ${getWorkloadColorClass(member.percentage)}`}
                  style={{ width: `${member.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="mt-4 w-full text-[10px] uppercase tracking-wider">
          Balance Workload
        </Button>
      </SectionCard>
    </section>
  );
}
