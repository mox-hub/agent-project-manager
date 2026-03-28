import { useMemo } from 'react';
import { KanbanBoard, type KanbanColumn, type KanbanItem } from '@/components/kanban-board';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/modules/project/api/project-api';
import { Calendar, Users } from 'lucide-react';

export interface ProjectBoardProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onProjectMove?: (projectId: string, newStatus: string) => void;
}

const columnConfig: Record<string, { title: string; color: string }> = {
  active: { title: 'Active', color: 'bg-emerald-500' },
  archived: { title: 'Archived', color: 'bg-muted-foreground' },
};

export function ProjectBoard({
  projects,
  onProjectClick,
  onProjectMove,
}: ProjectBoardProps) {
  // Transform projects to KanbanItem format
  const kanbanItems: KanbanItem[] = useMemo(() => {
    return projects.map((project) => ({
      id: project.id,
      columnId: project.status || 'active',
      name: project.name,
      description: project.description,
      type: project.type,
      visibility: project.visibility,
      healthScore: project.healthScore,
      memberCount: project.members?.length || 0,
      createdAt: project.createdAt,
    }));
  }, [projects]);

  // Define columns based on project statuses
  const kanbanColumns: KanbanColumn[] = useMemo(() => {
    return Object.entries(columnConfig).map(([id, config]) => ({
      id,
      title: config.title,
      color: config.color,
    }));
  }, []);

  const handleItemMove = (itemId: string, newColumnId: string) => {
    if (onProjectMove) {
      onProjectMove(itemId, newColumnId);
    }
  };

  const handleItemClick = (item: KanbanItem) => {
    const project = projects.find((p) => p.id === item.id);
    if (project && onProjectClick) {
      onProjectClick(project);
    }
  };

  // Render project card content
  const renderProjectCard = (item: KanbanItem) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="line-clamp-1 text-sm font-medium text-foreground">
            {item.name as string}
          </h4>
          {item.healthScore !== undefined && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                (item.healthScore as number) >= 80
                    ? 'bg-accent-green-light text-accent-green'
                  : (item.healthScore as number) >= 60
                  ? 'bg-accent-yellow-light text-accent-yellow'
                  : 'bg-accent-red-light text-accent-red'
              }`}
            >
              {(item.healthScore as number)}%
            </span>
          )}
        </div>
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.description as string}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {item.memberCount as number}
          </span>
          {item.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(item.createdAt as string).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {item.type as string}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {item.visibility as string}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full">
      <KanbanBoard
        columns={kanbanColumns}
        items={kanbanItems}
        onItemMove={handleItemMove}
        onItemClick={handleItemClick}
        renderItem={renderProjectCard}
        className="h-full min-h-[500px]"
      />
    </div>
  );
}
