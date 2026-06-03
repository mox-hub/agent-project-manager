/**
 * BugsPage - 全局 Bug 追踪页面
 * 参考: refers/APM/UPDATE_V23.md, UPDATE_V23.2.md
 * 按照 Figma 设计实现
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, LayoutList, LayoutGrid,
  Clock, Circle, Loader, CheckCircle2, XCircle,
  User, Bug, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { MOCK_TASKS, PROJECTS, type Task } from '../data/mock-data';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'board';
type GroupBy = 'status' | 'severity' | 'project';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: 'Todo', icon: Circle, color: 'text-slate-500' },
  in_progress: { label: 'In Progress', icon: Loader, color: 'text-blue-500' },
  in_review: { label: 'In Review', icon: Loader, color: 'text-amber-500' },
  done: { label: 'Done', icon: CheckCircle2, color: 'text-emerald-500' },
  canceled: { label: 'Canceled', icon: XCircle, color: 'text-slate-400' },
};

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; dotColor: string }> = {
  critical: { label: 'Critical', color: 'text-red-600', dotColor: 'bg-red-500' },
  high: { label: 'High', color: 'text-orange-600', dotColor: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-amber-600', dotColor: 'bg-amber-500' },
  low: { label: 'Low', color: 'text-slate-600', dotColor: 'bg-slate-400' },
};

// Map priority to severity for bugs
const getBugSeverity = (task: Task): Severity => {
  if (task.priority === 'urgent') return 'critical';
  if (task.priority === 'high') return 'high';
  if (task.priority === 'medium') return 'medium';
  return 'low';
};

// Filter only bug-related tasks
const isBug = (task: Task): boolean => {
  return task.labels.some((label) => label.name.toLowerCase().includes('bug')) ||
    task.title.toLowerCase().includes('bug') ||
    task.title.toLowerCase().includes('fix') ||
    task.title.toLowerCase().includes('error');
};

const BORDER_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#94a3b8',
};

export function BugsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Filter only bugs
  const allBugs = useMemo(() => {
    return MOCK_TASKS.filter(isBug);
  }, []);

  // Filter bugs
  const filteredBugs = useMemo(() => {
    return allBugs.filter((bug) => {
      if (search && !bug.title.toLowerCase().includes(search.toLowerCase()) &&
          !bug.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && bug.status !== statusFilter) {
        return false;
      }
      if (severityFilter !== 'all' && getBugSeverity(bug) !== severityFilter) {
        return false;
      }
      if (projectFilter !== 'all' && bug.projectId !== projectFilter) {
        return false;
      }
      return true;
    });
  }, [allBugs, search, statusFilter, severityFilter, projectFilter]);

  // Group bugs
  const groupedBugs = useMemo(() => {
    const groups: Record<string, Task[]> = {};

    filteredBugs.forEach((bug) => {
      let key: string;
      switch (groupBy) {
        case 'status':
          key = bug.status;
          break;
        case 'severity':
          key = getBugSeverity(bug);
          break;
        case 'project':
          key = bug.projectId;
          break;
        default:
          key = 'all';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(bug);
    });

    return groups;
  }, [filteredBugs, groupBy]);

  // Statistics
  const stats = useMemo(() => {
    const critical = filteredBugs.filter((b) => getBugSeverity(b) === 'critical').length;
    const open = filteredBugs.filter((b) => b.status !== 'done' && b.status !== 'canceled').length;
    const resolved = filteredBugs.filter((b) => b.status === 'done').length;
    return { critical, open, resolved };
  }, [filteredBugs]);

  const getProjectName = (projectId: string) => {
    return PROJECTS.find((p) => p.id === projectId)?.name || projectId;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <PageHeader
        title="All Bugs"
        description={`${filteredBugs.length} bugs • ${stats.critical} critical • ${stats.open} open • ${stats.resolved} resolved`}
        actions={
          <Button onClick={() => navigate('/app/projects')}>
            <Plus className="h-4 w-4 mr-2" />
            Report Bug
          </Button>
        }
      />

      {/* Stats Cards & Filters */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-6 w-full py-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4 max-w-2xl">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-medium text-red-600">Critical</span>
              </div>
              <p className="text-2xl font-semibold text-red-600">{stats.critical}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Loader className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">Open</span>
              </div>
              <p className="text-2xl font-semibold text-blue-600">{stats.open}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-600">Resolved</span>
              </div>
              <p className="text-2xl font-semibold text-emerald-600">{stats.resolved}</p>
            </div>
          </div>

          {/* Filters & Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bugs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Resolved</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>

            {/* Severity Filter */}
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as Severity | 'all')}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Project Filter */}
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {PROJECTS.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />

            {/* View Mode */}
            <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('board')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            {/* Group By */}
            {viewMode === 'board' && (
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">By Status</SelectItem>
                  <SelectItem value="severity">By Severity</SelectItem>
                  <SelectItem value="project">By Project</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="w-full">
          {viewMode === 'list' ? (
            <BugListView bugs={filteredBugs} getProjectName={getProjectName} />
          ) : (
            <BugBoardView
              groupedBugs={groupedBugs}
              groupBy={groupBy}
              getProjectName={getProjectName}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Bug List View Component
function BugListView({
  bugs,
  getProjectName,
}: {
  bugs: Task[];
  getProjectName: (id: string) => string;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[4px_auto_100px_1fr_140px_100px_120px_40px] gap-4 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
        <div></div>
        <div className="w-5"></div>
        <div>ID</div>
        <div>Bug</div>
        <div>Project</div>
        <div>Severity</div>
        <div>Labels</div>
        <div></div>
      </div>

      {/* Table Body */}
      {bugs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No bugs found
        </div>
      ) : (
        <div className="divide-y divide-border">
          {bugs.map((bug) => {
            const StatusIcon = STATUS_CONFIG[bug.status as TaskStatus].icon;
            const severity = getBugSeverity(bug);
            const severityConfig = SEVERITY_CONFIG[severity];

            return (
              <div
                key={bug.id}
                className="grid grid-cols-[4px_auto_100px_1fr_140px_100px_120px_40px] gap-4 px-4 py-2.5 hover:bg-accent/30 cursor-pointer transition-colors group items-center"
              >
                {/* Severity Indicator */}
                <div className={cn('w-1 h-8 rounded-full', severityConfig.dotColor)} />

                {/* Status Icon */}
                <div className="w-5 flex items-center justify-center">
                  <StatusIcon className={cn('h-3.5 w-3.5', STATUS_CONFIG[bug.status as TaskStatus].color)} />
                </div>

                {/* Identifier */}
                <span className="text-xs font-mono text-muted-foreground">
                  {bug.id}
                </span>

                {/* Title with Bug Icon */}
                <div className="min-w-0 flex items-center gap-2">
                  <Bug className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {bug.title}
                  </p>
                </div>

                {/* Project */}
                <Badge variant="outline" className="justify-center text-xs">
                  {getProjectName(bug.projectId)}
                </Badge>

                {/* Severity */}
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', severityConfig.dotColor)} />
                  <span className={cn('text-xs font-medium', severityConfig.color)}>
                    {severityConfig.label}
                  </span>
                </div>

                {/* Labels */}
                <div className="flex gap-1 overflow-hidden">
                  {bug.labels.length > 0 ? (
                    <>
                      {bug.labels.slice(0, 1).map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-sm font-medium truncate"
                          style={{
                            backgroundColor: label.color + '22',
                            color: label.color,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {bug.labels.length > 1 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{bug.labels.length - 1}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Assignee */}
                <div className="flex justify-center">
                  {bug.assignee ? (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold"
                      style={{
                        backgroundColor: bug.assignee.color || '#666',
                      }}
                    >
                      {bug.assignee.name?.charAt(0) || '?'}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Bug Board View Component
function BugBoardView({
  groupedBugs,
  groupBy,
  getProjectName,
}: {
  groupedBugs: Record<string, Task[]>;
  groupBy: GroupBy;
  getProjectName: (id: string) => string;
}) {
  const getGroupLabel = (key: string) => {
    switch (groupBy) {
      case 'status':
        return STATUS_CONFIG[key as TaskStatus]?.label || key;
      case 'severity':
        return SEVERITY_CONFIG[key as Severity]?.label || key;
      case 'project':
        return getProjectName(key);
      default:
        return key;
    }
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {Object.entries(groupedBugs).map(([groupKey, bugs]) => (
        <div key={groupKey} className="flex-shrink-0 w-80">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{getGroupLabel(groupKey)}</h3>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {bugs.length}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            {bugs.map((bug) => {
              const severity = getBugSeverity(bug);
              const severityConfig = SEVERITY_CONFIG[severity];

              return (
                <div
                  key={bug.id}
                  className="bg-card border-l-[3px] border-r border-t border-b border-border rounded-lg p-3 cursor-pointer hover:border-ring/50 hover:shadow-sm transition-all group"
                  style={{ borderLeftColor: BORDER_COLORS[severity] }}
                >
                  {/* Labels */}
                  {bug.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {bug.labels.slice(0, 2).map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
                          style={{
                            backgroundColor: label.color + '22',
                            color: label.color,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {bug.labels.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{bug.labels.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <p className="text-xs font-medium text-foreground line-clamp-2 mb-2">
                    {bug.title}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bug className="w-2.5 h-2.5 text-red-500" />
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {bug.id}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] h-4 px-1', severityConfig.color)}
                      >
                        {severityConfig.label}
                      </Badge>
                    </div>
                    {bug.assignee && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold"
                        style={{
                          backgroundColor: bug.assignee.color || '#666',
                        }}
                      >
                        {bug.assignee.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
