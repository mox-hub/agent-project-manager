/**
 * TasksPage - 全局任务管理页面
 * 使用真实 API 获取任务数据
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Clock, Circle, Loader, AlertCircle, CheckCircle2, XCircle,
  ListTodo, Bot as BotIcon, LayoutGrid, List,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { StatsCard, STATS_THEMES } from '@/components/ui/stats-card';
import { FilterBar, createSearchFilter, createSelectFilter, createViewModeFilter, createGroupByFilter } from '@/components/ui/filter-bar';
import { useAllTasks } from '../hooks/use-project-tasks';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import type { Task } from '../api/task-api';
import { cn } from '@/lib/utils';
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
import { useTranslation } from 'react-i18next';
import { AiAssignDialog } from '../components/ai-assign-dialog';
import { TaskRowsList } from '../components/task-rows';

type ViewMode = 'list' | 'board';
type GroupBy = 'status' | 'severity' | 'project';
type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: 'Todo', icon: Circle, color: 'text-slate-500' },
  in_progress: { label: 'In Progress', icon: Loader, color: 'text-blue-500' },
  in_review: { label: 'In Review', icon: AlertCircle, color: 'text-amber-500' },
  done: { label: 'Done', icon: CheckCircle2, color: 'text-emerald-500' },
  canceled: { label: 'Canceled', icon: XCircle, color: 'text-slate-400' },
};

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; dotColor: string }> = {
  critical: { label: 'Critical', color: 'text-red-600', dotColor: 'bg-red-500' },
  high: { label: 'High', color: 'text-orange-600', dotColor: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-amber-600', dotColor: 'bg-amber-500' },
  low: { label: 'Low', color: 'text-slate-600', dotColor: 'bg-slate-400' },
};

export function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [dispatchTask, setDispatchTask] = useState<{ task: Task; projectId: string } | null>(null);

  // 跨项目查询所有 task + bug, 同时包含 inbox 项目下的未绑定任务
  const { data: tasksData, isLoading, refetch } = useAllTasks({ pageSize: 1000 });

  // 获取项目列表用于过滤
  const { data: projectsResponse } = useProjectList();
  const projects = projectsResponse?.items ?? [];

  // Task + Bug 一起展示 (任务页 = 统一任务视图)
  const allTasks = tasksData?.data ?? [];

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase()) &&
          !task.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      // Use severity from task if available, otherwise derive from priority
      const taskSeverity = task.severity || (task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low') as Severity;
      if (severityFilter !== 'all' && taskSeverity !== severityFilter) {
        return false;
      }
      if (projectFilter !== 'all' && task.projectId !== projectFilter) {
        return false;
      }
      return true;
    });
  }, [allTasks, search, statusFilter, severityFilter, projectFilter]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};

    filteredTasks.forEach((task) => {
      let key: string;
      switch (groupBy) {
        case 'status':
          key = task.status;
          break;
        case 'severity':
          key = task.severity || 'low';
          break;
        case 'project':
          key = task.projectId;
          break;
        default:
          key = 'all';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return groups;
  }, [filteredTasks, groupBy]);

  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return 'Inbox';
    return projects.find((p) => p.id === projectId)?.name || projectId;
  };

  const handleTaskClick = (task: Task) => {
    navigate(`/app/tasks/${task.id}`);
  };

  return (
    <PageShell aiPage="task.tasks-list" className="overflow-hidden">
      {/* Header */}
      <PageHeader
        aiId="task.tasks-list"
        title={t("task.title")}
        description={`${filteredTasks.length} ${t("task.descriptionAcrossProjects") || 'tasks across all projects'}`}
        icon={ListTodo}
        iconColor="text-accent-blue"
        actions={
          <Button
            onClick={() => setShowCreateDialog(true)}
            data-ai-component="task.tasks-list.new-button"
            data-ai-action="task.tasks-list.new-button.click"
            data-ai-role="submit"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("task.create")}
          </Button>
        }
      />

      {/* Unified Create Dialog */}
      <UnifiedCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultType="task"
        onSuccess={(type, id) => {
          console.log(`Created ${type} with id: ${id}`);
          refetch();
        }}
      />

      {/* AI Dispatch Dialog */}
      {dispatchTask && (
        <AiAssignDialog
          open={!!dispatchTask}
          onOpenChange={(open) => { if (!open) setDispatchTask(null); }}
          taskId={dispatchTask.task.id}
          projectId={dispatchTask.projectId}
          taskTitle={dispatchTask.task.title}
          onSuccess={() => { setDispatchTask(null); refetch(); }}
        />
      )}

      {/* Stats Cards */}
      <div className="border-b border-border bg-background px-6 py-4">
        <StatsCard
          items={[
            { key: 'total', value: (tasksData?.meta?.total ?? filteredTasks.length), label: t("task.stats.total"), icon: ListTodo, ...STATS_THEMES.blue },
            { key: 'todo', value: allTasks.filter(task => task.status === 'todo').length, label: t("task.stats.todo"), icon: Circle, ...STATS_THEMES.default },
            { key: 'inProgress', value: allTasks.filter(task => task.status === 'in_progress').length, label: t("task.stats.inProgress"), icon: Loader, ...STATS_THEMES.yellow },
            { key: 'inReview', value: allTasks.filter(task => task.status === 'in_review').length, label: t("task.stats.inReview") , icon: AlertCircle, ...STATS_THEMES.purple },
            { key: 'done', value: allTasks.filter(task => task.status === 'done').length, label: t("task.stats.done"), icon: CheckCircle2, ...STATS_THEMES.green },
            { key: 'canceled', value: allTasks.filter(task => task.status === 'canceled').length, label: t("task.stats.canceled") , icon: XCircle, ...STATS_THEMES.gray },
          ]}
          columns={6}
          className="grid grid-cols-6 gap-3"
        />
      </div>

      {/* Filters & Controls */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10" data-ai-component="task.tasks-list.filter-bar" data-ai-role="filter">
        <div className="px-6 py-3 overflow-x-auto">
          <FilterBar
            filters={[
              createSearchFilter('search', search, setSearch, t("task.filter.searchPlaceholder") ),
              createSelectFilter('status', statusFilter, (v) => setStatusFilter(v as TaskStatus | 'all'), [
                { value: 'all', label: t("task.status.all") },
                { value: 'todo', label: t("task.status.todo") },
                { value: 'in_progress', label: t("task.status.in_progress") },
                { value: 'in_review', label: t("task.status.in_review") },
                { value: 'done', label: t("task.status.done") },
                { value: 'canceled', label: t("task.status.canceled") },
              ]),
              createSelectFilter('project', projectFilter, setProjectFilter as any, [
                { value: 'all', label: t("task.filter.allProjects") },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]),
              createViewModeFilter('viewMode', viewMode, setViewMode as any),
              createGroupByFilter('groupBy', groupBy, setGroupBy as any, [
                { value: 'status', label: t("task.groupBy.status")  },
                { value: 'severity', label: t("task.groupBy.severity")  },
                { value: 'project', label: t("task.groupBy.project")  },
              ], viewMode === 'board'),
            ]}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="w-full">
          {viewMode === 'list' ? (
            <TaskRowsList
              tasks={filteredTasks}
              loading={isLoading}
              onTaskClick={handleTaskClick}
              secondaryLabel={(task) => getProjectName(task.projectId)}
            />
          ) : (
            <TasksBoardView
              groupedTasks={groupedTasks}
              groupBy={groupBy}
              projects={projects}
              onTaskClick={handleTaskClick}
              onDispatchTask={(task, projectId) => setDispatchTask({ task, projectId })}
            />
          )}
        </div>
      </div>

      </PageShell>
  );
}

