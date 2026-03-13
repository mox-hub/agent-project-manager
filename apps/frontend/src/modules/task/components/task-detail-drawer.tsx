import { useEffect, useState, useCallback } from 'react';
import { colors, radii, spacing, typography, shadows } from '@/shared/theme/tokens';
import { Button } from '@/components/ui/button';
import type { Task, TaskActivity } from '@/modules/task/api/task-api';
import { useTaskDetail, useTaskActivities, useUpdateTask, useAddTaskDependency, useRemoveTaskDependency } from '../hooks/use-project-tasks';

/** Get current viewport size accounting for browser zoom */
function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    visualWidth: window.visualViewport?.width ?? window.innerWidth,
    visualHeight: window.visualViewport?.height ?? window.innerHeight,
  };
}

/** Calculate adaptive drawer width based on viewport */
function getAdaptiveDrawerWidth(baseWidth = 480, minWidth = 320, maxWidth = 600) {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  // On small screens use more space: 85% for mobile, 60% for tablet, fixed for desktop
  if (viewportWidth < 640) {
    return Math.max(viewportWidth * 0.9, minWidth);
  }
  if (viewportWidth < 1024) {
    return Math.max(viewportWidth * 0.6, minWidth);
  }
  // Desktop: use base width, but cap at maxWidth
  return Math.min(baseWidth, maxWidth);
}

export interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

const priorityOptions = [
  { value: 'low', label: 'Low', color: colors.success },
  { value: 'medium', label: 'Medium', color: colors.warning },
  { value: 'high', label: 'High', color: colors.error },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
];

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

