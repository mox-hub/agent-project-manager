import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttentionRail } from '@/components/ui/attention-rail';
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
        <div className="text-sm text-content-text-secondary">Project not found.</div>
      </PageShell>
    );
  }

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.projectBoard}>
      <div className="mx-auto w-full max-w-[1280px]">
        <section
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-content-border bg-gradient-to-r from-content-bg via-content-bg-secondary/30 to-content-bg p-4 shadow-sm motion-enter"
          data-ai-component="project.project-board.header"
          data-ai-role="content"
        >
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-content-text">Project Board</h1>
            <p className="mt-1 text-sm text-content-text-secondary">Drag to update status. Click cards for full task detail.</p>
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
            className="mb-4 rounded-xl border border-content-border bg-content-bg p-4 motion-enter"
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
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-content-border bg-content-bg-secondary p-3 text-xs text-content-text-secondary"
          data-ai-component="project.project-board.context-bar"
          data-ai-role="filter"
        >
          <span className="rounded-full bg-content-bg px-3 py-1">Total: {taskStats.total}</span>
          <span className="rounded-full bg-content-bg px-3 py-1">Todo: {taskStats.todo}</span>
          <span className="rounded-full bg-content-bg px-3 py-1">In Progress: {taskStats.inProgress}</span>
          <span className="rounded-full bg-content-bg px-3 py-1">In Review: {taskStats.inReview}</span>
          <span className="rounded-full bg-content-bg px-3 py-1">Done: {taskStats.done}</span>
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
              <div className="rounded-xl border border-dashed border-content-border bg-content-bg-secondary p-4 text-sm text-content-text-secondary">
                选择一个任务后将在此处查看详情。
              </div>
            )}
          </div>
        </section>

        <section className="mt-4">
          <AttentionRail
            aiPrefix="project.project-board"
            items={[
              {
                id: 'dashboard',
                title: '查看项目总览',
                description: '切换到项目仪表盘查看健康度和 AI 风险',
                to: `/app/projects/${projectId}/dashboard`,
              },
              {
                id: 'settings',
                title: '前往项目设置',
                description: '管理项目元数据、集成与配置',
                to: `/app/projects/${projectId}/settings`,
              },
            ]}
          />
        </section>
      </div>
    </PageShell>
  );
}