// Board View Component
function TasksBoardView({
  groupedTasks,
  groupBy,
  projects,
  onTaskClick,
  onDispatchTask,
}: {
  groupedTasks: Record<string, Task[]>;
  groupBy: GroupBy;
  projects: { id: string; name: string }[];
  onTaskClick: (task: Task) => void;
  onDispatchTask?: (task: Task, projectId: string) => void;
}) {
  const { t } = useTranslation();
  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return 'Inbox';
    return projects.find((p) => p.id === projectId)?.name || projectId;
  };

  const getGroupLabel = (key: string) => {
    switch (groupBy) {
      case 'status':
        return STATUS_CONFIG[key as TaskStatus]?.label || key;
      case 'severity':
        return SEVERITY_CONFIG[key as Severity]?.label || key;
      case 'project':
        return getProjectName(key);
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
            </div>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => {
              const severity = (task.severity || 'low') as Severity;
              const severityConfig = SEVERITY_CONFIG[severity];

              return (
                <div
                  key={task.id}
                  className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-ring/50 hover:shadow-sm transition-all group"
                  onClick={() => onTaskClick(task)}
                >
                  {/* Tags */}
                  {task.taskTags && task.taskTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {task.taskTags.slice(0, 2).map((taskTag) => (
                        <span
                          key={taskTag.tag.id}
                          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
                          style={{
                            backgroundColor: taskTag.tag.color ? `${taskTag.tag.color}22` : 'hsl(var(--muted))',
                            color: taskTag.tag.color || 'hsl(var(--foreground))',
                          }}
                        >
                          {taskTag.tag.name}
                        </span>
                      ))}
                      {task.taskTags.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{task.taskTags.length - 2}
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
                        {task.shortId || task.id.slice(0, 8)}
                      </span>
                      <div className={cn('w-1.5 h-1.5 rounded-full', severityConfig.dotColor)} />
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
                    <div className="flex items-center gap-1">
                      {task.projectId && onDispatchTask && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent-purple/20 text-accent-purple"
                          onClick={(e) => { e.stopPropagation(); onDispatchTask(task, task.projectId!); }}
                          title={t('task.dispatchToAi')}
                        >
                          <BotIcon size={12} />
                        </button>
                      )}
                      {task.assignee && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold"
                          style={{ backgroundColor: 'hsl(var(--primary))' }}
                        >
                          {task.assignee.displayName?.charAt(0) || task.assignee.username?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
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
