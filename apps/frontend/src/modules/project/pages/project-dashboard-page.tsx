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

export function ProjectDashboardPage() {
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
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading project dashboard...</p>
      </div>
    );
  }

  if (isError || !project) {
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
          {error instanceof Error
            ? error.message
            : 'The project could not be loaded. It may not exist or you may not have permission to view it.'}
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

  return (
    <div>
      <nav style={{ fontSize: '13px', marginBottom: '8px', color: '#6b7280' }}>
        <Link to="/app" style={{ color: '#60a5fa', textDecoration: 'none' }}>
          Projects
        </Link>
        <span> / </span>
        <span>{project.name}</span>
      </nav>

      <header style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  value={editForm.name ?? project.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #1f2937',
                    backgroundColor: '#020617',
                    color: '#e5e7eb',
                    fontSize: '20px',
                    fontWeight: 600,
                  }}
                />
                <textarea
                  value={editForm.description ?? project.description ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Project description"
                  rows={2}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #1f2937',
                    backgroundColor: '#020617',
                    color: '#9ca3af',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
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
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
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
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #1f2937',
                      backgroundColor: 'transparent',
                      color: '#e5e7eb',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ margin: '0 0 4px' }}>{project.name}</h1>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setEditForm({ name: project.name, description: project.description ?? undefined });
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #1f2937',
                      backgroundColor: 'transparent',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Edit
                  </button>
                </div>
                {project.description && (
                  <p
                    style={{
                      margin: 0,
                      maxWidth: '640px',
                      fontSize: '14px',
                      color: '#9ca3af',
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
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '16px',
          fontSize: '12px',
        }}
      >
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '999px',
            backgroundColor: '#111827',
            color: '#e5e7eb',
            border: '1px solid #1f2937',
          }}
        >
          {project.type}
        </span>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '999px',
            backgroundColor: '#020617',
            color: '#9ca3af',
            border: '1px solid #1f2937',
          }}
        >
          {project.visibility}
        </span>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '999px',
            backgroundColor: project.status === 'active' ? '#022c22' : '#451a03',
            color: project.status === 'active' ? '#6ee7b7' : '#fed7aa',
            border: '1px solid #064e3b',
          }}
        >
          {project.status}
        </span>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
          fontSize: '12px',
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #111827',
            background:
              'radial-gradient(circle at top left, #020617 0, #020617 40%, #020617 100%)',
          }}
        >
          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Total Tasks</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {taskStats.total}
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #111827',
            background:
              'radial-gradient(circle at top left, #020617 0, #020617 40%, #020617 100%)',
          }}
        >
          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Completed</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#22c55e' }}>
            {taskStats.completed}
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #111827',
            background:
              'radial-gradient(circle at top left, #020617 0, #020617 40%, #020617 100%)',
          }}
        >
          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>In Progress</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}>
            {taskStats.inProgress}
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #111827',
            background:
              'radial-gradient(circle at top left, #020617 0, #020617 40%, #020617 100%)',
          }}
        >
          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>To Do</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#9ca3af' }}>
            {taskStats.todo}
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #111827',
            background:
              'radial-gradient(circle at top left, #020617 0, #020617 40%, #020617 100%)',
          }}
        >
          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Iterations</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {project._count?.iterations ?? 0}
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #111827',
            background:
              'radial-gradient(circle at top left, #020617 0, #020617 40%, #020617 100%)',
          }}
        >
          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Milestones</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {project._count?.milestones ?? 0}
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

