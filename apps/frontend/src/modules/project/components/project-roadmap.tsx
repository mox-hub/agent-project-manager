import { useMemo } from 'react';
import { Roadmap, type RoadmapFeature, type RoadmapStatus } from '@/components/kibo-ui/roadmap';
import type { Project, ProjectWorkflowStatus } from '../api/project-api';

interface ProjectRoadmapProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onDateRangeChange?: (projectId: string, range: { startDate: string; targetDate: string }) => Promise<void> | void;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getStatusInfo(status?: ProjectWorkflowStatus): { id: string; name: string; color: string } {
  switch (status) {
    case 'backlog':
      return { id: 'backlog', name: 'Backlog', color: '#6B7280' };
    case 'planned':
      return { id: 'planned', name: 'Planned', color: '#3B82F6' };
    case 'in_progress':
      return { id: 'in_progress', name: 'In Progress', color: '#F59E0B' };
    case 'completed':
      return { id: 'completed', name: 'Completed', color: '#10B981' };
    case 'canceled':
      return { id: 'canceled', name: 'Canceled', color: '#EF4444' };
    default:
      return { id: 'active', name: 'Active', color: '#F59E0B' };
  }
}

function getProjectTypeName(type?: string): string {
  switch (type) {
    case 'personal': return 'Personal';
    case 'team': return 'Team';
    case 'experiment': return 'Experiment';
    case 'enterprise': return 'Enterprise';
    default: return 'Team';
  }
}

function mapProjectToFeature(project: Project): RoadmapFeature | null {
  const start = parseDate(project.startDate);
  const target = parseDate(project.targetDate);
  
  // 如果项目没有日期，使用默认日期范围（当前日期前后6个月）
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);
  
  const safeStart = start ?? defaultStart;
  const safeEnd = target ?? defaultEnd;

  const statusInfo = getStatusInfo(project.workflowStatus);

  return {
    id: project.id,
    name: project.name,
    startAt: safeStart,
    endAt: safeEnd,
    status: {
      id: statusInfo.id,
      name: statusInfo.name,
      color: statusInfo.color,
    },
    owner: project.owner ? {
      id: project.owner.id,
      name: project.owner.displayName || project.owner.username || '',
      image: project.owner.avatarUrl ?? undefined,
    } : undefined,
    group: {
      id: project.type || 'team',
      name: getProjectTypeName(project.type),
    },
  };
}

const roadmapStatuses: RoadmapStatus[] = [
  { id: 'backlog', name: 'Backlog', color: '#6B7280' },
  { id: 'planned', name: 'Planned', color: '#3B82F6' },
  { id: 'in_progress', name: 'In Progress', color: '#F59E0B' },
  { id: 'completed', name: 'Completed', color: '#10B981' },
  { id: 'canceled', name: 'Canceled', color: '#EF4444' },
];

export function ProjectRoadmap({
  projects,
  onProjectClick,
  onDateRangeChange,
}: ProjectRoadmapProps) {
  const features = useMemo<RoadmapFeature[]>(() => {
    return projects
      .map(mapProjectToFeature)
      .filter((f): f is RoadmapFeature => f !== null);
  }, [projects]);

  const handleViewFeature = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (project) {
      onProjectClick?.(project);
    }
  };

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
    if (!endAt || !onDateRangeChange) return;
    onDateRangeChange(id, {
      startDate: startAt.toISOString().slice(0, 10),
      targetDate: endAt.toISOString().slice(0, 10),
    });
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/app/projects/${id}`;
    navigator.clipboard.writeText(url);
  };

  if (features.length === 0) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-lg border bg-muted/50">
        <div className="text-center">
          <p className="text-muted-foreground">No projects to display in roadmap</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add start and target dates to your projects to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <Roadmap
      features={features}
      statuses={roadmapStatuses}
      defaultView="gantt"
      onViewFeature={handleViewFeature}
      onMoveFeature={handleMoveFeature}
      onCopyLink={handleCopyLink}
      className="h-full"
    />
  );
}
