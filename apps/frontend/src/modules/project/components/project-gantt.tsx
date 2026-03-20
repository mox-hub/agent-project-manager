import { useMemo } from 'react';
import { GanttChart, type GanttChartItem, type GanttDateRange } from '@/components/gantt-chart';
import type { Project } from '../api/project-api';

interface ProjectGanttProps {
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

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function mapProjectRange(project: Project): { startDate: string; endDate: string } | null {
  const start = parseDate(project.startDate);
  const target = parseDate(project.targetDate);
  if (!start && !target) return null;

  const safeStart = start ?? target!;
  const safeEnd = target ?? start!;
  const left = safeStart <= safeEnd ? safeStart : safeEnd;
  const right = safeStart <= safeEnd ? safeEnd : safeStart;
  return {
    startDate: toDateOnly(left),
    endDate: toDateOnly(right),
  };
}

export function ProjectGantt({
  projects,
  onProjectClick,
  onDateRangeChange,
}: ProjectGanttProps) {
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const items = useMemo<GanttChartItem[]>(() => {
    return projects.reduce<GanttChartItem[]>((acc, project) => {
      const range = mapProjectRange(project);
      if (!range) return acc;
      acc.push({
          id: project.id,
          title: project.name,
          startDate: range.startDate,
          endDate: range.endDate,
          status: project.workflowStatus,
          priority: project.priority,
          meta: project.owner?.displayName || project.owner?.username || undefined,
      });
      return acc;
    }, []);
  }, [projects]);

  const handleClick = (projectId: string) => {
    const project = projectMap.get(projectId);
    if (project) onProjectClick?.(project);
  };

  const handleDateChange = (projectId: string, range: GanttDateRange) => {
    return onDateRangeChange?.(projectId, {
      startDate: range.startDate,
      targetDate: range.endDate,
    });
  };

  return (
    <GanttChart
      items={items}
      onItemClick={handleClick}
      onItemDateChange={handleDateChange}
      leftColumnTitle="Project"
      emptyMessage="No projects with valid dates to display"
    />
  );
}
