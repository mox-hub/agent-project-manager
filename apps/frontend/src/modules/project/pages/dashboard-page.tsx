import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProjectList } from '../hooks/use-project-list';
import { useAppStore } from '@/infrastructure/store/app-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Zap,
  Kanban,
  Clock,
  Rocket,
  Settings,
  Shield,
  Flag,
  Globe,
  Activity,
  Lightbulb,
  AlertTriangle,
  History,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  date: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  icon: 'rocket' | 'settings' | 'shield' | 'flag' | 'public';
}

interface ActivityItem {
  id: string;
  user: string;
  type: 'commit' | 'system' | 'comment' | 'ai';
  time: string;
  content: string;
  project?: string;
  branch?: string;
}

interface AIInsight {
  id: string;
  type: 'suggestion' | 'warning';
  title: string;
  description: string;
}

const milestones: Milestone[] = [
  { id: '1', name: 'Alpha Launch', date: 'Oct 12', status: 'completed', icon: 'rocket' },
  { id: '2', name: 'Core API V2', date: 'Nov 05', status: 'completed', icon: 'settings' },
  { id: '3', name: 'Security Audit', date: 'Dec 15', status: 'in-progress', icon: 'shield' },
  { id: '4', name: 'v1.0 Release', date: 'Jan 20', status: 'upcoming', icon: 'flag' },
  { id: '5', name: 'Global Rollout', date: 'Feb 15', status: 'upcoming', icon: 'public' },
];

const activities: ActivityItem[] = [
  {
    id: '1',
    user: 'Alex Rivera',
    type: 'commit',
    time: '14m ago',
    content: 'Committed to',
    branch: 'nebula-main',
    project: 'nebula-main',
  },
  {
    id: '2',
    user: 'CI/CD Pipeline',
    type: 'system',
    time: '2h ago',
    content: 'Deployment successful for project',
    project: 'Quantum Toolkit',
  },
  {
    id: '3',
    user: 'Sarah Chen',
    type: 'comment',
    time: '5h ago',
    content: 'Left a comment on Issue #442',
  },
  {
    id: '4',
    user: 'AI Assistant',
    type: 'ai',
    time: '8h ago',
    content: 'Generated the weekly productivity report',
  },
];

const aiInsights: AIInsight[] = [
  {
    id: '1',
    type: 'suggestion',
    title: 'Automated Task Proposal',
    description:
      'Based on recent git commits, I suggest creating 3 refactoring tasks for the authentication module.',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Delivery Risk Warning',
    description:
      "Velocity has dropped by 12% in 'Nebula Cloud'. Estimated 3-day delay for Milestone 2 at current rate.",
  },
];

function getMilestoneIcon(icon: Milestone['icon']) {
  switch (icon) {
    case 'rocket':
      return <Rocket size={16} />;
    case 'settings':
      return <Settings size={16} />;
    case 'shield':
      return <Shield size={16} />;
    case 'flag':
      return <Flag size={16} />;
    case 'public':
      return <Globe size={16} />;
    default:
      return <Flag size={16} />;
  }
}

function getMilestoneColorClass(status: Milestone['status']) {
  if (status === 'completed') return 'text-accent-green';
  if (status === 'in-progress') return 'text-accent-blue';
  return 'text-content-text-tertiary';
}

function getActivityDotClass(type: ActivityItem['type']) {
  if (type === 'system') return 'bg-accent-green ring-4 ring-accent-green-light';
  if (type === 'comment') return 'bg-accent-yellow ring-4 ring-accent-yellow-light';
  return 'bg-accent-blue ring-4 ring-accent-blue-light';
}

function getProjectHealthClass(score: number) {
  if (score >= 80) return 'bg-accent-green';
  if (score >= 60) return 'bg-accent-yellow';
  return 'bg-content-text-secondary';
}

