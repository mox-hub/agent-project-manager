import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { notionColors, notionTypography, notionSpacing, notionRadii } from '@/shared/theme/notion-tokens';
import { Button } from '@/shared/ui/button';
import { TaskBoard } from '../components/task-board';
import { TaskDetailDrawer } from '../components/task-detail-drawer';
import { TaskList } from '../components/task-list';
import { useProjectTasks, useMoveTask, useCreateTask } from '../hooks/use-project-tasks';
import type { Task } from '../api/task-api';
import { LayoutGrid, List, Plus, Search, Filter } from 'lucide-react';

type ViewMode = 'board' | 'list';

export function TaskPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<string>('todo');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tasksData, isLoading } = useProjectTasks(projectId, {
    pageSize: 100,
  });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();

  const tasks = tasksData?.data || [];

  const filteredTasks = searchQuery
    ? tasks.filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks;

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
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: notionColors.text.secondary,
        }}
      >
        Project not found
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: notionColors.background.default,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${notionSpacing.lg}px ${notionSpacing['2xl']}px`,
          borderBottom: `1px solid ${notionColors.border.default}`,
          backgroundColor: notionColors.background.default,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: notionTypography.fontSize['2xl'],
            fontWeight: notionTypography.fontWeight.semibold,
            color: notionColors.text.primary,
          }}
        >
          Tasks
        </h1>
        <div style={{ display: 'flex', gap: notionSpacing.md, alignItems: 'center' }}>
          {/* Search */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: notionSpacing.md,
                color: notionColors.text.tertiary,
                pointerEvents: 'none',
              }}
            />
            <input
              type="search"
              placeholder="Search tasks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: `${notionSpacing.sm}px ${notionSpacing.md}px ${notionSpacing.sm}px ${notionSpacing['2xl'] + notionSpacing.sm}px`,
                borderRadius: notionRadii.md,
                border: `1px solid ${notionColors.border.default}`,
                backgroundColor: notionColors.background.secondary,
                color: notionColors.text.primary,
                fontSize: notionTypography.fontSize.sm,
                width: '180px',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = notionColors.accent.blue;
                e.currentTarget.style.backgroundColor = notionColors.background.default;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = notionColors.border.default;
                e.currentTarget.style.backgroundColor = notionColors.background.secondary;
              }}
            />
          </div>

          {/* Filter Button */}
          <Button
            variant="secondary"
            size="sm"
            style={{
              border: `1px solid ${notionColors.border.default}`,
              color: notionColors.text.primary,
            }}
          >
            <Filter size={14} style={{ marginRight: notionSpacing.xs }} />
            Filter
          </Button>

          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              borderRadius: notionRadii.md,
              overflow: 'hidden',
              border: `1px solid ${notionColors.border.default}`,
            }}
          >
            <button
              onClick={() => setViewMode('board')}
              style={{
                padding: `${notionSpacing.sm}px ${notionSpacing.md}px`,
                border: 'none',
                backgroundColor: viewMode === 'board' ? notionColors.accent.blueLight : 'transparent',
                color: viewMode === 'board' ? notionColors.accent.blue : notionColors.text.secondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: notionSpacing.xs,
                fontSize: notionTypography.fontSize.sm,
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={14} />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: `${notionSpacing.sm}px ${notionSpacing.md}px`,
                border: 'none',
                backgroundColor: viewMode === 'list' ? notionColors.accent.blueLight : 'transparent',
                color: viewMode === 'list' ? notionColors.accent.blue : notionColors.text.secondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: notionSpacing.xs,
                fontSize: notionTypography.fontSize.sm,
                transition: 'all 0.15s ease',
              }}
            >
              <List size={14} />
              List
            </button>
          </div>

          {/* Create Task Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleCreateTask('todo')}
            style={{
              backgroundColor: notionColors.accent.blue,
              color: '#fff',
              border: 'none',
              borderRadius: notionRadii.md,
              fontWeight: notionTypography.fontWeight.medium,
            }}
          >
            <Plus size={14} style={{ marginRight: notionSpacing.xs }} />
            New
          </Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: notionSpacing['2xl'] }}>
        {viewMode === 'board' ? (
          <TaskBoard
            projectId={projectId}
            tasks={filteredTasks}
            loading={isLoading}
            onTaskClick={handleTaskClick}
            onTaskMove={handleTaskMove}
            onCreateTask={handleCreateTask}
          />
        ) : (
          <TaskList
            tasks={filteredTasks}
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(55, 53, 47, 0.4)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: notionColors.background.default,
          borderRadius: notionRadii.xl,
          boxShadow: `0 0 0 1px ${notionColors.border.default}, 0 ${notionSpacing['2xl']}px ${notionSpacing['2xl']}px ${notionColors.shadow.lg}`,
          width: '100%',
          maxWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ padding: notionSpacing['2xl'] }}>
            <input
              type="text"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: `${notionSpacing.md}px 0`,
                border: 'none',
                backgroundColor: 'transparent',
                color: notionColors.text.primary,
                fontSize: notionTypography.fontSize.lg,
                outline: 'none',
              }}
              placeholderStyle={{
                color: notionColors.text.tertiary,
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: notionSpacing.sm,
              padding: notionSpacing.lg,
              borderTop: `1px solid ${notionColors.border.default}`,
            }}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              style={{
                border: `1px solid ${notionColors.border.default}`,
                color: notionColors.text.primary,
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!title.trim() || isLoading}
              style={{
                backgroundColor: notionColors.accent.blue,
                color: '#fff',
                border: 'none',
                opacity: title.trim() ? 1 : 0.6,
              }}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
