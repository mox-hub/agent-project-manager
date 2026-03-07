import { Link, useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useProjectDetail } from '../hooks/use-project-detail';
import { useUpdateProject } from '../hooks/use-project-mutations';
import { useProjectTasks } from '@/modules/task/hooks/use-project-tasks';
import type { UpdateProjectRequest } from '../api/project-api';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useProjectEvents } from '@/infrastructure/hooks/use-event-subscription';
import { useQueryClient } from '@tanstack/react-query';
import { RepositoryList } from '@/modules/git/components/repository-list';
import { useRepositories } from '@/modules/git/hooks/use-repositories';
import { CommitList } from '@/modules/git/components/commit-list';
import { ProjectHealthWidget } from '../components/project-health-widget';
import { AIInsightsWidget } from '../components/ai-insights-widget';
import { useTheme } from '@/shared/theme/theme-context';
import { Settings, AlertCircle } from 'lucide-react';

export function ProjectDashboardPage() {
  const { theme } = useTheme();
  const { colors, typography, spacing, radii } = theme;
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, isError, error } = useProjectDetail(projectId);
  const { setCurrentProjectId } = useAppStore();
  const queryClient = useQueryClient();

  // Update global store when projectId changes
  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId);
    }
  }, [projectId, setCurrentProjectId]);

  // Subscribe to project events
  useProjectEvents(projectId, {
    onProjectUpdated: () => {
      // Invalidate project query to refetch
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
    onTaskUpdated: () => {
      // Invalidate tasks query to refetch
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onTaskCreated: () => {
      // Invalidate tasks query to refetch
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
  const { data: tasksData } = useProjectTasks(projectId, { pageSize: 1000 });
  const { data: repositories } = useRepositories({ projectId });
  const updateProject = useUpdateProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProjectRequest>({});

  // Calculate task statistics
  const taskStats = useMemo(() => {
    const tasks = tasksData?.data ?? [];
    const statsByStatus: Record<string, number> = {};
    let totalTasks = tasks.length;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let todoTasks = 0;

    tasks.forEach((task) => {
      const status = task.status || 'todo';
      statsByStatus[status] = (statsByStatus[status] || 0) + 1;

      if (status.toLowerCase().includes('done') || status.toLowerCase().includes('complete')) {
        completedTasks++;
      } else if (status.toLowerCase().includes('progress') || status.toLowerCase().includes('doing')) {
        inProgressTasks++;
      } else {
        todoTasks++;
      }
    });

    return {
      byStatus: statsByStatus,
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      todo: todoTasks,
    };
  }, [tasksData]);

  if (isLoading) {
    return (
      <div
        style={{
          padding: spacing['4xl'],
          textAlign: 'center',
          color: colors.content.textSecondary,
          fontSize: typography.fontSize.sm,
          backgroundColor: colors.content.bg,
          minHeight: '100vh',
        }}
      >
        Loading project dashboard...
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div
        style={{
          padding: spacing['4xl'],
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: colors.content.bg,
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: radii.xl,
            backgroundColor: colors.accent.redLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            marginBottom: spacing.lg,
          }}
        >
          <AlertCircle size={32} color={colors.accent.red} />
        </div>
        <h2
          style={{
            margin: `0 0 ${spacing.md}px`,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.accent.red,
          }}
        >
          Failed to load project
        </h2>
        <p
          style={{
            margin: `0 0 ${spacing.lg}px`,
            fontSize: typography.fontSize.sm,
            color: colors.content.textSecondary,
          }}
        >
          {error instanceof Error
            ? error.message
            : 'The project could not be loaded. It may not exist or you may not have permission to view it.'}
        </p>
        <Link
          to="/app"
          style={{
            padding: `${spacing.sm}px ${spacing.lg}px`,
            borderRadius: radii.md,
            border: `1px solid ${colors.content.border}`,
            backgroundColor: colors.content.bg,
            color: colors.content.text,
            textDecoration: 'none',
            fontSize: typography.fontSize.sm,
            display: 'inline-block',
            fontWeight: typography.fontWeight.medium,
          }}
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: colors.content.bg,
        minHeight: '100vh',
        padding: spacing['2xl'],
      }}
    >
      <nav
        style={{
          fontSize: typography.fontSize.sm,
          marginBottom: spacing.lg,
          color: colors.content.textTertiary,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Link
          to="/app"
          style={{
            color: colors.accent.blue,
            textDecoration: 'none',
            fontWeight: typography.fontWeight.medium,
          }}
        >
          Projects
        </Link>
        <span style={{ color: colors.content.textTertiary }}>›</span>
        <span style={{ color: colors.content.text }}>{project.name}</span>
      </nav>

      <header style={{ marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                <input
                  type="text"
                  value={editForm.name ?? project.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    borderRadius: radii.md,
                    border: `1px solid ${colors.content.border}`,
                    backgroundColor: colors.content.bg,
                    color: colors.content.text,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.semibold,
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.accent.blue;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.content.border;
                  }}
                />
                <textarea
                  value={editForm.description ?? project.description ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Add a description..."
                  rows={2}
                  style={{
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    borderRadius: radii.md,
                    border: `1px solid ${colors.content.border}`,
                    backgroundColor: colors.content.bg,
                    color: colors.content.textSecondary,
                    fontSize: typography.fontSize.md,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.accent.blue;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.content.border;
                  }}
                />
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (projectId) {
                        updateProject.mutate(
                          { projectId, data: editForm },
                          {
                            onSuccess: () => {
                              setIsEditing(false);
                              setEditForm({});
                            },
                          },
                        );
                      }
                    }}
                    disabled={updateProject.isPending}
                    style={{
                      padding: `${spacing.sm}px ${spacing.md}px`,
                      borderRadius: radii.md,
                      border: 'none',
                      backgroundColor: colors.accent.blue,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    {updateProject.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({});
                    }}
                    style={{
                      padding: `${spacing.sm}px ${spacing.md}px`,
                      borderRadius: radii.md,
                      border: `1px solid ${colors.content.border}`,
                      backgroundColor: 'transparent',
                      color: colors.content.text,
                      cursor: 'pointer',
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <h1
                    style={{
                      margin: `0 0 ${spacing.xs}`,
                      fontSize: typography.fontSize['2xl'],
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.content.text,
                    }}
                  >
                    {project.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setEditForm({ name: project.name, description: project.description ?? undefined });
                    }}
                    style={{
                      padding: `${spacing.xs}px ${spacing.sm}px`,
                      borderRadius: radii.sm,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: colors.content.textTertiary,
                      cursor: 'pointer',
                      fontSize: typography.fontSize.sm,
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.xs,
                    }}
                  >
                    <Settings size={14} />
                    Edit
                  </button>
                </div>
                {project.description && (
                  <p
                    style={{
                      margin: 0,
                      maxWidth: '640px',
                      fontSize: typography.fontSize.md,
                      color: colors.content.textSecondary,
                      lineHeight: typography.lineHeight.relaxed,
                    }}
                  >
                    {project.description}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <section
        style={{
          display: 'flex',
          gap: spacing.sm,
          flexWrap: 'wrap',
          marginBottom: spacing['2xl'],
          fontSize: typography.fontSize.sm,
        }}
      >
        <span
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            borderRadius: radii.lg,
            backgroundColor: colors.accent.blueLight,
            color: colors.accent.blue,
            fontWeight: typography.fontWeight.medium,
            textTransform: 'capitalize',
          }}
        >
          {project.type}
        </span>
        <span
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            borderRadius: radii.lg,
            backgroundColor: colors.content.bgSecondary,
            color: colors.content.textSecondary,
            fontWeight: typography.fontWeight.medium,
            textTransform: 'capitalize',
          }}
        >
          {project.visibility}
        </span>
        <span
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            borderRadius: radii.lg,
            backgroundColor: project.status === 'active' ? colors.accent.greenLight : colors.accent.yellowLight,
            color: project.status === 'active' ? colors.accent.green : colors.accent.yellow,
            fontWeight: typography.fontWeight.medium,
            textTransform: 'capitalize',
          }}
        >
          {project.status}
        </span>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing['2xl'],
          fontSize: typography.fontSize.sm,
        }}
      >
        <div
          style={{
            padding: spacing.lg,
            borderRadius: radii.lg,
            border: `1px solid ${colors.content.border}`,
            backgroundColor: colors.content.bg,
          }}
        >
          <div style={{ color: colors.content.textSecondary, marginBottom: spacing.xs }}>Total Tasks</div>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.semibold, color: colors.content.text }}>
            {taskStats.total}
          </div>
        </div>
        <div
          style={{
            padding: spacing.lg,
            borderRadius: radii.lg,
            border: `1px solid ${colors.content.border}`,
            backgroundColor: colors.content.bg,
          }}
        >
          <div style={{ color: colors.content.textSecondary, marginBottom: spacing.xs }}>Completed</div>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.semibold, color: colors.accent.green }}>
            {taskStats.completed}
          </div>
        </div>
        <div
          style={{
            padding: spacing.lg,
            borderRadius: radii.lg,
            border: `1px solid ${colors.content.border}`,
            backgroundColor: colors.content.bg,
          }}
        >
          <div style={{ color: colors.content.textSecondary, marginBottom: spacing.xs }}>In Progress</div>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.semibold, color: colors.accent.blue }}>
            {taskStats.inProgress}
          </div>
        </div>
        <div
          style={{
            padding: spacing.lg,
            borderRadius: radii.lg,
            border: `1px solid ${colors.content.border}`,
            backgroundColor: colors.content.bg,
          }}
        >
          <div style={{ color: colors.content.textSecondary, marginBottom: spacing.xs }}>To Do</div>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.semibold, color: colors.content.textTertiary }}>
            {taskStats.todo}
          </div>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
          gap: '16px',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            borderRadius: '10px',
            border: '1px solid #111827',
            backgroundColor: '#020617',
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#e5e7eb' }}>Quick links</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: '13px',
            }}
          >
            <Link
              to={`/app/projects/${project.id}/tasks`}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #1f2937',
                background:
                  'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(14,165,233,0.08))',
                color: '#e5e7eb',
                textDecoration: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Open task board</span>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>View all tasks →</span>
            </Link>
          </div>
        </div>

        <div
          style={{
            borderRadius: '10px',
            border: '1px solid #111827',
            backgroundColor: '#020617',
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#e5e7eb' }}>Task Status Breakdown</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: '12px',
            }}
          >
            {Object.entries(taskStats.byStatus).length > 0 ? (
              Object.entries(taskStats.byStatus)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([status, count]) => (
                  <div
                    key={status}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#111827',
                    }}
                  >
                    <span style={{ color: '#9ca3af' }}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                    </span>
                    <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{count}</span>
                  </div>
                ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                No tasks yet. Create your first task to see statistics.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Git Section */}
      {repositories && repositories.length > 0 && (
        <section
          style={{
            marginTop: '24px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '16px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              borderRadius: '10px',
              border: '1px solid #111827',
              backgroundColor: '#020617',
              padding: '16px',
            }}
          >
            <RepositoryList projectId={projectId} />
          </div>
          {repositories.length > 0 && repositories[0] && (
            <div
              style={{
                borderRadius: '10px',
                border: '1px solid #111827',
                backgroundColor: '#020617',
                padding: '16px',
              }}
            >
              <CommitList repoId={repositories[0].id} />
            </div>
          )}
        </section>
      )}

      {/* Health & AI Insights Section */}
      <section
        style={{
          marginTop: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '16px',
          alignItems: 'flex-start',
        }}
      >
        <ProjectHealthWidget projectId={projectId || ''} />
        <AIInsightsWidget projectId={projectId || ''} />
      </section>
    </div>
  );
}