export function DashboardPage() {
  const { currentUser } = useAppStore();
  const { data: projectsData, isLoading } = useProjectList({
    filters: { status: ['active'] },
    pageSize: 100,
  });
  const projects = projectsData?.data ?? [];

  const userName = currentUser?.displayName || currentUser?.username || 'User';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-content-bg p-8">
        <div className="flex flex-col items-center gap-3 text-content-text-secondary">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-content-border border-t-accent-blue" />
          <span className="text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 flex-1 overflow-y-auto bg-content-bg p-8">
      <div className="mx-auto w-full max-w-7xl">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="m-0 text-2xl font-semibold text-content-text">
              {greeting}, {userName}
            </h3>
            <p className="mt-2 text-sm text-content-text-secondary">
              AI has identified 3 risk points in your current sprint.
            </p>
          </div>
          <div className="flex gap-3">
            <Card className="flex items-center gap-3 border-content-border bg-content-bg px-4 py-3">
              <CheckCircle size={18} className="text-accent-green" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-content-text-secondary">
                  Systems
                </span>
                <span className="text-sm font-semibold text-content-text">Operational</span>
              </div>
            </Card>
            <Card className="flex items-center gap-3 border-content-border bg-content-bg px-4 py-3">
              <Zap size={18} className="text-accent-blue" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-content-text-secondary">
                  Velocity
                </span>
                <span className="text-sm font-semibold text-content-text">84 pts/wk</span>
              </div>
            </Card>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <Card className="overflow-hidden border-content-border bg-content-bg">
              <div className="flex items-center justify-between border-b border-content-border px-6 py-4">
                <h4 className="m-0 flex items-center gap-2 text-sm font-semibold text-content-text">
                  <Clock size={16} className="text-accent-blue" />
                  Engineering Roadmap - Q4 2024
                </h4>
                <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wide text-content-text-tertiary">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-accent-green" />
                    Completed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-accent-blue" />
                    In Progress
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto px-6 py-6">
                <div className="relative min-w-[620px]">
                  <div className="absolute left-8 right-8 top-1/2 h-px -translate-y-1/2 bg-content-border" />
                  <div className="relative z-10 flex items-start justify-between">
                    {milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className={`flex flex-col items-center gap-1 text-center ${
                          milestone.status === 'upcoming' ? 'opacity-60' : ''
                        }`}
                      >
                        <span className={getMilestoneColorClass(milestone.status)}>{getMilestoneIcon(milestone.icon)}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-content-text-tertiary">
                          {milestone.date}
                        </span>
                        <span className="max-w-24 text-[11px] font-semibold text-content-text-secondary">
                          {milestone.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card className="border-content-border bg-content-bg p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-md bg-accent-green-light p-2 text-accent-green">
                    <Activity size={18} />
                  </div>
                  <span className="rounded-full bg-accent-green-light px-2 py-0.5 text-xs font-medium text-accent-green">+0.2%</span>
                </div>
                <p className="m-0 text-sm text-content-text-secondary">System Health</p>
                <h4 className="mt-1 text-2xl font-semibold text-content-text">99.9%</h4>
              </Card>

              <Card className="border-content-border bg-content-bg p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-md bg-accent-blue-light p-2 text-accent-blue">
                    <Rocket size={18} />
                  </div>
                  <span className="rounded-full bg-accent-blue-light px-2 py-0.5 text-xs font-medium text-accent-blue">+4.1%</span>
                </div>
                <p className="m-0 text-sm text-content-text-secondary">Delivery Velocity</p>
                <h4 className="mt-1 text-2xl font-semibold text-content-text">84 pts/wk</h4>
              </Card>

              <Card className="border-content-border bg-content-bg p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-md bg-content-bg-secondary p-2 text-content-text-secondary">
                    <Kanban size={18} />
                  </div>
                  <span className="rounded-full bg-content-bg-secondary px-2 py-0.5 text-xs font-medium text-content-text-secondary">5 Active</span>
                </div>
                <p className="m-0 text-sm text-content-text-secondary">Project Throughput</p>
                <h4 className="mt-1 text-2xl font-semibold text-content-text">37 tasks</h4>
              </Card>
            </section>

            <Card className="overflow-hidden border-content-border bg-content-bg">
              <div className="flex items-center justify-between border-b border-content-border px-6 py-4">
                <h4 className="m-0 text-sm font-semibold text-content-text">Active Projects Overview</h4>
                <Link
                  to="/app/projects"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent-blue no-underline hover:underline"
                >
                  View All <ChevronRight size={14} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-content-bg-secondary text-content-text-secondary">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-wide">Project Name</th>
                      <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-wide">Health Score</th>
                      <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-wide">Phase</th>
                      <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="border-t border-content-border">
                    {projects.length > 0 ? (
                      projects.slice(0, 5).map((project) => {
                        const health = project.healthScore || 85;
                        return (
                          <tr key={project.id} className="border-b border-content-border">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-blue/10 text-xs font-semibold text-accent-blue">
                                  {project.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-medium text-content-text">{project.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-content-bg-secondary">
                                  <div
                                    className={`h-full ${getProjectHealthClass(health)}`}
                                    style={{ width: `${health}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-content-text">{health}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="rounded-full bg-accent-blue/10 px-2 py-0.5 text-[11px] font-semibold text-accent-blue">
                                {project.status?.toUpperCase() || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="rounded p-1 text-content-text-tertiary hover:bg-content-bg-secondary" type="button">
                                <MoreHorizontal size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-content-text-secondary">
                          No active projects found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <section>
              <h4 className="mb-3 pl-1 text-sm font-semibold text-content-text">AI Insights & Suggestions</h4>
              <div className="grid gap-3">
                {aiInsights.map((insight) => (
                  <Card key={insight.id} className="flex gap-3 border-content-border bg-content-bg p-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                        insight.type === 'suggestion'
                          ? 'bg-accent-blue/10 text-accent-blue'
                          : 'bg-accent-red-light text-accent-red'
                      }`}
                    >
                      {insight.type === 'suggestion' ? <Lightbulb size={18} /> : <AlertTriangle size={18} />}
                    </div>
                    <div className="flex-1">
                      <h5 className="m-0 text-sm font-semibold text-content-text">{insight.title}</h5>
                      <p className="my-2 text-xs leading-5 text-content-text-secondary">{insight.description}</p>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 px-3 text-[10px] uppercase tracking-wide" variant="default">
                          {insight.type === 'suggestion' ? 'Review Tasks' : 'Adjust Schedule'}
                        </Button>
                        <Button size="sm" className="h-7 px-3 text-[10px] uppercase tracking-wide" variant="secondary">
                          {insight.type === 'suggestion' ? 'Dismiss' : 'Root Cause'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4">
            <Card className="flex h-full flex-col overflow-hidden border-content-border bg-content-bg">
              <div className="flex items-center justify-between border-b border-content-border px-6 py-4">
                <h4 className="m-0 text-sm font-semibold text-content-text">Activity Feed</h4>
                <History size={16} className="text-content-text-tertiary" />
              </div>

              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="relative pl-6">
                    <span className={`absolute left-0 top-1 h-2 w-2 rounded-full ${getActivityDotClass(activity.type)}`} />
                    {index < activities.length - 1 ? (
                      <span className="absolute left-[3px] top-4 h-[calc(100%+18px)] w-px bg-content-border" />
                    ) : null}

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-content-text">{activity.user}</span>
                        <span className="text-[10px] text-content-text-tertiary">{activity.time}</span>
                      </div>

                      <p className="m-0 text-xs text-content-text-secondary">
                        {activity.content}
                        {activity.branch ? <span className="font-medium text-accent-blue"> {activity.branch}</span> : null}
                        {activity.project && !activity.branch ? <span className="font-medium text-content-text"> {activity.project}</span> : null}
                      </p>

                      {activity.type === 'commit' ? (
                        <div className="mt-2 rounded-md border border-content-border bg-content-bg-secondary px-2 py-1.5 font-mono text-[10px] text-content-text-secondary">
                          <span>commit feat: add oauth2 logic</span>
                        </div>
                      ) : null}

                      {activity.type === 'ai' ? (
                        <button type="button" className="mt-2 w-fit text-[10px] font-semibold uppercase tracking-wide text-accent-blue">
                          Download PDF
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-content-bg-secondary px-6 py-3 text-center">
                <button
                  type="button"
                  className="text-[10px] font-semibold uppercase tracking-[0.1em] text-content-text-secondary hover:text-content-text"
                >
                  Show more activity
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
