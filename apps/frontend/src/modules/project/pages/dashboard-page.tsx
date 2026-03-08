import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProjectList } from '../hooks/use-project-list';
import { useTheme } from '@/shared/theme/theme-context';
import { useAppStore } from '@/infrastructure/store/app-store';
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

export function DashboardPage() {
  const { theme, mode } = useTheme();
  const { colors, typography, spacing, radii } = theme;
  const { currentUser } = useAppStore();

  const { data: projectsData, isLoading } = useProjectList({ status: 'active', pageSize: 100 });
  const projects = projectsData?.data ?? [];

  const userName = currentUser?.displayName || currentUser?.username || 'User';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const isDark = mode === 'dark';

  if (isLoading) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing['2xl'] * 2,
          backgroundColor: colors.content.bg,
          minHeight: '50vh',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing.md,
            color: colors.content.textSecondary,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: `2px solid ${colors.content.border}`,
              borderTopColor: colors.accent.blue,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: typography.fontSize.sm }}>Loading dashboard...</span>
        </div>
      </div>
    );
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
        "Based on recent git commits, I suggest creating 3 refactoring tasks for the authentication module.",
    },
    {
      id: '2',
      type: 'warning',
      title: 'Delivery Risk Warning',
      description:
        "Velocity has dropped by 12% in 'Nebula Cloud'. Estimated 3-day delay for Milestone 2 at current rate.",
    },
  ];

  const getMilestoneIcon = (icon: Milestone['icon']) => {
    switch (icon) {
      case 'rocket':
        return <Rocket size={18} />;
      case 'settings':
        return <Settings size={18} />;
      case 'shield':
        return <Shield size={18} />;
      case 'flag':
        return <Flag size={18} />;
      case 'public':
        return <Globe size={18} />;
      default:
        return <Flag size={18} />;
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'commit':
        return (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: colors.accent.blue,
              boxShadow: `0 0 0 4px ${colors.accent.blue}20`,
            }}
          />
        );
      case 'system':
        return (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: colors.accent.green,
              boxShadow: `0 0 0 4px ${colors.accent.green}20`,
            }}
          />
        );
      case 'comment':
        return (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: colors.accent.yellow,
              boxShadow: `0 0 0 4px ${colors.accent.yellow}20`,
            }}
          />
        );
      case 'ai':
        return (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: colors.accent.blue,
              boxShadow: `0 0 0 4px ${colors.accent.blue}20`,
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: spacing['2xl'] * 2,
        backgroundColor: colors.content.bg,
      }}
    >
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Top Section: Welcome & Stats */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: spacing['2xl'] * 2,
            flexWrap: 'wrap',
            gap: spacing.lg,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.semibold,
                margin: 0,
                color: colors.content.text,
              }}
            >
              {greeting}, {userName}
            </h3>
            <p
              style={{
                margin: `${spacing.sm}px 0 0`,
                color: colors.content.textSecondary,
                fontSize: typography.fontSize.sm,
              }}
            >
              AI has identified 3 risk points in your current sprint.
            </p>
          </div>
          <div style={{ display: 'flex', gap: spacing.md }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderRadius: radii.lg,
                border: `1px solid ${colors.content.border}`,
                backgroundColor: colors.content.bg,
              }}
            >
              <CheckCircle size={18} color={colors.accent.green} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: colors.content.textSecondary,
                    fontWeight: typography.fontWeight.semibold,
                  }}
                >
                  Systems
                </span>
                <span
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    lineHeight: 1,
                  }}
                >
                  Operational
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderRadius: radii.lg,
                border: `1px solid ${colors.content.border}`,
                backgroundColor: colors.content.bg,
              }}
            >
              <Zap size={18} color={colors.accent.blue} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: colors.content.textSecondary,
                    fontWeight: typography.fontWeight.semibold,
                  }}
                >
                  Velocity
                </span>
                <span
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    lineHeight: 1,
                  }}
                >
                  84 pts/wk
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: spacing.lg * 1.5 }}>
          {/* Left Column */}
          <div style={{ gridColumn: 'span 8' }}>
            {/* Project Milestone Timeline */}
            <div
              style={{
                borderRadius: radii.lg,
                border: `1px solid ${colors.content.border}`,
                backgroundColor: colors.content.bg,
                marginBottom: spacing.lg * 1.5,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: `${spacing.lg}px ${spacing.lg}px`,
                  borderBottom: `1px solid ${colors.content.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h4
                  style={{
                    fontSize: '12px',
                    fontWeight: typography.fontWeight.semibold,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    margin: 0,
                    color: colors.content.text,
                  }}
                >
                  <Clock size={18} color={colors.accent.blue} />
                  Engineering Roadmap - Q4 2024
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      fontSize: '10px',
                      fontWeight: typography.fontWeight.semibold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: colors.content.textTertiary,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: colors.accent.green,
                        }}
                      />
                      Completed
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: colors.accent.blue,
                        }}
                      />
                      In Progress
                    </div>
                  </div>
                </div>
              </div>
              <div
              style={{
                position: 'relative',
                padding: `${spacing.lg}px 0`,
                minWidth: 600,
                overflowX: 'auto',
              }}
            >
              {/* Timeline line */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 60,
                  right: 60,
                  height: 2,
                  backgroundColor: colors.content.border,
                  transform: 'translateY(-50%)',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: `0 ${spacing['3xl']}px`,
                  position: 'relative',
                }}
              >
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      opacity: milestone.status === 'upcoming' ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginTop: -16,
                      }}
                    >
                      <span
                        style={{
                          color:
                            milestone.status === 'completed'
                              ? colors.accent.green
                              : milestone.status === 'in-progress'
                              ? colors.accent.blue
                              : colors.content.textTertiary,
                          marginBottom: spacing.xs,
                        }}
                      >
                        {getMilestoneIcon(milestone.icon)}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          color: colors.content.textTertiary,
                          fontWeight: typography.fontWeight.semibold,
                          textTransform: 'uppercase',
                          marginBottom: 2,
                        }}
                      >
                        {milestone.date}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: typography.fontWeight.semibold,
                          color:
                            milestone.status === 'upcoming'
                              ? colors.content.textSecondary
                              : colors.accent.blue,
                          textAlign: 'center',
                        }}
                      >
                        {milestone.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Stat Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: spacing.md,
                marginBottom: spacing.lg * 1.5,
              }}
            >
              <div
                style={{
                  padding: spacing.lg - 4,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.content.border}`,
                  backgroundColor: colors.content.bg,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                  <div
                    style={{
                      padding: spacing.sm,
                      borderRadius: radii.md,
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.accent.greenLight,
                      color: colors.accent.green,
                    }}
                  >
                    <Activity size={20} />
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: typography.fontWeight.medium,
                      color: colors.accent.green,
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : colors.accent.greenLight,
                      padding: `2px ${spacing.sm}px`,
                      borderRadius: 999,
                    }}
                  >
                    +0.2%
                  </span>
                </div>
                <p
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.content.textSecondary,
                    fontWeight: typography.fontWeight.medium,
                    margin: 0,
                  }}
                >
                  System Health
                </p>
                <h4
                  style={{
                    fontSize: typography.fontSize['2xl'],
                    fontWeight: typography.fontWeight.semibold,
                    margin: `${spacing.xs}px 0 0`,
                    color: colors.content.text,
                  }}
                >
                  99.9%
                </h4>
              </div>
              <div
                style={{
                  padding: spacing.lg - 4,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.content.border}`,
                  backgroundColor: colors.content.bg,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                  <div
                    style={{
                      padding: spacing.sm,
                      borderRadius: radii.md,
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.accent.blueLight,
                      color: colors.accent.blue,
                    }}
                  >
                    <Rocket size={20} />
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: typography.fontWeight.medium,
                      color: colors.accent.blue,
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : colors.accent.blueLight,
                      padding: `2px ${spacing.sm}px`,
                      borderRadius: 999,
                    }}
                  >
                    Stable
                  </span>
                </div>
                <p
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.content.textSecondary,
                    fontWeight: typography.fontWeight.medium,
                    margin: 0,
                  }}
                >
                  CI/CD Status
                </p>
                <h4
                  style={{
                    fontSize: typography.fontSize['2xl'],
                    fontWeight: typography.fontWeight.semibold,
                    margin: `${spacing.xs}px 0 0`,
                    color: colors.content.text,
                  }}
                >
                  Passing
                </h4>
              </div>
              <div
                style={{
                  padding: spacing.lg - 4,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.content.border}`,
                  backgroundColor: colors.content.bg,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                  <div
                    style={{
                      padding: spacing.sm,
                      borderRadius: radii.md,
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                      color: colors.accent.yellow,
                    }}
                  >
                    <Kanban size={20} />
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: typography.fontWeight.medium,
                      color: colors.accent.yellow,
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7',
                      padding: `2px ${spacing.sm}px`,
                      borderRadius: 999,
                    }}
                  >
                    +4 tasks
                  </span>
                </div>
                <p
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.content.textSecondary,
                    fontWeight: typography.fontWeight.medium,
                    margin: 0,
                  }}
                >
                  Active Sprint
                </p>
                <h4
                  style={{
                    fontSize: typography.fontSize['2xl'],
                    fontWeight: typography.fontWeight.semibold,
                    margin: `${spacing.xs}px 0 0`,
                    color: colors.content.text,
                  }}
                >
                  Sprint 14
                </h4>
              </div>
            </div>

            {/* Project Status Overview Table */}
            <div
              style={{
                borderRadius: radii.lg,
                border: `1px solid ${colors.content.border}`,
                backgroundColor: colors.content.bg,
                marginBottom: spacing.lg * 1.5,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: `${spacing.lg}px ${spacing.lg}px`,
                  borderBottom: `1px solid ${colors.content.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h4
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    margin: 0,
                    color: colors.content.text,
                  }}
                >
                  Active Projects Overview
                </h4>
                <Link
                  to="/app/projects"
                  style={{
                    fontSize: '12px',
                    fontWeight: typography.fontWeight.medium,
                    color: colors.accent.blue,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  View All <ChevronRight size={14} />
                </Link>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', fontSize: typography.fontSize.sm }}>
                  <thead
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.content.bgSecondary,
                      color: colors.content.textSecondary,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding: `${spacing.md}px ${spacing.lg}px`,
                          fontSize: '10px',
                          fontWeight: typography.fontWeight.semibold,
                          textTransform: 'uppercase',
                        }}
                      >
                        Project Name
                      </th>
                      <th
                        style={{
                          padding: `${spacing.md}px ${spacing.lg}px`,
                          fontSize: '10px',
                          fontWeight: typography.fontWeight.semibold,
                          textTransform: 'uppercase',
                        }}
                      >
                        Health Score
                      </th>
                      <th
                        style={{
                          padding: `${spacing.md}px ${spacing.lg}px`,
                          fontSize: '10px',
                          fontWeight: typography.fontWeight.semibold,
                          textTransform: 'uppercase',
                        }}
                      >
                        Phase
                      </th>
                      <th
                        style={{
                          padding: `${spacing.md}px ${spacing.lg}px`,
                          fontSize: '10px',
                          fontWeight: typography.fontWeight.semibold,
                          textTransform: 'uppercase',
                          textAlign: 'right',
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: `1px solid ${colors.content.border}` }}>
                    {projects.length > 0 ? (
                      projects.slice(0, 5).map((project) => (
                        <tr key={project.id} style={{ borderBottom: `1px solid ${colors.content.border}` }}>
                          <td style={{ padding: `${spacing.md}px ${spacing.lg}px` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: radii.md,
                                  backgroundColor: `${colors.accent.blue}15`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: colors.accent.blue,
                                  fontWeight: typography.fontWeight.semibold,
                                  fontSize: '12px',
                                }}
                              >
                                {project.name.substring(0, 2).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: typography.fontWeight.medium }}>{project.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: `${spacing.md}px ${spacing.lg}px` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                              <div
                                style={{
                                  width: 64,
                                  height: 6,
                                  borderRadius: 999,
                                  backgroundColor: colors.content.bgSecondary,
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${project.healthScore || 85}%`,
                                    height: '100%',
                                    backgroundColor:
                                      (project.healthScore || 85) >= 80
                                        ? colors.accent.green
                                        : (project.healthScore || 85) >= 60
                                        ? colors.accent.yellow
                                        : colors.content.textSecondary,
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: typography.fontWeight.semibold }}>
                                {project.healthScore || 85}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: `${spacing.md}px ${spacing.lg}px` }}>
                            <span
                              style={{
                                padding: `${spacing.xs}px ${spacing.sm}px`,
                                borderRadius: 999,
                                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                                color: colors.accent.blue,
                                fontSize: '11px',
                                fontWeight: typography.fontWeight.semibold,
                              }}
                            >
                              {project.status?.toUpperCase() || 'ACTIVE'}
                            </span>
                          </td>
                          <td style={{ padding: `${spacing.md}px ${spacing.lg}px`, textAlign: 'right' }}>
                            <button
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: colors.content.textTertiary,
                                cursor: 'pointer',
                                padding: spacing.xs,
                              }}
                            >
                              <MoreHorizontal size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: spacing['2xl'], textAlign: 'center', color: colors.content.textSecondary }}>
                          No active projects found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Recommendations */}
            <div>
              <h4
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  margin: `0 0 ${spacing.md}px`,
                  paddingLeft: spacing.xs,
                  color: colors.content.text,
                }}
              >
                AI Insights & Suggestions
              </h4>
              <div style={{ display: 'grid', gap: spacing.md }}>
                {aiInsights.map((insight) => (
                  <div
                    key={insight.id}
                    style={{
                      borderRadius: radii.lg,
                      border: `1px solid ${colors.content.border}`,
                      padding: spacing.lg,
                      display: 'flex',
                      gap: spacing.md,
                      backgroundColor: colors.content.bg,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radii.md,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        backgroundColor:
                          insight.type === 'suggestion'
                            ? `${colors.accent.blue}15`
                            : isDark
                            ? 'rgba(239, 68, 68, 0.15)'
                            : '#fef2f2',
                        color: insight.type === 'suggestion' ? colors.accent.blue : colors.content.textSecondary,
                      }}
                    >
                      {insight.type === 'suggestion' ? <Lightbulb size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h5
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          margin: 0,
                          color: colors.content.text,
                        }}
                      >
                        {insight.title}
                      </h5>
                      <p
                        style={{
                          fontSize: '12px',
                          color: colors.content.textSecondary,
                          margin: `${spacing.xs}px 0 ${spacing.md}px`,
                          lineHeight: 1.5,
                        }}
                      >
                        {insight.description}
                      </p>
                      <div style={{ display: 'flex', gap: spacing.sm }}>
                        <button
                          style={{
                            padding: `${spacing.xs}px ${spacing.md}px`,
                            borderRadius: radii.md,
                            border: 'none',
                            backgroundColor:
                              insight.type === 'suggestion' ? colors.accent.blue : colors.content.textSecondary,
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: typography.fontWeight.semibold,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                          }}
                        >
                          {insight.type === 'suggestion' ? 'Review Tasks' : 'Adjust Schedule'}
                        </button>
                        <button
                          style={{
                            padding: `${spacing.xs}px ${spacing.md}px`,
                            borderRadius: radii.md,
                            border: `1px solid ${colors.content.border}`,
                            backgroundColor: 'transparent',
                            color: colors.content.textSecondary,
                            fontSize: '10px',
                            fontWeight: typography.fontWeight.semibold,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                          }}
                        >
                          {insight.type === 'suggestion' ? 'Dismiss' : 'Root Cause'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Activity Feed */}
          <div style={{ gridColumn: 'span 4' }}>
            <div
              style={{
                borderRadius: radii.lg,
                border: `1px solid ${colors.content.border}`,
                backgroundColor: colors.content.bg,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: `${spacing.lg}px ${spacing.lg}px`,
                  borderBottom: `1px solid ${colors.content.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h4
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    margin: 0,
                    color: colors.content.text,
                  }}
                >
                  Activity Feed
                </h4>
                <History size={18} color={colors.content.textTertiary} />
              </div>
              <div
                style={{
                  padding: spacing.lg,
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.lg * 1.5,
                }}
              >
                {activities.map((activity, index) => (
                  <div key={activity.id} style={{ position: 'relative', paddingLeft: spacing.lg }}>
                    {/* Timeline dot */}
                    <div style={{ position: 'absolute', left: 0, top: 4 }}>{getActivityIcon(activity.type)}</div>
                    {/* Connector line */}
                    {index < activities.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '3.5px',
                          top: 16,
                          bottom: -spacing.lg * 1.5,
                          width: 1,
                          backgroundColor: colors.content.border,
                        }}
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <span style={{ fontSize: '12px', fontWeight: typography.fontWeight.semibold }}>
                          {activity.user}
                        </span>
                        <span style={{ fontSize: '10px', color: colors.content.textTertiary }}>{activity.time}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: colors.content.textSecondary, margin: 0 }}>
                        {activity.content}
                        {activity.branch && (
                          <span style={{ color: colors.accent.blue, fontWeight: typography.fontWeight.medium }}>
                            {' '}
                            {activity.branch}
                          </span>
                        )}
                        {activity.project && !activity.branch && (
                          <span style={{ fontWeight: typography.fontWeight.medium }}> {activity.project}</span>
                        )}
                      </p>
                      {activity.type === 'commit' && (
                        <div
                          style={{
                            marginTop: spacing.sm,
                            padding: spacing.sm,
                            borderRadius: radii.md,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.content.bgSecondary,
                            border: `1px solid ${colors.content.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: spacing.xs,
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              color: colors.content.textSecondary,
                            }}
                          >
                            <span style={{ fontFamily: 'monospace' }}>commit</span>
                            <span style={{ fontFamily: 'monospace' }}>feat: add oauth2 logic</span>
                          </div>
                        </div>
                      )}
                      {activity.type === 'ai' && (
                        <button
                          style={{
                            marginTop: spacing.sm,
                            fontSize: '10px',
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.accent.blue,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: 0,
                          }}
                        >
                          DOWNLOAD PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: spacing.md,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.content.bgSecondary,
                  textAlign: 'center',
                }}
              >
                <button
                  style={{
                    fontSize: '10px',
                    fontWeight: typography.fontWeight.semibold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.content.textSecondary,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                >
                  Show more activity
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
