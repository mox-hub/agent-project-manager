import { Link, useParams } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useProjectDetail } from '../hooks/use-project-detail';
import { useProjectTasks } from '@/modules/task/hooks/use-project-tasks';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useProjectEvents } from '@/infrastructure/hooks/use-event-subscription';
import { useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/modules/git/hooks/use-repositories';
import { useTheme } from '@/shared/theme/theme-context';
import { PageShell } from '@/components/ui/page-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { AlertCircle } from 'lucide-react';
import { ProjectDashboardHeader } from '../components/dashboard/project-dashboard-header';
import { ProjectDashboardInsights } from '../components/dashboard/project-dashboard-insights';
import { ProjectDashboardActivity } from '../components/dashboard/project-dashboard-activity';
import { ProjectDashboardIntegrations } from '../components/dashboard/project-dashboard-integrations';
import { ProjectDashboardBoardPreview } from '../components/dashboard/project-dashboard-board-preview';
import {
  dashboardTabs,
  type DashboardTab,
  mockKanbanColumns,
  mockTeamWorkload,
} from '../components/dashboard/project-dashboard-data';
import { ProjectDashboardTabs } from '../components/dashboard/project-dashboard-tabs';

export function ProjectDashboardPage() {
  const { mode } = useTheme();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, isError, error } = useProjectDetail(projectId);
  const { setCurrentProjectId } = useAppStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DashboardTab['id']>('dashboard');

  const isDark = mode === 'dark';

  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId);
    }
  }, [projectId, setCurrentProjectId]);

  useProjectEvents(projectId, {
    onProjectUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
    onTaskUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onTaskCreated: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const { data: tasksData } = useProjectTasks(projectId, { pageSize: 1000 });
  useRepositories({ projectId });

  const taskStats = useMemo(() => {
    const tasks = tasksData?.data ?? [];
    const totalTasks = tasks.length;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let todoTasks = 0;

    tasks.forEach((task) => {
      const status = task.status || 'todo';
      if (status.toLowerCase().includes('done') || status.toLowerCase().includes('complete')) {
        completedTasks++;
      } else if (status.toLowerCase().includes('progress') || status.toLowerCase().includes('doing')) {
        inProgressTasks++;
      } else {
        todoTasks++;
      }
    });

    return {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      todo: todoTasks,
    };
  }, [tasksData]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-content-bg p-8 text-center text-sm text-content-text-secondary">
        Loading project dashboard...
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-content-bg p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-accent-red-light">
          <AlertCircle size={32} className="text-accent-red" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-accent-red">
          Failed to load project
        </h2>
        <p className="mb-4 text-sm text-content-text-secondary">
          {error instanceof Error
            ? error.message
            : 'The project could not be loaded. It may not exist or you may not have permission to view it.'}
        </p>
        <Link
          to="/app"
          className="inline-block rounded-md border border-content-border bg-content-bg px-4 py-2 text-sm font-medium text-content-text no-underline hover:bg-content-bg-secondary"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <PageShell className={`p-6 sm:p-8 ${isDark ? 'dark' : ''}`}>
      <div className="mx-auto w-full max-w-full">
        <ProjectDashboardHeader projectName={project.name} projectType={project.type} />

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Tasks" value={taskStats.total} />
          <StatCard label="Completed" value={taskStats.completed} accentClassName="text-accent-green" />
          <StatCard label="In Progress" value={taskStats.inProgress} accentClassName="text-accent-blue" />
          <StatCard label="To Do" value={taskStats.todo} accentClassName="text-content-text-tertiary" />
        </div>

        <ProjectDashboardInsights />

        <ProjectDashboardTabs tabs={dashboardTabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'dashboard' ? (
          <>
            <ProjectDashboardActivity teamWorkload={mockTeamWorkload} />
            <ProjectDashboardIntegrations />
            <ProjectDashboardBoardPreview projectId={project.id} columns={mockKanbanColumns} />
          </>
        ) : (
          <EmptyState
            title={`${dashboardTabs.find((tab) => tab.id === activeTab)?.label ?? '当前'}视图即将开放`}
            description="当前阶段优先统一 dashboard 体验，其他视图将在后续迭代中接入完整业务数据。"
          />
        )}
      </div>
    </PageShell>
  );
}
