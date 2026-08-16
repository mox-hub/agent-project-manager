/**
 * TaskListCard - 任务列表卡片组件
 * 根据 Figma 精确设计实现 (2026-08-11)
 * 
 * Figma 设计规格:
 * - 容器: 圆角14px, 边框 rgba(0,0,0,0.1)
 * - 无表头，直接显示任务列表，无分割线
 * - 任务行: flex布局, padding 16px 16px 6px 6px, gap 8px, 高度37px
 * - 左侧: 状态图标(16x16) → 优先级圆点(22x22) → ID(11px) → 标题(14px) → 子任务药丸
 * - 右侧: 项目 → 里程碑 → 标签 → 截止日期(红色逾期) → 头像(22x22蓝色)
 */

import { useState } from 'react';
import { Circle, Zap, Eye, CheckCircle, Calendar } from 'lucide-react';
import { AiAssignDialog } from './ai-assign-dialog';
import { cn } from '@/lib/utils';
import type { Task } from '../api/task-api';
import { TaskMilestoneBadge } from './task-milestone-badge';
import { SubTaskBadge } from './sub-task-badge';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';

interface StatusConfig {
  icon: typeof Circle;
  color: string;
}

const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  todo: { icon: Circle, color: '#717282' },
  in_progress: { icon: Zap, color: '#3b82f6' },
  in_review: { icon: Eye, color: '#f59e0b' },
  done: { icon: CheckCircle, color: '#10b981' },
  canceled: { icon: Circle, color: '#717282' },
};

export interface TaskListCardProps {
  tasks: Task[];
  projects: { id: string; name: string }[];
  onTaskClick?: (task: Task) => void;
  onDispatchTask?: (task: Task, projectId: string) => void;
  loading?: boolean;
}

export function TaskListCard({
  tasks,
  projects,
  onTaskClick,
  onDispatchTask,
  loading,
}: TaskListCardProps) {
  const [dispatchTask, setDispatchTask] = useState<{ task: Task; projectId: string } | null>(null);

  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return 'Inbox';
    return projects.find((p) => p.id === projectId)?.name || projectId;
  };

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#10b981';
      default: return '#10b981';
    }
  };

  if (loading) {
    return (
      <div className="border border-[rgba(0,0,0,0.1)] dark:border-white/10 rounded-[14px] overflow-hidden">
        <div className="flex items-center justify-center py-16 text-[#717282]/60 text-sm bg-white dark:bg-card">
          <span>Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="border border-[rgba(0,0,0,0.1)] dark:border-white/10 rounded-[14px] overflow-hidden">
        <div className="text-center py-12 text-[#717282]/60 text-sm bg-white dark:bg-card">
          No tasks found
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Card Container - Figma: 圆角14px, 边框 rgba(0,0,0,0.1), 无分割线 */}
      <div className="border border-[rgba(0,0,0,0.1)] dark:border-white/10 rounded-[14px] overflow-hidden bg-white dark:bg-card">
        <div className="flex flex-col">
          {tasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.status as TaskStatus] || STATUS_CONFIG.todo;
            const StatusIcon = statusConfig.icon;
            const priorityColor = getPriorityColor(task.priority || task.severity);
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

            return (
              <div
                key={task.id}
                className="flex items-center gap-2 px-4 py-[6px] hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-white/[0.02] cursor-pointer transition-colors group"
                onClick={() => onTaskClick?.(task)}
              >
                {/* Status Icon - 系统图标 16x16 */}
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <StatusIcon 
                    className="w-4 h-4" 
                    style={{ color: statusConfig.color }} 
                    strokeWidth={2}
                  />
                </div>

                {/* Priority Dot - 22x22, 圆角8px, 优先级颜色 */}
                <div 
                  className="w-[22px] h-[22px] rounded-[8px] shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: `${priorityColor}22` }}
                >
                  <div 
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: priorityColor }}
                  />
                </div>

                {/* Task ID - JetBrains Mono 11px */}
                <span className="font-mono text-[11px] text-[#717282]/60 shrink-0 w-16 truncate">
                  {task.shortId || task.id.slice(0, 8)}
                </span>

                {/* Task Title - Inter Medium 14px */}
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-[14px] font-medium truncate text-[#0a0a0a] dark:text-white group-hover:opacity-80 transition-opacity">
                    {task.title}
                  </p>
                  
                  {/* SubTask Badge - 紧贴标题后面 */}
                  <SubTaskBadge 
                    todoItems={task.todoItems} 
                    subTaskCount={task._count?.subTasks}
                  />
                </div>

                {/* Project Name - Inter 11px */}
                <span className="text-[11px] text-[#717282] shrink-0 ml-auto">
                  {getProjectName(task.projectId)}
                </span>

                {/* Milestone */}
                <TaskMilestoneBadge milestone={task.milestone} />

                {/* Tags - 圆角药丸形 */}
                {task.taskTags && task.taskTags.length > 0 ? (
                  <span 
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                    style={{
                      backgroundColor: `${task.taskTags[0].tag.color || '#717282'}22`,
                      color: task.taskTags[0].tag.color || '#717282',
                    }}
                  >
                    {task.taskTags[0].tag.name}
                  </span>
                ) : (
                  <span className="w-16 shrink-0" />
                )}

                {/* Due Date - 逾期红色 */}
                <div 
                  className={cn(
                    "flex items-center gap-1 text-[11px] shrink-0",
                    isOverdue ? 'text-[#fc2c36]' : 'text-[#717282]'
                  )}
                >
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {task.dueDate 
                      ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'
                    }
                  </span>
                </div>

                {/* Avatar - 22x22 蓝色圆形 */}
                <div className="shrink-0">
                  {task.assignee ? (
                    <div
                      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[9px] font-semibold"
                      style={{ backgroundColor: '#2568eb' }}
                    >
                      {task.assignee.displayName?.charAt(0) || task.assignee.username?.charAt(0) || '?'}
                    </div>
                  ) : (
                    <div className="w-[22px] h-[22px] rounded-full bg-[rgba(0,0,0,0.05)] dark:bg-white/10 flex items-center justify-center">
                      <span className="text-[9px] text-[#717282]/40">—</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Dispatch Dialog */}
      {dispatchTask && onDispatchTask && (
        <AiAssignDialog
          open={!!dispatchTask}
          onOpenChange={(open) => { if (!open) setDispatchTask(null); }}
          taskId={dispatchTask.task.id}
          projectId={dispatchTask.projectId}
          taskTitle={dispatchTask.task.title}
          onSuccess={() => { setDispatchTask(null); }}
        />
      )}
    </>
  );
}
