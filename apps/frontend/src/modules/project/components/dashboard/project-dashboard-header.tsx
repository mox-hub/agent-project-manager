import { Button } from '@/components/ui/button';
import { Calendar, Edit3, Flag, Plus, Share2 } from 'lucide-react';

interface ProjectDashboardHeaderProps {
  projectName: string;
  projectType?: string | null;
}

export function ProjectDashboardHeader({ projectName, projectType }: ProjectDashboardHeaderProps) {
  return (
    <section className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h2 className="mb-0 text-2xl font-extrabold tracking-tight text-content-text">{projectName}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <span className="rounded-sm bg-accent-blue/20 px-2 py-0.5 text-[11px] font-semibold text-accent-blue">
              {projectType || 'Project'}
            </span>
            <span className="rounded-sm bg-accent-purple/20 px-2 py-0.5 text-[11px] font-semibold text-accent-purple">
              Migration
            </span>
          </div>

          <div className="h-4 w-px bg-content-border" />

          <div className="flex items-center gap-1 text-accent-red">
            <Flag size={14} />
            <span className="text-xs font-bold">High Priority</span>
          </div>

          <div className="h-4 w-px bg-content-border" />

          <div className="flex items-center gap-1 text-content-text-secondary">
            <Calendar size={14} />
            <span className="text-xs font-medium">Oct 2023 - Jun 2024</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" size="sm">
          <Edit3 size={14} />
          Edit Project
        </Button>
        <Button variant="secondary" size="sm" className="text-accent-blue">
          <Share2 size={14} />
          Share
        </Button>
        <Button size="sm">
          <Plus size={14} />
          New Task
        </Button>
      </div>
    </section>
  );
}
