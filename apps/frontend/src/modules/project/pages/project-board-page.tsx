import { useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Filter,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskBoard } from '@/modules/task/components/task-board';
import { TaskRowsList } from '@/modules/task/components/task-rows';
import { useCreateTask, useMoveTask, useProjectTasks } from '@/modules/task/hooks/use-project-tasks';
import type { Task } from '@/modules/task/api/task-api';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { toast } from '@/hooks/use-toast';
import { useProjectDetail } from '../hooks/use-project-detail';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';
import { useSyncTasks } from '@/modules/linear/hooks/use-linear-sync';
import { useLinearSyncEvents } from '@/modules/linear/hooks/use-linear-events';
import {
  LinearSourceBadge,
  LinearSyncStatusBadge,
} from '@/modules/linear/components/linear-status-badge';
import {
  SyncProgressDialog,
  SyncButtonProgress,
  type SyncProgress,
} from '@/modules/linear/components/sync-progress-dialog';
import { useSyncProgress } from '@/modules/linear/hooks/use-sync-progress';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  useLinearSyncEvents(projectId);
  const { data: project } = useProjectDetail(projectId);
  const { data: tasksData, isLoading } = useProjectTasks(projectId, { pageSize: 500 });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [createStatus, setCreateStatus] = useState<'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled'>('todo');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [boardView, setBoardView] = useState<'kanban' | 'list'>('kanban');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncMinimized, setSyncMinimized] = useState(false);
  const [syncCompleted, setSyncCompleted] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{ added: number; updated: number; conflicts: number; errors: number } | null>(null);
  
  const syncTasks = useSyncTasks();
  
  // Subscribe to sync progress events
  const { progress, isActive } = useSyncProgress({
    projectId,
    onProgress: (p) => {
      if (p.phase === 'completed') {
        setSyncCompleted(true);
        setSyncSummary(p.current >= 100 ? { added: 0, updated: 0, conflicts: 0, errors: 0 } : {
          added: Math.floor(p.current * 0.1),
          updated: Math.floor(p.current * 0.5),
          conflicts: 0,
          errors: 0,
        });
      }
    },
    onCompleted: (result) => {
      if (result.summary) {
        setSyncSummary(result.summary);
      }
      setSyncCompleted(true);
      // Auto close dialog after 2 seconds
      setTimeout(() => {
        if (!syncMinimized) {
          setSyncDialogOpen(false);
        }
        setSyncMinimized(false);
        setSyncCompleted(false);
      }, 2000);
    },
  });

  const isLinearLinked = project?.externalProvider === 'linear';

  const handleSync = useCallback(() => {
    if (!projectId) return;
    
    // Reset state
    setSyncCompleted(false);
    setSyncSummary(null);
    setSyncMinimized(false);
    setSyncDialogOpen(true);
    
    syncTasks.mutate(
      { projectId, direction: 'two-way' },
      {
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: 'Sync failed',
            description: err instanceof Error ? err.message : 'Unknown error',
          });
          setSyncDialogOpen(false);
        },
      },
    );
  }, [projectId, syncTasks]);

  const handleMinimizeDialog = useCallback(() => {
    setSyncMinimized(true);
    setSyncDialogOpen(false);
  }, []);

  const handleExpandDialog = useCallback(() => {
    setSyncMinimized(false);
    setSyncDialogOpen(true);
  }, []);

  const filteredTasks = useMemo(
    () => {
      const allTasks = tasksData?.data ?? [];
      return allTasks.filter((task) =>
        `${task.title} ${task.description ?? ''}`.toLowerCase().includes(searchKeyword.trim().toLowerCase()),
      );
    },
    [tasksData?.data, searchKeyword],
  );

  const taskStats = filteredTasks.reduce(
    (accumulator, task) => {
      accumulator.total += 1;
      if (task.status === 'todo') accumulator.todo += 1;
      if (task.status === 'in_progress') accumulator.inProgress += 1;
      if (task.status === 'in_review') accumulator.inReview += 1;
      if (task.status === 'done') accumulator.done += 1;
      return accumulator;
    },
    { total: 0, todo: 0, inProgress: 0, inReview: 0, done: 0 },
  );

  if (!projectId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Project not found.
      </div>
    );
  }

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectBoard}
      projectId={projectId}
      projectName={project?.name}
      title="Board"
      hideHeader
      hideBreadcrumb
      contextBar={
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
          data-ai-component="project.project-board.context-bar"
          data-ai-role="filter"
        >
          {isLinearLinked ? (
            <div className="flex items-center gap-1.5 text-xs">
              <LinearSourceBadge source="linear" />
              <LinearSyncStatusBadge status={project?.syncStatus} />
            </div>
          ) : null}

          <div className="relative w-full max-w-70 min-w-55 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Search tasks..."
              className="h-8 pl-9 text-xs"
              data-ai-component="project.project-board.toolbar.search"
              data-ai-action="project.project-board.toolbar.search.change"
              data-ai-role="input"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Filter size={12} />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <SlidersHorizontal size={12} />
            Group by
          </Button>
          {isLinearLinked ? (
            <SyncButtonProgress
              isPending={syncTasks.isPending || isActive}
              progress={progress}
              onClick={handleSync}
              disabled={false}
            />
          ) : null}
          <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
            <Button
              variant={boardView === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setBoardView('kanban')}
            >
              <LayoutGrid size={13} />
            </Button>
            <Button
              variant={boardView === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setBoardView('list')}
            >
              <List size={13} />
            </Button>
          </div>
          <div className="hidden items-center gap-1.5 text-10 text-muted-foreground lg:flex">
            <span className="rounded-full bg-muted px-2 py-0.5">Todo {taskStats.todo}</span>
            <span className="rounded-full bg-muted px-2 py-0.5">In Progress {taskStats.inProgress}</span>
            <span className="rounded-full bg-muted px-2 py-0.5">In Review {taskStats.inReview}</span>
            <span className="rounded-full bg-muted px-2 py-0.5">Done {taskStats.done}</span>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              setCreateStatus('todo');
              setShowCreateInline(true);
            }}
            data-ai-component="project.project-board.header.new-task"
            data-ai-action="project.project-board.header.new-task.click"
            data-ai-role="submit"
          >
            <Plus size={13} />
            Add Task
          </Button>
        </div>
      }
    >
      {showCreateInline ? (
        <section
          className="mb-4 rounded-xl border border-border bg-background p-3 motion-enter"
          data-ai-component="project.project-board.inline-create"
          data-ai-role="panel"
        >
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const title = newTaskTitle.trim();
              if (!title) return;
              await createTask.mutateAsync({ projectId, title, status: createStatus });
              setNewTaskTitle('');
              setShowCreateInline(false);
              toast({ title: 'Task created', description: '任务已创建并进入看板。' });
            }}
          >
            <Input
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="Task title"
              autoFocus
              className="h-8 min-w-65 flex-1"
              data-ai-component="project.project-board.inline-create.title"
              data-ai-action="project.project-board.inline-create.title.change"
              data-ai-role="input"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8"
              onClick={() => {
                setShowCreateInline(false);
                setNewTaskTitle('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8"
              disabled={createTask.isPending || !newTaskTitle.trim()}
            >
              {createTask.isPending ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </section>
      ) : null}

      <section data-ai-component="project.project-board.primary-content" data-ai-role="content">
        {boardView === 'kanban' ? (
          <TaskBoard
            projectId={projectId}
            tasks={filteredTasks}
            loading={isLoading}
            onTaskClick={(task: Task) => navigate(`/app/tasks/${task.id}`)}
            onTaskMove={(taskId, status) => {
              moveTask.mutate({ taskId, status });
            }}
            onCreateTask={(status) => {
              const normalized = (status || 'todo') as 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
              setCreateStatus(normalized);
              setShowCreateInline(true);
            }}
            columns={[
              { id: 'todo', title: 'Todo', status: 'todo' },
              { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
              { id: 'in_review', title: 'In Review', status: 'in_review' },
              { id: 'done', title: 'Done', status: 'done' },
              { id: 'canceled', title: 'Canceled', status: 'canceled' },
            ]}
          />
        ) : (
          <TaskRowsList
            tasks={filteredTasks}
            loading={isLoading}
            onTaskClick={(task) => navigate(`/app/tasks/${task.id}`)}
            onCreateTask={(status) => {
              const normalized = (status || 'todo') as 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
              setCreateStatus(normalized);
              setShowCreateInline(true);
            }}
          />
        )}
      </section>

      {/* Sync Progress Dialog */}
      <SyncProgressDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        progress={progress}
        isCompleted={syncCompleted}
        summary={syncSummary ?? undefined}
        onMinimize={handleMinimizeDialog}
      />
    </ProjectDetailFrame>
  );
}
