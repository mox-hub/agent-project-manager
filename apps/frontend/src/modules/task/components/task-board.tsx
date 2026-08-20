/**
 * TaskBoard - 任务看板（BoardView 适配层）
 * @description 基于 shared/components/board-view 的通用看板，按任务状态分组列。
 * 2026-08-19 重构：原生 HTML5 拖拽迁移到 @dnd-kit，对外 props 签名保持不变。
 */
import { useMemo } from 'react';
import type { Task } from '@/modules/task/api/task-api';
import { useTranslation } from 'react-i18next';
import { BoardView, type BoardColumnDef } from '@/shared/components/board-view/board-view';
import {
  STATUS_VISUAL,
  TASK_STATUS_KEYS,
  taskCardModel,
  type TaskStatusKey,
} from './board-presets';

export interface TaskBoardColumn {
  id: string;
  title: string;
  status: string;
  wipLimit?: number;
}

export interface TaskBoardProps {
  projectId: string;
  tasks: Task[];
  columns: TaskBoardColumn[];
  loading?: boolean;
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatus: string) => void;
  onCreateTask?: (_status: string) => void;
}

export function TaskBoard({
  tasks,
  columns,
  loading,
  onTaskClick,
  onTaskMove,
  onCreateTask,
}: TaskBoardProps) {
  const { t } = useTranslation();

  const boardColumns = useMemo<BoardColumnDef[]>(
    () =>
      columns.map((column) => {
        const visual =
          STATUS_VISUAL[column.status as TaskStatusKey] ?? STATUS_VISUAL[TASK_STATUS_KEYS[0]];
        return {
          id: column.status,
          title: column.title,
          icon: visual.icon,
          color: visual.color,
          wipLimit: column.wipLimit,
        };
      }),
    [columns],
  );

  return (
    <BoardView<Task>
      className="h-full"
      columns={boardColumns}
      items={tasks}
      groupBy={(task) => task.status || 'todo'}
      card={taskCardModel}
      loading={loading}
      onItemMove={(task, toColumnId) => {
        if (task.status !== toColumnId) {
          onTaskMove?.(task.id, toColumnId);
        }
      }}
      onItemClick={(task) => onTaskClick?.(task)}
      onItemAdd={(columnId) => onCreateTask?.(columnId)}
    />
  );
}
