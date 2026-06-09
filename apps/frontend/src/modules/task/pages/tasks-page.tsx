/**
 * TasksPage - 全局任务管理页面
 * 参考: refers/APM/UPDATE_V23.md, UPDATE_V23.2.md
 * 按照 Figma 设计实现
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Clock, Circle, Loader, AlertCircle, CheckCircle2, XCircle,
  User, CheckSquare, ListTodo,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard, STATS_THEMES } from '@/components/ui/stats-card';
import { FilterBar, createSearchFilter, createSelectFilter, createViewModeFilter, createGroupByFilter } from '@/components/ui/filter-bar';
import { MOCK_TASKS, PROJECTS, type Task } from '../data/mock-data';
import { cn } from '@/lib/utils';
import { TaskFormDialog, type TaskFormData } from '@/components/ui/task-form-dialog';

type ViewMode = 'list' | 'board';
type GroupBy = 'status' | 'priority' | 'project' | 'assignee';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: 'Todo', icon: Circle, color: 'text-slate-500' },
  in_progress: { label: 'In Progress', icon: Loader, color: 'text-blue-500' },
  in_review: { label: 'In Review', icon: AlertCircle, color: 'text-amber-500' },
  done: { label: 'Done', icon: CheckCircle2, color: 'text-emerald-500' },
  canceled: { label: 'Canceled', icon: XCircle, color: 'text-slate-400' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dotColor: string }> = {
  low: { label: 'Low', color: 'text-slate-600', dotColor: 'bg-slate-400' },
  medium: { label: 'Medium', color: 'text-blue-600', dotColor: 'bg-blue-500' },
  high: { label: 'High', color: 'text-orange-600', dotColor: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-600', dotColor: 'bg-red-500' },
};

export function TasksPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [search, setSearch] = useState('');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<(Task & { projectId: string }) | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return MOCK_TASKS.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase()) &&
          !task.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      if (projectFilter !== 'all' && task.projectId !== projectFilter) {
        return false;
      }
      return true;
    });
  }, [search, statusFilter, priorityFilter, projectFilter]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};

    filteredTasks.forEach((task) => {
      let key: string;
      switch (groupBy) {
        case 'status':
          key = task.status;
          break;
        case 'priority':
          key = task.priority;
          break;
        case 'project':
          key = task.projectId;
          break;
        case 'assignee':
          key = task.assignee?.name || 'Unassigned';
          break;
        default:
          key = 'all';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return groups;
  }, [filteredTasks, groupBy]);

  const getProjectName = (projectId: string) => {
    return PROJECTS.find((p) => p.id === projectId)?.name || projectId;
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task as Task & { projectId: string });
    setDialogMode('edit');
    setShowTaskDialog(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setDialogMode('create');
    setShowTaskDialog(true);
  };

  return (
    <PageShell aiPage="task.tasks-list" className="overflow-hidden">
      {/* Header - 使用 PageHeader 组件 */}
      <PageHeader
        aiId="task.tasks-list"
        title="All Tasks"
        description={`${filteredTasks.length} tasks across all projects`}
        icon={ListTodo}
        iconColor="text-accent-blue"
        actions={
          <Button onClick={handleCreateTask} data-ai-component="task.tasks-list.new-button" data-ai-action="task.tasks-list.new-button.click" data-ai-role="submit">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        }
      />

      {/* Task Creation/Edit Dialog */}
      <TaskFormDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        mode={dialogMode}
        taskId={selectedTask?.id}
        initialData={selectedTask ? {
          title: selectedTask.title,
          description: selectedTask.description || '',
          priority: selectedTask.priority,
          status: selectedTask.status,
          projectId: selectedTask.projectId,
          labels: selectedTask.labels.map(l => l.id),
        } : undefined}
      />

      {/* Stats Cards */}
      <div className="border-b border-border bg-background px-6 py-4">
        <StatsCard
          items={[
            { key: 'total', value: MOCK_TASKS.length, label: '总任务数', icon: ListTodo, ...STATS_THEMES.blue },
            { key: 'todo', value: MOCK_TASKS.filter(t => t.status === 'todo').length, label: '待处理', icon: Circle, ...STATS_THEMES.default },
            { key: 'inProgress', value: MOCK_TASKS.filter(t => t.status === 'in_progress').length, label: '进行中', icon: Loader, ...STATS_THEMES.yellow },
            { key: 'done', value: MOCK_TASKS.filter(t => t.status === 'done').length, label: '已完成', icon: CheckCircle2, ...STATS_THEMES.green },
          ]}
          columns={4}
          className="grid grid-cols-4 gap-3"
        />
      </div>

      {/* Filters & Controls */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10" data-ai-component="task.tasks-list.filter-bar" data-ai-role="filter">
        <div className="px-6 py-3 overflow-x-auto">
          <FilterBar
            filters={[
              createSearchFilter('search', search, setSearch, '搜索任务...'),
              createSelectFilter('status', statusFilter, (v) => setStatusFilter(v as TaskStatus | 'all'), [
                { value: 'all', label: '全部状态' },
                { value: 'todo', label: '待处理' },
                { value: 'in_progress', label: '进行中' },
                { value: 'in_review', label: '审核中' },
                { value: 'done', label: '已完成' },
                { value: 'canceled', label: '已取消' },
              ]),
              createSelectFilter('priority', priorityFilter, (v) => setPriorityFilter(v as Priority | 'all'), [
                { value: 'all', label: '全部优先级' },
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' },
                { value: 'urgent', label: '紧急' },
              ]),
              createSelectFilter('project', projectFilter, setProjectFilter, [
                { value: 'all', label: '全部项目' },
                ...PROJECTS.map((p) => ({ value: p.id, label: p.name })),
              ]),
              createViewModeFilter('viewMode', viewMode, setViewMode),
              createGroupByFilter('groupBy', groupBy, setGroupBy, [
                { value: 'status', label: '按状态' },
                { value: 'priority', label: '按优先级' },
                { value: 'project', label: '按项目' },
                { value: 'assignee', label: '按负责人' },
              ], viewMode === 'board'),
            ]}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="w-full">
          {viewMode === 'list' ? (
            <ListView tasks={filteredTasks} getProjectName={getProjectName} onTaskClick={handleTaskClick} />
          ) : (
            <BoardView
              groupedTasks={groupedTasks}
              groupBy={groupBy}
              getProjectName={getProjectName}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}

// List View Component
function ListView({
  tasks,
  getProjectName,
  onTaskClick,
}: {
  tasks: Task[];
  getProjectName: (id: string) => string;
  onTaskClick: (task: Task) => void;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[auto_100px_1fr_140px_100px_120px_100px_40px] gap-4 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
        <div className="w-5"></div>
        <div>ID</div>
        <div>Task</div>
        <div>Project</div>
        <div>Priority</div>
        <div>Labels</div>
        <div>Due Date</div>
        <div></div>
      </div>

      {/* Table Body */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No tasks found
        </div>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map((task) => {
            const StatusIcon = STATUS_CONFIG[task.status as TaskStatus].icon;
            const priorityConfig = PRIORITY_CONFIG[task.priority as Priority];

            return (
              <div
                key={task.id}
                className="grid grid-cols-[auto_100px_1fr_140px_100px_120px_100px_40px] gap-4 px-4 py-2.5 hover:bg-accent/30 cursor-pointer transition-colors group items-center"
                onClick={() => onTaskClick(task)}
              >
                {/* Status Icon */}
                <div className="w-5 flex items-center justify-center">
                  <StatusIcon className={cn('h-3.5 w-3.5', STATUS_CONFIG[task.status as TaskStatus].color)} />
                </div>

                {/* Identifier */}
                <span className="text-xs font-mono text-muted-foreground">
                  {task.id}
                </span>

                {/* Title */}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {task.title}
                  </p>
                </div>

                {/* Project */}
                <Badge variant="outline" className="justify-center text-xs">
                  {getProjectName(task.projectId)}
                </Badge>

                {/* Priority */}
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', priorityConfig.dotColor)} />
                  <span className={cn('text-xs', priorityConfig.color)}>
                    {priorityConfig.label}
                  </span>
                </div>

                {/* Labels */}
                <div className="flex gap-1 overflow-hidden">
                  {task.labels.length > 0 ? (
                    <>
                      {task.labels.slice(0, 1).map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-sm font-medium truncate"
                          style={{
                            backgroundColor: label.color + '22',
                            color: label.color,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {task.labels.length > 1 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{task.labels.length - 1}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Due Date */}
                {task.dueDate ? (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-muted-foreground'
                  )}>
                    <Clock className="h-3 w-3" />
                    {new Date(task.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}

                {/* Assignee */}
                <div className="flex justify-center">
                  {task.assignee ? (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold"
                      style={{
                        backgroundColor: task.assignee.color || '#666',
                      }}
                    >
                      {task.assignee.name?.charAt(0) || '?'}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Board View Component
function BoardView({
  groupedTasks,
  groupBy,
  getProjectName,
  onTaskClick,
}: {
  groupedTasks: Record<string, Task[]>;
  groupBy: GroupBy;
  getProjectName: (id: string) => string;
  onTaskClick: (task: Task) => void;
}) {
  const getGroupLabel = (key: string) => {
    switch (groupBy) {
      case 'status':
        return STATUS_CONFIG[key as TaskStatus]?.label || key;
      case 'priority':
        return PRIORITY_CONFIG[key as Priority]?.label || key;
      case 'project':
        return getProjectName(key);
      case 'assignee':
        return key;
      default:
        return key;
    }
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {Object.entries(groupedTasks).map(([groupKey, tasks]) => (
        <div key={groupKey} className="flex-shrink-0 w-80">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{getGroupLabel(groupKey)}</h3>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {tasks.length}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => {
              const priorityConfig = PRIORITY_CONFIG[task.priority as Priority];

              return (
                <div
                  key={task.id}
                  className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-ring/50 hover:shadow-sm transition-all group"
                  onClick={() => onTaskClick(task)}
                >
                  {/* Labels */}
                  {task.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {task.labels.slice(0, 2).map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
                          style={{
                            backgroundColor: label.color + '22',
                            color: label.color,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {task.labels.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{task.labels.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <p className="text-xs font-medium text-foreground line-clamp-2 mb-2">
                    {task.title}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {task.id}
                      </span>
                      <div className={cn('w-1.5 h-1.5 rounded-full', priorityConfig.dotColor)} />
                      {task.dueDate && (
                        <div
                          className={cn(
                            'flex items-center gap-0.5 text-[10px]',
                            new Date(task.dueDate) < new Date()
                              ? 'text-red-500'
                              : 'text-muted-foreground'
                          )}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(task.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                    {task.assignee && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold"
                        style={{
                          backgroundColor: task.assignee.color || '#666',
                        }}
                      >
                        {task.assignee.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
