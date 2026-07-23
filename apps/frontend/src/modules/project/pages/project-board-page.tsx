import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TaskBoard } from '@/modules/task/components/task-board';
import { useCreateTask, useMoveTask, useProjectTasks } from '@/modules/task/hooks/use-project-tasks';
import type { Task } from '@/modules/task/api/task-api';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { toast } from '@/hooks/use-toast';
import { useProjectDetail } from '../hooks/use-project-detail';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProjectDetail(projectId);
  const { data: tasksData, isLoading } = useProjectTasks(projectId, { pageSize: 500 });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [createStatus, setCreateStatus] = useState<'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled'>('todo');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [boardView, setBoardView] = useState<'kanban' | 'list'>('kanban');

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
          <div className="relative w-full max-w-[280px] min-w-[220px] flex-1">
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
          <div className="hidden items-center gap-1.5 text-[10px] text-muted-foreground lg:flex">
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
              className="h-8 min-w-[260px] flex-1"
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
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <Table className="w-full text-left text-xs">
              <TableHeader className="border-b border-border bg-muted/30">
                <TableRow>
                  <TableHead className="px-3 py-2 font-medium text-muted-foreground">Task</TableHead>
                  <TableHead className="px-3 py-2 font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="px-3 py-2 font-medium text-muted-foreground">Priority</TableHead>
                  <TableHead className="px-3 py-2 font-medium text-muted-foreground">Assignee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-muted/20"
                    onClick={() => navigate(`/app/tasks/${task.id}`)}
                  >
                    <TableCell className="px-3 py-2 text-foreground">{task.title}</TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">{task.status.replace('_', ' ')}</TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground capitalize">{task.priority}</TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">{task.assignee?.displayName || 'Unassigned'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </ProjectDetailFrame>
  );
}