export function TaskDetailDrawer({ taskId, onClose }: TaskDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(() => getAdaptiveDrawerWidth());

  // Update drawer width on resize and zoom
  const updateDrawerWidth = useCallback(() => {
    setDrawerWidth(getAdaptiveDrawerWidth());
  }, []);

  useEffect(() => {
    updateDrawerWidth();
    window.addEventListener('resize', updateDrawerWidth);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDrawerWidth);
    }
    return () => {
      window.removeEventListener('resize', updateDrawerWidth);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateDrawerWidth);
      }
    };
  }, [updateDrawerWidth]);

  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    priority: string;
    status: string;
    assigneeId: string;
    iterationId: string;
    dueDate: string;
    estimate: string;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assigneeId: '',
    iterationId: '',
    dueDate: '',
    estimate: '',
  });

  const { data: task, isLoading: taskLoading } = useTaskDetail(taskId || undefined);
  const { data: activities } = useTaskActivities(taskId || undefined);
  const updateTask = useUpdateTask();
  const addDependency = useAddTaskDependency(taskId || undefined);
  const removeDependency = useRemoveTaskDependency(taskId || undefined, task?.projectId);

  useEffect(() => {
    if (task) {
      setEditForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        assigneeId: task.assignee?.id || '',
        iterationId: task.iterationId || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        estimate: task.estimate?.toString() || '',
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (!taskId) return;
    await updateTask.mutateAsync({
      taskId,
      data: {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority as any,
        status: editForm.status,
        assigneeId: editForm.assigneeId || undefined,
        iterationId: editForm.iterationId || undefined,
        dueDate: editForm.dueDate || undefined,
        estimate: editForm.estimate ? parseFloat(editForm.estimate) : undefined,
      },
    });
    setIsEditing(false);
  };

  if (!taskId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 40,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: drawerWidth,
          maxWidth: '100vw',
          background: colors.surface,
          boxShadow: shadows.lg,
          zIndex: 41,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.md,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <h2 style={{ margin: 0, fontSize: typography.lg, fontWeight: 600 }}>
            Task Details
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: spacing.md }}>
          {taskLoading ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.textSecondary }}>
              Loading...
            </div>
          ) : task ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              {/* Title */}
              <div>
                {isEditing ? (
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      fontSize: typography.lg,
                      fontWeight: 600,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.md,
                      background: colors.neutralBg,
                      color: colors.textPrimary,
                    }}
                  />
                ) : (
                  <h3 style={{ margin: 0, fontSize: typography.lg, fontWeight: 600 }}>
                    {task.title}
                  </h3>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                  Description
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      fontSize: typography.sm,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.md,
                      background: colors.neutralBg,
                      color: colors.textPrimary,
                      resize: 'vertical',
                    }}
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: typography.sm, color: colors.textSecondary }}>
                    {task.description || 'No description'}
                  </p>
                )}
              </div>

              {/* Status & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <div>
                  <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                    Status
                  </label>
                  {isEditing ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        fontSize: typography.sm,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radii.md,
                        background: colors.neutralBg,
                        color: colors.textPrimary,
                      }}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: radii.sm,
                        fontSize: typography.sm,
                        background: colors.neutralBg,
                        color: colors.textPrimary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                    Priority
                  </label>
                  {isEditing ? (
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        fontSize: typography.sm,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radii.md,
                        background: colors.neutralBg,
                        color: colors.textPrimary,
                      }}
                    >
                      {priorityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: radii.sm,
                        fontSize: typography.sm,
                        background: (priorityOptions.find((p) => p.value === task.priority)?.color || colors.textSecondary) + '20',
                        color: priorityOptions.find((p) => p.value === task.priority)?.color || colors.textSecondary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {task.priority}
                    </span>
                  )}
                </div>
              </div>

              {/* Assignee, Due Date & Iteration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <div>
                  <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                    Assignee
                  </label>
                  {isEditing ? (
                    <select
                      value={editForm.assigneeId}
                      onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        fontSize: typography.sm,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radii.md,
                        background: colors.neutralBg,
                        color: colors.textPrimary,
                      }}
                    >
                      <option value="">Unassigned</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                      {task.assignee ? (
                        <>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: colors.accent,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: typography.xs,
                              fontWeight: 600,
                              color: '#fff',
                            }}
                          >
                            {task.assignee.displayName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span style={{ fontSize: typography.sm }}>
                            {task.assignee.displayName || task.assignee.username}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: typography.sm, color: colors.textTertiary }}>
                          Unassigned
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                    Due Date
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        fontSize: typography.sm,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radii.md,
                        background: colors.neutralBg,
                        color: colors.textPrimary,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: typography.sm }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                    </span>
                  )}
                </div>
              </div>

              {/* Iteration & Estimate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <div>
                  <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                    Iteration
                  </label>
                  {isEditing ? (
                    <select
                      value={editForm.iterationId}
                      onChange={(e) => setEditForm({ ...editForm, iterationId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        fontSize: typography.sm,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radii.md,
                        background: colors.neutralBg,
                        color: colors.textPrimary,
                      }}
                    >
                      <option value="">No iteration</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: typography.sm }}>
                      {task.iterationId ? `Iteration ${task.iterationId}` : 'No iteration'}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                    Estimate (hours)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.estimate}
                      onChange={(e) => setEditForm({ ...editForm, estimate: e.target.value })}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        fontSize: typography.sm,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radii.md,
                        background: colors.neutralBg,
                        color: colors.textPrimary,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: typography.sm }}>
                      {task.estimate !== undefined ? `${task.estimate}h` : 'No estimate'}
                    </span>
                  )}
                </div>
              </div>

              {/* Dependencies */}
              <div>
                <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                  Dependencies
                </label>
                {task.dependencies && task.dependencies.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                    {task.dependencies.map((dep) => (
                      <div
                        key={dep.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: spacing.sm,
                          background: colors.neutralBg,
                          borderRadius: radii.md,
                        }}
                      >
                        <span style={{ fontSize: typography.sm }}>
                          {dep.dependsOnTask?.title || dep.dependsOnTaskId}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDependency.mutate(dep.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: typography.sm, color: colors.textTertiary }}>
                    No dependencies
                  </span>
                )}
              </div>

              {/* Blocked By */}
              {task.blockedBy && task.blockedBy.length > 0 && (
                <div>
                  <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                    Blocked By
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                    {task.blockedBy.map((dep) => (
                      <div
                        key={dep.id}
                        style={{
                          padding: spacing.sm,
                          background: colors.error + '10',
                          borderRadius: radii.md,
                          borderLeft: `3px solid ${colors.error}`,
                        }}
                      >
                        <span style={{ fontSize: typography.sm }}>
                          {dep.task?.title || dep.taskId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                  Tags
                </label>
                {task.taskTags && task.taskTags.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
                    {task.taskTags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        style={{
                          display: 'inline-block',
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: radii.sm,
                          fontSize: typography.xs,
                          background: tag.color ? `${tag.color}20` : colors.neutralBg,
                          color: tag.color || colors.textPrimary,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: typography.sm, color: colors.textTertiary }}>
                    No tags
                  </span>
                )}
              </div>

              {/* Reporter */}
              {task.reporter && (
                <div>
                  <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                    Reporter
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: colors.neutralBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: typography.xs,
                        fontWeight: 600,
                        color: '#fff',
                      }}
                    >
                      {task.reporter.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span style={{ fontSize: typography.sm }}>
                      {task.reporter.displayName || task.reporter.username}
                    </span>
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div>
                <label style={{ fontSize: typography.sm, fontWeight: 500, color: colors.textSecondary, display: 'block', marginBottom: spacing.xs }}>
                  Activity
                </label>
                {activities && activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    {activities.slice(0, 10).map((activity) => (
                      <div
                        key={activity.id}
                        style={{
                          display: 'flex',
                          gap: spacing.sm,
                          fontSize: typography.xs,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: colors.accent,
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <span style={{ color: colors.textSecondary }}>{activity.summary}</span>
                          <span style={{ color: colors.textTertiary, marginLeft: spacing.xs }}>
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: typography.sm, color: colors.textTertiary }}>
                    No activity yet
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: spacing.sm,
            padding: spacing.md,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          {isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={updateTask.isPending}>
                {updateTask.isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              Edit Task
            </Button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
