import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { colors, spacing } from '@/shared/theme/tokens';
import { Button } from '@/shared/ui/button';
import { TaskBoard } from '../components/task-board';
import { TaskDetailDrawer } from '../components/task-detail-drawer';
import { TaskList } from '../components/task-list';
import { useProjectTasks, useMoveTask, useCreateTask } from '../hooks/use-project-tasks';
import type { Task } from '../api/task-api';

type ViewMode = 'board' | 'list';

export function TaskPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<string>('todo');

  const { data: tasksData, isLoading } = useProjectTasks(projectId, {
    pageSize: 100,
  });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();

  const tasks = tasksData?.data || [];

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const handleTaskMove = async (taskId: string, newStatus: string) => {
    await moveTask.mutateAsync({ taskId, status: newStatus });
  };

  const handleCreateTask = (status: string) => {
    setCreateTaskStatus(status);
    setShowCreateModal(true);
  };

  const handleQuickCreate = async (title: string) => {
    if (!projectId) return;
    await createTask.mutateAsync({
      projectId,
      title,
      status: createTaskStatus,
    });
    setShowCreateModal(false);
  };

  if (!projectId) {
    return <div>Project not found</div>;
  }

  return (
    <div style={{ padding: spacing.md, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Tasks</h1>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
            <Button
              variant={viewMode === 'board' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              style={{ borderRadius: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              style={{ borderRadius: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </Button>
          </div>

          {/* Create Task Button */}
          <Button variant="primary" size="sm" onClick={() => handleCreateTask('todo')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Task
          </Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {viewMode === 'board' ? (
          <TaskBoard
            projectId={projectId}
            tasks={tasks}
            loading={isLoading}
            onTaskClick={handleTaskClick}
            onTaskMove={handleTaskMove}
            onCreateTask={handleCreateTask}
          />
        ) : (
          <TaskList
            tasks={tasks}
            loading={isLoading}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      {/* Quick Create Modal */}
      {showCreateModal && (
        <QuickCreateModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleQuickCreate}
          isLoading={createTask.isPending}
        />
      )}
    </div>
  );
}

function QuickCreateModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (title: string) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim());
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 50,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: colors.surface,
          borderRadius: 12,
          padding: spacing.lg,
          width: 400,
          maxWidth: '90vw',
          zIndex: 51,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: spacing.md }}>Create New Task</h3>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              fontSize: 14,
              marginBottom: spacing.md,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!title.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
