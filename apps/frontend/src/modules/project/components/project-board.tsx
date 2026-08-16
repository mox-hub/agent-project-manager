import { useState, useCallback, useMemo } from 'react';
import {
  KanbanProvider,
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  type KanbanItem,
  type KanbanColumn,
} from '@/components/kibo-ui/kanban/index';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import type { Project, ProjectStatus } from '@/modules/project/api/project-api';
import { Calendar, Users } from 'lucide-react';

export interface ProjectBoardProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onProjectMove?: (projectId: string, newStatus: string) => void;
}

type ProjectKanbanItem = KanbanItem & {
  name: string;
  description?: string | null;
  type: string;
  visibility: string;
  healthScore?: number;
  memberCount: number;
  createdAt: string;
  owner?: {
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
  };
  priority?: string;
  progress?: number;
};

type ProjectKanbanColumn = KanbanColumn & {
  color: string;
};

const columnConfig: Record<ProjectStatus, { title: string; color: string }> = {
  active: { title: 'Active', color: '#10B981' },
  archived: { title: 'Archived', color: '#6B7280' },
};

const priorityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-400',
  medium: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-400',
};

const healthScoreColors = (score?: number) => {
  if (!score) return 'bg-muted';
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

export function ProjectBoard({
  projects,
  onProjectClick,
  onProjectMove,
}: ProjectBoardProps) {
  const [boardData, setBoardData] = useState<ProjectKanbanItem[]>(() =>
    projects.map((project) => ({
      id: project.id,
      name: project.name,
      column: project.status || 'active',
      description: project.description,
      type: project.type,
      visibility: project.visibility,
      healthScore: project.healthScore,
      memberCount: project.members?.length || 0,
      createdAt: project.createdAt,
      owner: project.owner,
      priority: project.priority,
      progress: project.progress,
    }))
  );

  const columns: ProjectKanbanColumn[] = useMemo(() => {
    return Object.entries(columnConfig).map(([id, config]) => ({
      id,
      name: config.title,
      color: config.color,
    }));
  }, []);

  const handleDataChange = useCallback(
    (newData: KanbanItem[]) => {
      const prevData = boardData;
      setBoardData(newData as ProjectKanbanItem[]);

      const changedItem = newData.find(
        (item, idx) => item.column !== prevData[idx]?.column
      );
      if (changedItem && onProjectMove) {
        onProjectMove(changedItem.id, changedItem.column);
      }
    },
    [boardData, onProjectMove]
  );

  const handleCardClick = useCallback(
    (item: KanbanItem) => {
      const project = projects.find((p) => p.id === item.id);
      if (project && onProjectClick) {
        onProjectClick(project);
      }
    },
    [projects, onProjectClick]
  );

  return (
    <KanbanProvider
      columns={columns}
      data={boardData}
      onDataChange={handleDataChange}
      className="h-full"
    >
      {(column) => (
        <KanbanBoard id={column.id} key={column.id}>
          <KanbanHeader>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: column.color }}
              />
              <span className="font-medium">{column.name}</span>
              <span className="text-muted-foreground">
                ({boardData.filter((item) => item.column === column.id).length})
              </span>
            </div>
          </KanbanHeader>
          <KanbanCards id={column.id}>
            {(item) => {
              const projectItem = item as ProjectKanbanItem;
              return (
                <KanbanCard
                  id={projectItem.id}
                  name={projectItem.name}
                  column={projectItem.column}
                >
                  <div className="space-y-2">
                    {/* Title and Priority */}
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        className="line-clamp-1 cursor-pointer text-sm font-medium text-foreground hover:underline"
                        onClick={() => handleCardClick(projectItem)}
                      >
                        {projectItem.name}
                      </h4>
                      {projectItem.priority && (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            priorityColors[projectItem.priority] || priorityColors.medium
                          }`}
                        >
                          {projectItem.priority}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {projectItem.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {projectItem.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    {projectItem.progress !== undefined && projectItem.progress > 0 && (
                      <div className="space-y-1">
                        <Progress value={projectItem.progress} className="h-1.5" />
                        <span className="text-[10px] text-muted-foreground">
                          {projectItem.progress}% complete
                        </span>
                      </div>
                    )}

                    {/* Health Score and Meta */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {projectItem.memberCount}
                        </span>
                        {projectItem.healthScore !== undefined && (
                          <span className="flex items-center gap-1">
                            <div
                              className={`h-2 w-2 rounded-full ${healthScoreColors(
                                projectItem.healthScore
                              )}`}
                            />
                            {projectItem.healthScore}%
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(projectItem.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Badges and Owner */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {projectItem.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {projectItem.visibility}
                        </Badge>
                      </div>
                      {projectItem.owner && (
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={projectItem.owner.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(projectItem.owner.displayName || projectItem.owner.username || 'U')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                </KanbanCard>
              );
            }}
          </KanbanCards>
        </KanbanBoard>
      )}
    </KanbanProvider>
  );
}
