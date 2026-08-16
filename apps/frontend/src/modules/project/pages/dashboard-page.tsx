/**
 * DashboardPage - 全局仪表盘页面
 * 参考: refers/APM/src/app/pages/DashboardPage.tsx
 * 按照 Figma 设计实现
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Bot, DollarSign, Bug, CheckSquare, Activity, AlertTriangle,
  TrendingUp, TrendingDown, ArrowUpRight, Sparkles, GitBranch,
  Target, Shield, LayoutDashboard
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type DialogType = 'team' | 'ai' | 'cost' | 'bugs' | 'tasks' | 'health' | 'risks' | null;

// ─── Mock Data ─────────────────────────────────────────────────────────────
const TEAM_MEMBERS = [
  { id: 'u1', name: 'Alex Chen', initials: 'AC', role: 'Tech Lead', color: '#7C3AED' },
  { id: 'u2', name: 'Sarah Kim', initials: 'SK', role: 'Frontend Dev', color: '#2563EB' },
  { id: 'u3', name: 'Mike Johnson', initials: 'MJ', role: 'Backend Dev', color: '#059669' },
  { id: 'u4', name: 'Emily Zhang', initials: 'EZ', role: 'QA Engineer', color: '#D97706' },
  { id: 'u5', name: 'Tom Wilson', initials: 'TW', role: 'DevOps', color: '#DC2626' },
];

const TASKS = [
  { id: 'APM-1', status: 'done', priority: 'high', labels: [{ name: 'Feature' }, { name: 'Frontend' }] },
  { id: 'APM-2', status: 'in_review', priority: 'high', labels: [{ name: 'Feature' }, { name: 'Frontend' }] },
  { id: 'APM-3', status: 'done', priority: 'high', labels: [{ name: 'Backend' }] },
  { id: 'APM-4', status: 'in_progress', priority: 'medium', labels: [{ name: 'Backend' }, { name: 'AI' }] },
  { id: 'APM-5', status: 'in_progress', priority: 'high', labels: [{ name: 'Backend' }, { name: 'Feature' }] },
  { id: 'APM-6', status: 'todo', priority: 'urgent', labels: [{ name: 'Bug' }] },
];

const allBugs = TASKS.filter(task =>
  task.labels.some(label => label.name.toLowerCase().includes('bug')) ||
  task.id.toLowerCase().includes('bug') ||
  task.priority === 'urgent'
);

const PROJECTS = [
  { id: 'p1', name: 'AgentPM Platform', healthScore: 87, healthStatus: 'on_track' as const },
  { id: 'p2', name: 'AI Code Reviewer', healthScore: 62, healthStatus: 'at_risk' as const },
  { id: 'p3', name: 'Data Pipeline v2', healthScore: 34, healthStatus: 'off_track' as const },
];

const AI_CONVERSATIONS = [
  { id: 'c1', title: 'Sprint planning assistance' },
  { id: 'c2', title: 'Code review: auth module' },
  { id: 'c3', title: 'Weekly report generation' },
];

const productivityData = [
  { date: 'Mar 1', tasks: 12, velocity: 18, quality: 85 },
  { date: 'Mar 5', tasks: 15, velocity: 22, quality: 88 },
  { date: 'Mar 9', tasks: 18, velocity: 25, quality: 82 },
  { date: 'Mar 13', tasks: 14, velocity: 19, quality: 90 },
  { date: 'Mar 17', tasks: 20, velocity: 28, quality: 87 },
  { date: 'Mar 21', tasks: 22, velocity: 31, quality: 91 },
];

const healthTrendData = [
  { week: 'W1', score: 72 },
  { week: 'W2', score: 75 },
  { week: 'W3', score: 78 },
  { week: 'W4', score: 82 },
  { week: 'W5', score: 85 },
  { week: 'W6', score: 87 },
];

const teamRadarData = [
  { metric: 'Velocity', value: 85 },
  { metric: 'Quality', value: 90 },
  { metric: 'Collaboration', value: 78 },
  { metric: 'Innovation', value: 72 },
  { metric: 'Delivery', value: 88 },
  { metric: 'Learning', value: 75 },
];

// ─── InfoCard Component ───────────────────────────────────────────────────────
interface InfoCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

function InfoCard({
  title, value, subtitle, icon: Icon, trend, trendValue,
  color, bgColor, onClick,
}: InfoCardProps) {
  return (
    <Card
      className="cursor-pointer hover:ring-2 hover:ring-ring/30 hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', bgColor)}>
            <Icon className={cn('w-5 h-5', color)} />
          </div>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-semibold text-foreground mb-0.5">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-1 text-xs mt-2 font-medium',
              trend === 'up' ? 'text-emerald-600' : 'text-red-500',
            )}>
              {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Detail Dialogs ─────────────────────────────────────────────────────────

function TeamDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const memberActivity = TEAM_MEMBERS.map((m, i) => ({
    ...m,
    activeTasks: [3, 5, 2, 4, 3][i],
    completedThisWeek: [8, 12, 6, 9, 7][i],
  }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Overview
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Members</p>
              <p className="text-2xl font-semibold mt-1">{TEAM_MEMBERS.length}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Active Tasks</p>
              <p className="text-2xl font-semibold mt-1">17</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Avg Load</p>
              <p className="text-2xl font-semibold mt-1">68%</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Member Activity</p>
            {memberActivity.map(member => (
              <div key={member.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium">{member.activeTasks} active</p>
                  <p className="text-xs text-muted-foreground">{member.completedThisWeek} done</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AIDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Usage Analytics
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-3 border border-violet-200 dark:border-violet-900">
              <p className="text-xs text-muted-foreground">Total Conversations</p>
              <p className="text-2xl font-semibold mt-1 text-violet-600">{AI_CONVERSATIONS.length}</p>
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +18 this week
              </p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-3 border border-violet-200 dark:border-violet-900">
              <p className="text-xs text-muted-foreground">Tokens Used</p>
              <p className="text-2xl font-semibold mt-1 text-violet-600">236K</p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Top AI Activities</p>
            {[
              { activity: 'Code review assistance', count: 28 },
              { activity: 'Bug analysis', count: 15 },
              { activity: 'Documentation generation', count: 12 },
              { activity: 'Task breakdown', count: 12 },
            ].map(item => (
              <div key={item.activity} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.activity}</span>
                <Badge variant="secondary" className="text-xs">{item.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CostDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Cost Overview
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total (Q1)</p>
              <p className="text-2xl font-semibold mt-1">$3,830</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-2xl font-semibold mt-1">$2,310</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">vs Budget</p>
              <p className="text-2xl font-semibold mt-1 text-emerald-600">-8%</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Cost Categories</p>
            {[
              { name: 'Infrastructure', amount: 3830, percentage: 58, color: 'bg-blue-500' },
              { name: 'AI Services', amount: 1650, percentage: 25, color: 'bg-violet-500' },
              { name: 'Tools & SaaS', amount: 950, percentage: 14, color: 'bg-emerald-500' },
              { name: 'Other', amount: 200, percentage: 3, color: 'bg-slate-400' },
            ].map(item => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full', item.color)} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${item.amount}</span>
                    <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                  </div>
                </div>
                <Progress value={item.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BugsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const criticalBugs = allBugs.filter(b => b.priority === 'urgent').length;
  const openBugs = allBugs.filter(b => !['done', 'canceled'].includes(b.status)).length;
  const resolvedBugs = allBugs.filter(b => b.status === 'done').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Bug Analytics
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-900">
              <p className="text-xs text-muted-foreground">Critical</p>
              <p className="text-2xl font-semibold mt-1 text-red-600">{criticalBugs}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-2xl font-semibold mt-1 text-blue-600">{openBugs}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-900">
              <p className="text-xs text-muted-foreground">Resolved</p>
              <p className="text-2xl font-semibold mt-1 text-emerald-600">{resolvedBugs}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent Critical Bugs</p>
            {TASKS
              .filter(b => b.priority === 'urgent')
              .slice(0, 3)
              .map(bug => (
                <div key={bug.id} className="p-3 border border-red-200 dark:border-red-900 rounded-lg bg-red-50/50 dark:bg-red-950/10">
                  <div className="flex items-start gap-2">
                    <Bug className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{bug.id}: Fix authentication token refresh race condition</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bug.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TasksDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const todoCount = TASKS.filter(t => t.status === 'todo').length;
  const inProgressCount = TASKS.filter(t => t.status === 'in_progress').length;
  const inReviewCount = TASKS.filter(t => t.status === 'in_review').length;
  const doneCount = TASKS.filter(t => t.status === 'done').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Task Analytics
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: 'Done', value: doneCount, color: '#10b981' },
              { name: 'In Progress', value: inProgressCount, color: '#3b82f6' },
              { name: 'In Review', value: inReviewCount, color: '#f59e0b' },
              { name: 'Todo', value: todoCount, color: '#6b7280' },
            ].map(status => (
              <div key={status.name} className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{status.name}</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: status.color }}>{status.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Task Breakdown by Priority</p>
            {[
              { priority: 'Urgent', count: TASKS.filter(t => t.priority === 'urgent').length, color: 'text-red-600' },
              { priority: 'High', count: TASKS.filter(t => t.priority === 'high').length, color: 'text-orange-600' },
              { priority: 'Medium', count: TASKS.filter(t => t.priority === 'medium').length, color: 'text-amber-600' },
              { priority: 'Low', count: TASKS.filter(t => t.priority === 'low').length, color: 'text-slate-600' },
            ].map(item => (
              <div key={item.priority} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.priority}</span>
                <Badge variant="secondary" className={cn('text-xs', item.color)}>{item.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HealthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const avgHealth = Math.round(PROJECTS.reduce((s, p) => s + p.healthScore, 0) / PROJECTS.length);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Health Score Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="52" fill="none" stroke="var(--border)" strokeWidth="12" />
                <circle
                  cx="64" cy="64" r="52" fill="none"
                  stroke={avgHealth >= 80 ? '#10b981' : avgHealth >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeDasharray={`${(avgHealth / 100) * 327} 327`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{avgHealth}</span>
                <span className="text-xs text-muted-foreground">Overall</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm">Healthy (80+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm">At Risk (60-79)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Critical (&lt;60)</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Project Health Scores</p>
            {PROJECTS.map(p => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className={cn(
                    'font-semibold',
                    p.healthStatus === 'on_track' ? 'text-emerald-600' :
                    p.healthStatus === 'at_risk' ? 'text-amber-600' : 'text-red-600'
                  )}>{p.healthScore}</span>
                </div>
                <Progress value={p.healthScore} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RisksDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const risks = [
    {
      id: 1,
      title: 'Sprint velocity declining',
      severity: 'high',
      impact: 'May miss Q2 deliverables',
      mitigation: 'Rebalance team workload, remove blockers',
    },
    {
      id: 2,
      title: '2 critical bugs unresolved',
      severity: 'critical',
      impact: 'Production stability at risk',
      mitigation: 'Prioritize bug fixes in current sprint',
    },
    {
      id: 3,
      title: 'AI cost trending above budget',
      severity: 'medium',
      impact: 'Q2 budget may be exceeded by 15%',
      mitigation: 'Optimize API usage, implement caching',
    },
    {
      id: 4,
      title: 'Code coverage below target',
      severity: 'medium',
      impact: 'Quality risks in new features',
      mitigation: 'Enforce test coverage requirements',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900';
      default: return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-900';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Risk Assessment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-900">
              <p className="text-xs text-muted-foreground">Critical</p>
              <p className="text-2xl font-semibold mt-1 text-red-600">1</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-900">
              <p className="text-xs text-muted-foreground">High</p>
              <p className="text-2xl font-semibold mt-1 text-orange-600">1</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-900">
              <p className="text-xs text-muted-foreground">Medium</p>
              <p className="text-2xl font-semibold mt-1 text-amber-600">2</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Identified Risks</p>
            {risks.map(risk => (
              <div key={risk.id} className={cn('p-3 rounded-lg border', getSeverityColor(risk.severity))}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium flex-1">{risk.title}</p>
                  <Badge variant="outline" className="text-xs capitalize ml-2">{risk.severity}</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
                    <p><span className="font-medium">Impact:</span> {risk.impact}</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Shield className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
                    <p><span className="font-medium">Mitigation:</span> {risk.mitigation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium mb-1.5">Risk Management Status</p>
            <Progress value={65} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              65% of identified risks have active mitigation plans
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState<DialogType>(null);

  const totalMembers = TEAM_MEMBERS.length;
  const aiConversations = AI_CONVERSATIONS.length;
  const totalCost = 2310;
  const criticalBugs = allBugs.filter(b => b.priority === 'urgent').length;
  const openBugs = allBugs.filter(b => !['done', 'canceled'].includes(b.status)).length;
  const activeTasks = TASKS.filter(t => ['todo', 'in_progress', 'in_review'].includes(t.status)).length;
  const avgHealth = Math.round(PROJECTS.reduce((s, p) => s + p.healthScore, 0) / PROJECTS.length);
  const activeRisks = 4;

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <PageHeader
        title="Dashboard"
        description="Overview of all projects and activities"
        icon={LayoutDashboard}
        iconColor="text-accent-blue"
      />

      <div className="p-6 space-y-5 w-full">
        {/* Info Cards Grid - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard
            title="Team Members"
            value={totalMembers}
            subtitle="Active contributors"
            icon={Users}
            trend="up"
            trendValue="+2 this month"
            color="text-blue-600"
            bgColor="bg-blue-100 dark:bg-blue-950/30"
            onClick={() => setOpenDialog('team')}
          />
          <InfoCard
            title="AI Activity"
            value={aiConversations}
            subtitle="Conversations this month"
            icon={Bot}
            trend="up"
            trendValue="+18 this week"
            color="text-violet-600"
            bgColor="bg-violet-100 dark:bg-violet-950/30"
            onClick={() => setOpenDialog('ai')}
          />
          <InfoCard
            title="Monthly Cost"
            value={`$${totalCost.toLocaleString()}`}
            subtitle="8% under budget"
            icon={DollarSign}
            trend="down"
            trendValue="-$180 vs last month"
            color="text-emerald-600"
            bgColor="bg-emerald-100 dark:bg-emerald-950/30"
            onClick={() => setOpenDialog('cost')}
          />
          <InfoCard
            title="Critical Bugs"
            value={criticalBugs}
            subtitle={`${openBugs} total open`}
            icon={Bug}
            color="text-red-600"
            bgColor="bg-red-100 dark:bg-red-950/30"
            onClick={() => setOpenDialog('bugs')}
          />
        </div>

        {/* Info Cards Grid - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard
            title="Active Tasks"
            value={activeTasks}
            subtitle={`${TASKS.length} total tasks`}
            icon={CheckSquare}
            trend="up"
            trendValue="+12 this week"
            color="text-blue-600"
            bgColor="bg-blue-100 dark:bg-blue-950/30"
            onClick={() => setOpenDialog('tasks')}
          />
          <InfoCard
            title="Health Score"
            value={avgHealth}
            subtitle="Overall project health"
            icon={Activity}
            trend="up"
            trendValue="+5 pts this week"
            color="text-emerald-600"
            bgColor="bg-emerald-100 dark:bg-emerald-950/30"
            onClick={() => setOpenDialog('health')}
          />
          <InfoCard
            title="Active Risks"
            value={activeRisks}
            subtitle="Require attention"
            icon={AlertTriangle}
            color="text-amber-600"
            bgColor="bg-amber-100 dark:bg-amber-950/30"
            onClick={() => setOpenDialog('risks')}
          />
        </div>

        {/* Charts Section - Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Team Productivity Trend */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium">Team Productivity</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tasks, velocity & quality metrics</p>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="space-y-2">
                {productivityData.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-16">{item.date}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item.tasks / 25) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{item.tasks}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Tasks</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Velocity</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  <span className="text-muted-foreground">Quality</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Score Trend */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium">Health Score Trend</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Overall project health over time</p>
                </div>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-end justify-between h-40 gap-2">
                {healthTrendData.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs font-semibold">{item.score}</span>
                      <div className="w-full bg-emerald-500/20 rounded-t-sm" style={{ height: `${item.score * 1.5}px` }}>
                        <div 
                          className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm"
                          style={{ height: `${item.score * 1.5}px` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{item.week}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section - Row 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Team Performance Radar */}
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium">Team Performance</p>
                  <p className="text-xs text-muted-foreground mt-0.5">6 key metrics</p>
                </div>
                <Target className="w-4 h-4 text-violet-500" />
              </div>
              <div className="space-y-2">
                {teamRadarData.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24">{item.metric}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Cost */}
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium">Cost Overview</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Last 30 days spending</p>
                </div>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Infrastructure', amount: 3830, percentage: 58, color: 'bg-blue-500' },
                  { name: 'AI Services', amount: 1650, percentage: 25, color: 'bg-violet-500' },
                  { name: 'Tools & SaaS', amount: 950, percentage: 14, color: 'bg-emerald-500' },
                ].map(item => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2.5 h-2.5 rounded-full', item.color)} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${item.amount}</span>
                        <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                      </div>
                    </div>
                    <Progress value={item.percentage} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto py-3 flex-col gap-2" onClick={() => navigate('/app/tasks')}>
                <CheckSquare className="w-5 h-5" />
                <span className="text-xs">View Tasks</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-2" onClick={() => navigate('/app/bugs')}>
                <Bug className="w-5 h-5" />
                <span className="text-xs">View Bugs</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-2" onClick={() => navigate('/app/ai')}>
                <Sparkles className="w-5 h-5" />
                <span className="text-xs">AI Hub</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-2" onClick={() => navigate('/app/repositories')}>
                <GitBranch className="w-5 h-5" />
                <span className="text-xs">Repositories</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <TeamDialog open={openDialog === 'team'} onClose={() => setOpenDialog(null)} />
      <AIDialog open={openDialog === 'ai'} onClose={() => setOpenDialog(null)} />
      <CostDialog open={openDialog === 'cost'} onClose={() => setOpenDialog(null)} />
      <BugsDialog open={openDialog === 'bugs'} onClose={() => setOpenDialog(null)} />
      <TasksDialog open={openDialog === 'tasks'} onClose={() => setOpenDialog(null)} />
      <HealthDialog open={openDialog === 'health'} onClose={() => setOpenDialog(null)} />
      <RisksDialog open={openDialog === 'risks'} onClose={() => setOpenDialog(null)} />
    </div>
  );
}
