import { useMemo, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useProjectTasks, useCreateTask, useUpdateTask } from '../hooks/use-project-tasks';
import type { Task } from '../api/task-api';

interface StatusColumn {
  key: string;
  title: string;
}

function getStatusColumns(tasks: Task[]): StatusColumn[] {
  const uniqueStatuses = Array.from(new Set(tasks.map((t) => t.status))).filter(Boolean);

  if (uniqueStatuses.length === 0) {
    return [{ key: 'todo', title: 'Todo' }];
  }

  return uniqueStatuses
    .sort((a, b) => a.localeCompare(b))
    .map((status) => ({
      key: status,
      title: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
    }));
}

export function TaskBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
  } = useProjectDetail(projectId);
  const { data, isLoading, isError, error } = useProjectTasks(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const tasks = data?.data ?? [];

  const columns = useMemo(() => getStatusColumns(tasks), [tasks]);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!projectId || !newTitle.trim()) return;

    createTask.mutate({
      projectId,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
    });

    setNewTitle('');
    setNewDescription('');
  };

  const handleStatusChange = (taskId: string, status: string) => {
    updateTask.mutate({
      taskId,
      data: { status },
    });
  };

  if (!projectId) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#dc2626' }}>Missing project ID in URL.</p>
        <Link
          to="/app"
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            color: '#374151',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-block',
            marginTop: '12px',
          }}
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  if (projectLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading project...</p>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <h2 style={{ margin: '0 0 12px', fontSize: '20px', color: '#dc2626' }}>
          Failed to load project
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#6b7280' }}>
          The project could not be loaded. It may not exist or you may not have permission to view
          it.
        </p>
        <Link
          to="/app"
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            color: '#374151',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-block',
          }}
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <header style={{ marginBottom: '16px' }}>
          <h1 style={{ margin: '0 0 4px' }}>{project.name}</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Task board</p>
        </header>
        <div
          style={{
            padding: '24px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 12px', color: '#dc2626', fontSize: '14px' }}>
            Failed to load tasks.{' '}
            {error instanceof Error ? error.message : 'Please try again later.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px' }}>
          {project ? project.name : 'Project'}
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
          Task board
        </p>
      </header>

      <section
        style={{
          marginBottom: '16px',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Quick create a task..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
              }}
            />
            <button
              type="submit"
              disabled={!newTitle.trim() || createTask.isPending}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: !newTitle.trim()
                  ? '#9ca3af'
                  : '#2563eb',
                color: '#fff',
                cursor: !newTitle.trim() ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              Add
            </button>
          </div>
          <textarea
            placeholder="Optional description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              resize: 'vertical',
            }}
          />
        </form>
      </section>

      {isLoading ? (
        <div>Loading tasks...</div>
      ) : (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))`,
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              style={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                padding: '8px',
                minHeight: '120px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <span>{column.title}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {tasks.filter((t) => t.status === column.key).length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks
                  .filter((task) => task.status === column.key)
                  .map((task) => (
                    <article
                      key={task.id}
                      style={{
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#fff',
                        padding: '8px',
                        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                        fontSize: '13px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '4px',
                          gap: '8px',
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          {task.title}
                        </h3>
                      </div>
                      {task.description && (
                        <p
                          style={{
                            margin: '0 0 4px',
                            fontSize: '12px',
                            color: '#6b7280',
                          }}
                        >
                          {task.description}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '4px',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          {task.priority && (
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '999px',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '11px',
                              }}
                            >
                              {task.priority}
                            </span>
                          )}
                          {task.assignee && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#4b5563',
                              }}
                            >
                              {task.assignee.displayName || task.assignee.username}
                            </span>
                          )}
                        </div>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          style={{
                            fontSize: '11px',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#f9fafb',
                          }}
                        >
                          {columns.map((col) => (
                            <option key={col.key} value={col.key}>
                              {col.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

