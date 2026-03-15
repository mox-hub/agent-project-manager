import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskBoard } from '@/modules/task/components/task-board';
import { TaskDetailDrawer } from '@/modules/task/components/task-detail-drawer';
import { useCreateTask, useMoveTask, useProjectTasks } from '@/modules/task/hooks/use-project-tasks';
import type { Task } from '@/modules/task/api/task-api';
import { Plus } from 'lucide-react';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: tasksData, isLoading } = useProjectTasks(projectId, { pageSize: 500 });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (!projectId) {
    return <div className="p-6 text-sm text-content-text-secondary">Project not found.</div>;
  }

  return (
    <PageShell className="p-6">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-content-border bg-gradient-to-r from-content-bg via-content-bg-secondary/30 to-content-bg p-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-content-text">Project Board</h1>
            <p className="mt-1 text-sm text-content-text-secondary">Drag to update status. Click cards for full task detail.</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New Task
          </Button>
        </div>

        <ProjectDetailNav projectId={projectId} />

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

      <TaskDetailDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const title = String(new FormData(e.currentTarget).get('title') || '').trim();
              if (!title) return;
              await createTask.mutateAsync({ projectId, title, status: 'todo' });
              setShowCreate(false);
            }}
          >
            <div className="py-4">
              <input
                type="text"
                name="title"
                autoFocus
                placeholder="Task title"
                className="w-full rounded-md border border-content-border bg-content-bg px-3 py-2 text-sm text-content-text focus:outline-none"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
