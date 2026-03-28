import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskBoard } from '@/modules/task/components/task-board';
import { TaskDetailDrawer } from '@/modules/task/components/task-detail-drawer';
import { useCreateTask, useMoveTask, useProjectTasks } from '@/modules/task/hooks/use-project-tasks';
import type { Task } from '@/modules/task/api/task-api';
import { Plus } from 'lucide-react';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { toast } from '@/hooks/use-toast';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: tasksData, isLoading } = useProjectTasks(projectId, { pageSize: 500 });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const taskStats = (tasksData?.data ?? []).reduce(
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
      <PageShell className="p-6" aiPage={CORE_AI_PAGE_IDS.projectBoard}>
        <div className="text-sm text-muted-foreground">Project not found.</div>
      </PageShell>
    );
  }

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.projectBoard}>
      <div className="mx-auto w-full max-w-[1280px]">
        <section
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-gradient-to-r from-background via-muted/50/30 to-background p-4 shadow-sm motion-enter"
          data-ai-component="project.project-board.header"
          data-ai-role="content"
        >
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">Project Board</h1>
            <p className="mt-1 text-sm text-muted-foreground">Drag to update status. Click cards for full task detail.</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateInline(true)}
            data-ai-component="project.project-board.header.new-task"
            data-ai-action="project.project-board.header.new-task.click"
            data-ai-role="submit"
          >
            <Plus size={14} />
            New Task
          </Button>
        </section>

        {showCreateInline ? (
          <section
            className="mb-4 rounded-xl border border-border bg-background p-4 motion-enter"
            data-ai-component="project.project-board.inline-create"
            data-ai-role="panel"
          >
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const title = newTaskTitle.trim();
                if (!title) return;
                await createTask.mutateAsync({ projectId, title, status: 'todo' });
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
                className="h-9 min-w-[260px] flex-1"
                data-ai-component="project.project-board.inline-create.title"
                data-ai-action="project.project-board.inline-create.title.change"
                data-ai-role="input"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateInline(false);
                  setNewTaskTitle('');
                }}
                data-ai-component="project.project-board.inline-create.cancel"
                data-ai-action="project.project-board.inline-create.cancel.click"
                data-ai-role="jump"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTask.isPending || !newTaskTitle.trim()}
                data-ai-component="project.project-board.inline-create.submit"
                data-ai-action="project.project-board.inline-create.submit.click"
                data-ai-role="submit"
              >
                {createTask.isPending ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </section>
        ) : null}

        <ProjectDetailNav projectId={projectId} />

        <section
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground"
          data-ai-component="project.project-board.context-bar"
          data-ai-role="filter"
        >
          <span className="rounded-full bg-background px-3 py-1">Total: {taskStats.total}</span>
          <span className="rounded-full bg-background px-3 py-1">Todo: {taskStats.todo}</span>
          <span className="rounded-full bg-background px-3 py-1">In Progress: {taskStats.inProgress}</span>
          <span className="rounded-full bg-background px-3 py-1">In Review: {taskStats.inReview}</span>
          <span className="rounded-full bg-background px-3 py-1">Done: {taskStats.done}</span>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div
            className="min-w-0"
            data-ai-component="project.project-board.primary-content"
            data-ai-role="content"
          >
            <TaskBoard
              projectId={projectId}
              tasks={tasksData?.data ?? []}
              loading={isLoading}
              onTaskClick={(task: Task) => setSelectedTaskId(task.id)}
              onTaskMove={(taskId, status) => {
                moveTask.mutate({ taskId, status });
              }}
              columns={[
                { id: 'todo', title: 'To Do', status: 'todo' },
                { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
                { id: 'in_review', title: 'In Review', status: 'in_review' },
                { id: 'done', title: 'Done', status: 'done' },
              ]}
            />
          </div>

          <div data-ai-component="project.project-board.side-assist" data-ai-role="panel">
            {selectedTaskId ? (
              <TaskDetailDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                选择一个任务后将在此处查看详情。
              </div>
            )}
          </div>
        </section>

      </div>
    </PageShell>
  );
}
