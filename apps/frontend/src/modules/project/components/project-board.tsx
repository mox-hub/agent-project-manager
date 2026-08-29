/**
 * ProjectBoard - 项目看板（BoardView 适配层）
 * @description 按项目工作流状态（backlog/planned/in_progress/completed/canceled）五列分组，
 * 与任务看板范式对齐；拖拽改 workflowStatus（归档走右键菜单「状态」）。
 * 2026-08-19 重构：由 kibo-ui Kanban 迁移到 shared BoardView，
 * 修复了 props 变化不同步、按索引 diff 找变更项两个既有缺陷。
 */
import { useMemo } from 'react';
import { Calendar, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Project } from '@/modules/project/api/project-api';
import {
  PRIORITY_VISUALS,
  PROJECT_WORKFLOW_VISUALS,
  TONE_LIGHT_CLASS,
  TONE_TEXT_CLASS,
} from '@/shared/status/status-visuals';
import {
  BoardView,
  type BoardAccentColor,
  type BoardCardModel,
  type BoardColumnDef,
} from '@/shared/components/board-view/board-view';

export interface ProjectBoardProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  /** 拖拽换列：newWorkflowStatus 为 workflowStatus 值 */
  onProjectMove?: (projectId: string, newWorkflowStatus: string) => void;
}

/** workflowStatus → 看板列 accent（与 status-visuals tone 对齐） */
const WORKFLOW_COLUMN_COLOR: Record<string, BoardAccentColor> = {
  backlog: 'muted',
  planned: 'yellow',
  in_progress: 'blue',
  completed: 'green',
  canceled: 'muted',
};

const WORKFLOW_ORDER = ['backlog', 'planned', 'in_progress', 'completed', 'canceled'];

const healthScoreClass = (score?: number) => {
  if (!score) return 'bg-muted-foreground/40';
  if (score >= 80) return 'bg-accent-green';
  if (score >= 60) return 'bg-accent-yellow';
  return 'bg-accent-red';
};

function useProjectCardModel(): BoardCardModel<Project> {
  const { t } = useTranslation();
  return {
    title: (project) => {
      const priorityVisual = project.priority
        ? (PRIORITY_VISUALS[project.priority] ?? PRIORITY_VISUALS.medium)
        : null;
      return (
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-1 hover:underline">{project.name}</span>
          {priorityVisual ? (
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-10 font-medium',
                TONE_LIGHT_CLASS[priorityVisual.tone],
              )}
            >
              {t(priorityVisual.labelKey)}
            </span>
          ) : null}
        </span>
      );
    },
    row1: (project) => (
      <>
        <Badge variant="outline" className="text-10">{t(`project.type.${project.type}`)}</Badge>
        <Badge variant="secondary" className="text-10">{t(`project.visibility.${project.visibility}`)}</Badge>
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
            <span className="text-10 text-muted-foreground">{project.progress}%</span>
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
                {project.healthScore}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {project.targetDate ? (
              <span
                className={
                  project.workflowStatus !== 'completed' &&
                  new Date(project.targetDate).getTime() < Date.now()
                    ? 'text-accent-red'
                    : undefined
                }
              >
                {new Date(project.targetDate).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
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
}

export function ProjectBoard({ projects, onProjectClick, onProjectMove }: ProjectBoardProps) {
  const { t } = useTranslation();
  const card = useProjectCardModel();
  const columns = useMemo<BoardColumnDef[]>(
    () =>
      WORKFLOW_ORDER.map((value) => {
        const visual = PROJECT_WORKFLOW_VISUALS[value];
        return {
          id: value,
          title: (
            <span className="flex items-center gap-1.5">
              <visual.icon className={cn('size-3.5', TONE_TEXT_CLASS[visual.tone])} />
              {t(visual.labelKey)}
            </span>
          ),
          color: WORKFLOW_COLUMN_COLOR[value],
        };
      }),
    [t],
  );

  return (
    <BoardView<Project>
      className="h-full"
      columns={columns}
      items={projects}
      groupBy={(project) => project.workflowStatus || 'backlog'}
      card={card}
      onItemMove={(project, toColumnId) => {
        if ((project.workflowStatus || 'backlog') !== toColumnId) {
          onProjectMove?.(project.id, toColumnId);
        }
      }}
      onItemClick={(project) => onProjectClick?.(project)}
    />
  );
}
