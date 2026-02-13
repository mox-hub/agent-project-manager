import { useTaskDetail, useTaskActivities, useAddTaskDependency, useRemoveTaskDependency } from '../hooks/use-project-tasks';
import { useState, type FormEvent } from 'react';

interface TaskDetailDrawerProps {
  taskId: string | null;
  projectId: string | null;
  onClose: () => void;
}

function formatDate(date: string | null | undefined) {
  if (!date) return '';
  return new Date(date).toLocaleString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: 13,
          fontWeight: 600,
          color: '#111827',
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

export function TaskDetailDrawer({ taskId, projectId, onClose }: TaskDetailDrawerProps) {
  const [targetTaskId, setTargetTaskId] = useState('');
  const [dependencyType, setDependencyType] = useState<'blocks' | 'relates'>('blocks');

  const {
    data: task,
    isLoading: taskLoading,
    isError: taskError,
  } = useTaskDetail(taskId || undefined);
  const {
    data: activities,
    isLoading: activitiesLoading,
    isError: activitiesError,
  } = useTaskActivities(taskId || undefined);

  const addDependency = useAddTaskDependency(taskId || undefined);
  const removeDependency = useRemoveTaskDependency(taskId || undefined, projectId || undefined);

  const handleAddDependency = (event: FormEvent) => {
    event.preventDefault();
    if (!targetTaskId.trim() || !taskId) return;

    addDependency.mutate({
      dependsOnTaskId: targetTaskId.trim(),
      type: dependencyType,
    });

    setTargetTaskId('');
  };

  const handleRemoveDependency = (dependencyId: string) => {
    if (!taskId) return;
    removeDependency.mutate(dependencyId);
  };

  const isOpen = !!taskId;

  return (
    <div
      aria-hidden={!isOpen}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        zIndex: 40,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,0.45)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 150ms ease-out',
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: 420,
          maxWidth: '100%',
          backgroundColor: '#F9FAFB',
          boxShadow: '-8px 0 24px rgba(15,23,42,0.3)',
          padding: '16px 20px',
          display: isOpen ? 'flex' : 'none',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 2,
              }}
            >
              Task details
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                color: '#111827',
              }}
            >
              {task?.title ?? 'Loading...'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#6B7280',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ✕
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            paddingRight: 4,
          }}
        >
          {taskLoading && <p style={{ fontSize: 12, color: '#6B7280' }}>Loading task...</p>}
          {taskError && (
            <p style={{ fontSize: 12, color: '#DC2626' }}>Failed to load task details.</p>
          )}
          {!taskLoading && !taskError && task && (
            <>
              <Section title="Summary">
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 13,
                    color: '#374151',
                  }}
                >
                  {task.description || 'No description yet.'}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 6,
                    fontSize: 11,
                    color: '#6B7280',
                  }}
                >
                  <span>
                    <strong>Status:</strong> {task.status}
                  </span>
                  {task.priority && (
                    <span>
                      <strong>Priority:</strong> {task.priority}
                    </span>
                  )}
                  {task.assignee && (
                    <span>
                      <strong>Assignee:</strong>{' '}
                      {task.assignee.displayName || task.assignee.username}
                    </span>
                  )}
                  {task.dueDate && (
                    <span>
                      <strong>Due:</strong> {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </Section>

              <Section title="Dependencies">
                {task.dependencies && task.dependencies.length > 0 ? (
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {task.dependencies.map((dep) => (
                      <li
                        key={dep.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid #E5E7EB',
                          backgroundColor: '#FFFFFF',
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>
                            {dep.dependsOnTask?.title ?? dep.dependsOnTaskId}
                          </span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>
                            {dep.type === 'blocks' ? 'Blocks' : 'Relates to'} •{' '}
                            {dep.dependsOnTask?.status ?? 'unknown'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDependency(dep.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            fontSize: 11,
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                    No dependencies yet.
                  </p>
                )}

                <form
                  onSubmit={handleAddDependency}
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      color: '#6B7280',
                    }}
                  >
                    Add dependency by task ID
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                    }}
                  >
                    <input
                      type="text"
                      value={targetTaskId}
                      onChange={(e) => setTargetTaskId(e.target.value)}
                      placeholder="Target task ID"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: '1px solid #D1D5DB',
                        fontSize: 12,
                      }}
                    />
                    <select
                      value={dependencyType}
                      onChange={(e) =>
                        setDependencyType(e.target.value as 'blocks' | 'relates')
                      }
                      style={{
                        fontSize: 12,
                        padding: '4px 6px',
                        borderRadius: 4,
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#F3F4F6',
                      }}
                    >
                      <option value="blocks">Blocks</option>
                      <option value="relates">Relates</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!targetTaskId.trim() || addDependency.isPending}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 4,
                        border: 'none',
                        backgroundColor: !targetTaskId.trim()
                          ? '#9CA3AF'
                          : '#2563EB',
                        color: '#FFFFFF',
                        fontSize: 12,
                        cursor: !targetTaskId.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </form>
              </Section>

              <Section title="Activity">
                {activitiesLoading && (
                  <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                    Loading activity...
                  </p>
                )}
                {activitiesError && (
                  <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>
                    Failed to load activity.
                  </p>
                )}
                {!activitiesLoading && !activitiesError && activities && activities.length > 0 ? (
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {activities.map((activity) => (
                      <li
                        key={activity.id}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid #E5E7EB',
                          backgroundColor: '#FFFFFF',
                          fontSize: 11,
                          color: '#374151',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 2,
                          }}
                        >
                          <span
                            style={{
                              textTransform: 'capitalize',
                              color: '#6B7280',
                            }}
                          >
                            {activity.type.replace(/_/g, ' ')}
                          </span>
                          <span style={{ color: '#9CA3AF' }}>
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                        {activity.summary && <div>{activity.summary}</div>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  !activitiesLoading && (
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                      No activity yet.
                    </p>
                  )
                )}
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

