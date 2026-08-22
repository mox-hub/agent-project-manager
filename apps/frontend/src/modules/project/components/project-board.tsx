/**
 * ProjectBoard - 项目看板（BoardView 适配层）
 * @description 按项目状态（active/archived）分列；卡片为项目信息富卡片。
 * 2026-08-19 重构：由 kibo-ui Kanban 迁移到 shared BoardView，
 * 修复了 props 变化不同步、按索引 diff 找变更项两个既有缺陷。
 */
import { useMemo } from 'react';
import { Activity, Archive, Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Project } from '@/modules/project/api/project-api';
import {
  BoardView,
  type BoardCardModel,
  type BoardColumnDef,
} from '@/shared/components/board-view/board-view';

export interface ProjectBoardProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onProjectMove?: (projectId: string, newStatus: string) => void;
}

const PRIORITY_CHIP: Record<string, string> = {
  low: 'bg-accent-blue-light text-accent-blue',
  medium: 'bg-accent-yellow-light text-accent-yellow',
  high: 'bg-accent-yellow-light text-accent-yellow',
  urgent: 'bg-accent-red-light text-accent-red',
};

const healthScoreClass = (score?: number) => {
  if (!score) return 'bg-muted-foreground/40';
  if (score >= 80) return 'bg-accent-green';
  if (score >= 60) return 'bg-accent-yellow';
  return 'bg-accent-red';
};

const projectCardModel: BoardCardModel<Project> = {
  title: (project) => (
    <span className="flex items-start justify-between gap-2">
      <span className="line-clamp-1 hover:underline">{project.name}</span>
      {project.priority ? (
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-10 font-medium',
            PRIORITY_CHIP[project.priority] ?? PRIORITY_CHIP.medium,
          )}
        >
          {project.priority}
        </span>
      ) : null}
    </span>
  ),
  row1: (project) => (
    <>
      <Badge variant="outline" className="text-10">{project.type}</Badge>
      <Badge variant="secondary" className="text-10">{project.visibility}</Badge>
    </>
  ),
  row3: (project) => (
    <div className="space-y-2">
      {project.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
      ) : null}
      {typeof project.progress === 'number' && project.progress > 0 ? (
        <div className="space-y-1">
          <Progress value={project.progress} className="h-1.5" />
          <span className="text-10 text-muted-foreground">{project.progress}% complete</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {project.members?.length ?? 0}
          </span>
          {typeof project.healthScore === 'number' && (
            <span className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-full', healthScoreClass(project.healthScore))} />
              {project.healthScore}%
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {new Date(project.createdAt).toLocaleDateString()}
        </span>
        {project.owner ? (
          <Avatar className="h-5 w-5">
            <AvatarImage src={project.owner.avatarUrl ?? undefined} />
            <AvatarFallback className="text-10">
              {(project.owner.displayName || project.owner.username || 'U').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>
    </div>
  ),
};

export function ProjectBoard({ projects, onProjectClick, onProjectMove }: ProjectBoardProps) {
  const columns = useMemo<BoardColumnDef[]>(
    () => [
      { id: 'active', title: 'Active', icon: Activity, color: 'green' },
      { id: 'archived', title: 'Archived', icon: Archive, color: 'muted' },
    ],
    [],
  );

  return (
    <BoardView<Project>
      className="h-full"
      columns={columns}
      items={projects}
      groupBy={(project) => project.status || 'active'}
      card={projectCardModel}
      onItemMove={(project, toColumnId) => {
        if ((project.status || 'active') !== toColumnId) {
          onProjectMove?.(project.id, toColumnId);
        }
      }}
      onItemClick={(project) => onProjectClick?.(project)}
    />
  );
}
