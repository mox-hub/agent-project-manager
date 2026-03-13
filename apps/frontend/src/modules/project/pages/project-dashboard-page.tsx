import { Link, useParams } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useProjectDetail } from '../hooks/use-project-detail';
import { useUpdateProject } from '../hooks/use-project-mutations';
import { useProjectTasks } from '@/modules/task/hooks/use-project-tasks';
import type { UpdateProjectRequest } from '../api/project-api';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useProjectEvents } from '@/infrastructure/hooks/use-event-subscription';
import { useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/modules/git/hooks/use-repositories';
import { ProjectHealthWidget } from '../components/project-health-widget';
import { AIInsightsWidget } from '../components/ai-insights-widget';
import { useTheme } from '@/shared/theme/theme-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  AlertCircle,
  Edit3,
  Share2,
  Plus,
  Calendar,
  Flag,
  ChevronRight,
  GitBranch,
  FileText,
  RefreshCw,
} from 'lucide-react';

export function ProjectDashboardPage() {
  const { mode } = useTheme();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, isError, error } = useProjectDetail(projectId);
  const { setCurrentProjectId } = useAppStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');

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
  const { data: repositories } = useRepositories({ projectId });
  const updateProject = useUpdateProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProjectRequest>({});

  const taskStats = useMemo(() => {
    const tasks = tasksData?.data ?? [];
    let totalTasks = tasks.length;
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

  const mockTeamWorkload = [
    { name: 'Alex Chen', percentage: 85, status: 'normal' },
    { name: 'Sarah Miller', percentage: 42, status: 'normal' },
    { name: 'Marcus T.', percentage: 98, status: 'high' },
    { name: 'Dina V.', percentage: 12, status: 'low' },
  ];

  const mockKanbanColumns = [
    {
      id: 'todo',
      title: 'Todo',
      count: 4,
      color: '#94a3b8',
      tasks: [
        { id: '1', title: 'Update IAM policy for S3 buckets', priority: 'high', assignee: null },
      ],
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      count: 2,
      color: '#3b82f6',
      tasks: [
        { id: '2', title: 'Refactor EC2 instance discovery script', priority: 'medium', assignee: 'avatar' },
      ],
    },
    {
      id: 'review',
      title: 'Review',
      count: 1,
      color: '#f59e0b',
      tasks: [
        { id: '3', title: 'Finalize migration docs for Finance', priority: 'medium', assignee: 'avatar', pending: true },
      ],
    },
    {
      id: 'done',
      title: 'Done',
      count: 12,
      color: '#22c55e',
      tasks: [],
    },
  ];

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'board', label: 'Board' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'team', label: 'Team' },
    { id: 'settings', label: 'Settings & Config' },
  ];

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
    <div className={`flex h-full w-full min-w-0 flex-col bg-content-bg p-6 sm:p-8 ${isDark ? 'dark' : ''}`}>
      <div className="mx-auto w-full max-w-full">
        {/* Page Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="mb-0 text-2xl font-extrabold tracking-tight text-content-text">
              {project.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {/* Project Tags */}
              <div className="flex gap-2">
                <span className="rounded-sm bg-accent-blue/20 px-2 py-0.5 text-[11px] font-semibold text-accent-blue">
                  {project.type || 'Project'}
                </span>
                <span className="rounded-sm bg-accent-purple/20 px-2 py-0.5 text-[11px] font-semibold text-accent-purple">
                  Migration
                </span>
              </div>

              <div className="h-4 w-px bg-content-border" />

              {/* Priority */}
              <div className="flex items-center gap-1 text-accent-red">
                <Flag size={14} />
                <span className="text-xs font-bold">High Priority</span>
              </div>

              <div className="h-4 w-px bg-content-border" />

              {/* Date Range */}
              <div className="flex items-center gap-1 text-content-text-secondary">
                <Calendar size={14} />
                <span className="text-xs font-medium">Oct 2023 - Jun 2024</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="secondary" size="sm">
              <Edit3 size={14} />
              Edit Project
            </Button>
            <Button variant="secondary" size="sm" className="text-accent-blue">
              <Share2 size={14} />
              Share
            </Button>
            <Button size="sm">
              <Plus size={14} />
              New Task
            </Button>
          </div>
        </div>

        {/* Stats Grid - responsive 2/4 columns */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="mb-1 text-xs font-medium text-content-text-secondary">Total Tasks</p>
              <h3 className="text-2xl font-bold text-content-text">{taskStats.total}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="mb-1 text-xs font-medium text-content-text-secondary">Completed</p>
              <h3 className="text-2xl font-bold text-accent-green">{taskStats.completed}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="mb-1 text-xs font-medium text-content-text-secondary">In Progress</p>
              <h3 className="text-2xl font-bold text-accent-blue">{taskStats.inProgress}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="mb-1 text-xs font-medium text-content-text-secondary">To Do</p>
              <h3 className="text-2xl font-bold text-content-text-tertiary">{taskStats.todo}</h3>
            </CardContent>
          </Card>
        </div>

        {/* Health & AI Insights - full width row */}
        <div className="mb-8 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Project Health Card */}
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="mb-1 text-lg font-bold text-content-text">Project Health</h4>
                <p className="mb-0 text-sm text-content-text-secondary">
                  Overall health score based on multiple factors
                </p>
                <div className="mt-4">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-content-text-tertiary">
                    Status
                  </p>
                  <p className="mb-0 text-sm font-bold text-accent-green">On Track</p>
                </div>
              </div>
              <div className="text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-green text-2xl font-extrabold text-white">
                  92
                </div>
                <div className="mt-2">
                  <p className="mb-0 text-[10px] font-semibold uppercase tracking-wider text-content-text-tertiary">
                    Change (30d)
                  </p>
                  <p className="mb-0 text-sm font-bold text-accent-green">+2.4 pts</p>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Insights Card */}
          <Card className="p-4">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h4 className="mb-1 text-lg font-bold text-content-text">AI Insights</h4>
                <p className="mb-0 text-sm text-content-text-secondary">
                  Project context for AI assistant
                </p>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw size={12} />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs font-bold text-content-text">Team Size</p>
                <p className="mb-0 text-sm text-content-text-secondary">8 Members</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-content-text">Lifecycle Phase</p>
                <p className="mb-0 text-sm text-content-text-secondary">Active Development</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-content-text">Complexity</p>
                <Badge variant="warning">High</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-8 border-b border-content-border pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 border-transparent bg-transparent py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-accent-blue text-accent-blue'
                  : 'text-content-text-secondary hover:text-content-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Grid - responsive */}
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Burn-down Chart */}
          <Card className="lg:col-span-2 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="mb-0 text-sm font-bold text-content-text">Burn-down Progress</h3>
              <select className="rounded-sm border border-content-border bg-transparent px-2 py-1 text-[10px] font-bold text-content-text-secondary">
                <option>Current Sprint</option>
                <option>Last Sprint</option>
              </select>
            </div>
            {/* Chart placeholder */}
            <div className="relative flex h-48 w-full flex-col-reverse gap-1">
              {[90, 80, 75, 60, 55, 40, 30, 20, 15].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    backgroundColor: index >= 7 ? 'var(--color-content-bg-secondary)' : `rgba(59, 130, 246, ${index >= 6 ? 0.8 : index >= 4 ? 0.7 : index >= 2 ? 0.6 : 0.4})`,
                    height: `${height}%`,
                  }}
                />
              ))}
              {/* Ideal line */}
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <line
                  x1="0"
                  x2="100"
                  y1="10"
                  y2="90"
                  stroke="var(--color-content-border)"
                  strokeWidth="0.5"
                  strokeDasharray="4"
                />
              </svg>
            </div>
            <div className="mt-3 flex justify-between text-[10px] font-bold text-content-text-tertiary">
              <span>DAY 1</span>
              <span>DAY 5</span>
              <span>DAY 10</span>
              <span>DAY 14</span>
            </div>
          </Card>

          {/* Team Workload */}
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-bold text-content-text">Team Workload</h3>
            <div className="flex flex-col gap-4">
              {mockTeamWorkload.map((member) => (
                <div key={member.name}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-xs font-medium text-content-text">{member.name}</span>
                    <span className="text-xs text-content-text-secondary">
                      {member.percentage}% {member.status === 'high' && '(High)'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-content-bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${member.percentage}%`,
                        backgroundColor:
                          member.percentage > 90
                            ? 'var(--color-accent-yellow)'
                            : member.percentage < 30
                            ? 'var(--color-accent-green)'
                            : 'var(--color-accent-blue)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4 w-full text-[10px] uppercase tracking-wider">
              Balance Workload
            </Button>
          </Card>
        </div>

        {/* Integration Cards - responsive */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* GitHub */}
          <Card className="flex items-center gap-3 p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-content-bg-secondary">
              <GitBranch size={24} />
            </div>
            <div className="flex-1">
              <h4 className="mb-0 text-sm font-bold text-content-text">Repository Binding</h4>
              <p className="mb-0 text-xs text-content-text-secondary">nebula-core/cloud-infra</p>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-green-light text-accent-green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          </Card>

          {/* Linear */}
          <Card className="flex items-center gap-3 p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-content-bg-secondary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-accent-blue)">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="mb-0 text-sm font-bold text-content-text">Linear Sync</h4>
              <p className="mb-0 text-xs text-content-text-secondary">Project: NC-2024</p>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-green-light text-accent-green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          </Card>

          {/* External Docs */}
          <Card className="flex items-center gap-3 p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-content-bg-secondary text-accent-blue">
              <FileText size={24} />
            </div>
            <div className="flex-1">
              <h4 className="mb-0 text-sm font-bold text-content-text">External Docs</h4>
              <p className="mb-0 text-xs text-content-text-secondary">Notion / Google Drive</p>
            </div>
            <Button variant="ghost" size="sm" className="text-accent-blue">
              Manage
            </Button>
          </Card>
        </div>

        {/* Kanban Preview Header */}
        <div className="mb-4 flex items-center justify-between border-t border-content-border pt-4">
          <h3 className="mb-0 text-lg font-bold text-content-text">Project Board Preview</h3>
          <Link
            to={`/app/projects/${project.id}/tasks`}
            className="flex items-center gap-1 text-sm font-bold text-accent-blue no-underline hover:underline"
          >
            View Full Board
            <ChevronRight size={16} />
          </Link>
        </div>

        {/* Kanban Preview - columns fill width */}
        <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
          {mockKanbanColumns.map((column) => (
            <div key={column.id} className="min-w-0">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h4 className="mb-0 text-[12px] font-bold uppercase tracking-wider text-content-text-secondary">
                    {column.title} ({column.count})
                  </h4>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {column.tasks.map((task) => (
                  <Card key={task.id} className="cursor-pointer border-l-4 p-3 transition-colors hover:border-content-border">
                    <div className="mb-2 flex gap-1">
                      {task.priority === 'high' && (
                        <Badge variant="warning">High</Badge>
                      )}
                    </div>
                    <p className="mb-0 text-sm font-medium leading-relaxed text-content-text">
                      {task.title}
                    </p>
                    {task.assignee && (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="h-6 w-6 rounded-full bg-accent-blue" />
                        {task.pending && (
                          <Badge variant="warning" className="text-[10px]">Pending AI Audit</Badge>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
                {/* Archived Tasks placeholder */}
                {column.id === 'done' && column.tasks.length === 0 && (
                  <Card className="flex cursor-pointer items-center justify-center border-dashed py-3">
                    <Button variant="ghost" className="text-[12px] uppercase tracking-wider text-content-text-tertiary">
                      Archived Tasks
                    </Button>
                  </Card>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
