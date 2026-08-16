import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import {
  Activity,
  Bot,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  Settings2,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  X,
  Cpu,
} from 'lucide-react';

// Types
interface ExecutionRun {
  id: string;
  taskId: string;
  taskTitle?: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  error?: string;
  steps?: ExecutionStep[];
}

interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  error?: string;
}

interface ApprovalRequest {
  id: string;
  taskId: string;
  taskTitle?: string;
  agentId: string;
  agentName: string;
  action: string;
  riskLevel: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  evaluatedAt?: string;
  evaluatorId?: string;
  evaluation?: string;
}

interface AgentTrustProfile {
  agentId: string;
  agentName: string;
  trustLevel: 0 | 1 | 2 | 3;
  trustScore: number;
  recentEvaluations: EvaluationRecord[];
}

interface EvaluationRecord {
  id: string;
  taskTitle: string;
  score: number;
  timestamp: string;
}

// API Hooks
function useExecutionRuns(projectId?: string) {
  return useQuery({
    queryKey: ['executionRuns', projectId],
    queryFn: async (): Promise<ExecutionRun[]> => {
      const url = projectId 
        ? `/_api/execution/runs?projectId=${projectId}` 
        : '/_api/execution/runs';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch execution runs');
      const data = await response.json();
      return data.runs || [];
    },
  });
}

function useApprovalRequests(projectId?: string) {
  return useQuery({
    queryKey: ['approvalRequests', projectId],
    queryFn: async (): Promise<ApprovalRequest[]> => {
      const url = projectId 
        ? `/_api/execution/approvals/pending?projectId=${projectId}` 
        : '/_api/execution/approvals/pending';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch approval requests');
      const data = await response.json();
      return data.approvals || [];
    },
  });
}

function useCliProviders() {
  return useQuery({
    queryKey: ['cliProviders'],
    queryFn: async () => {
      const response = await fetch('/_api/ai/cli-providers');
      if (!response.ok) throw new Error('Failed to fetch CLI providers');
      return response.json();
    },
  });
}

function useAgentTrustProfiles() {
  // TODO: TrustService controller not implemented yet
  // Temporary mock data
  return useQuery({
    queryKey: ['agentTrustProfiles'],
    queryFn: async (): Promise<AgentTrustProfile[]> => {
      // Return empty array until TrustService is implemented
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Status Badge Component
function StatusBadge({ status }: { status: ExecutionRun['status'] | ExecutionStep['status'] }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
    running: { label: 'Running', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    skipped: { label: 'Skipped', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  } as const;

  const { label, className } = config[status] || config.pending;

  return (
    <Badge variant="outline" className={cn('text-xs', className)}>
      {status === 'running' && <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {label}
    </Badge>
  );
}

function RiskBadge({ level }: { level: ApprovalRequest['riskLevel'] }) {
  const config = {
    high: { label: 'High Risk', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    medium: { label: 'Medium Risk', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    low: { label: 'Low Risk', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  } as const;

  const { label, className } = config[level] || config.low;

  return (
    <Badge variant="outline" className={cn('text-xs', className)}>
      {label}
    </Badge>
  );
}

function TrustLevelBadge({ level }: { level: number }) {
  const config = {
    0: { label: 'L0', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    1: { label: 'L1', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    2: { label: 'L2', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    3: { label: 'L3', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  } as const;

  const { label, className } = config[level] || config[0];

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', className)}>
      {label}
    </Badge>
  );
}

// Execution Queue Tab
function ExecutionQueueTab() {
  const { data: runs, isLoading } = useExecutionRuns();

  const running = runs?.filter((r) => r.status === 'running') || [];
  const pending = runs?.filter((r) => r.status === 'pending') || [];
  const recent = runs?.filter((r) => ['completed', 'failed', 'cancelled'].includes(r.status)).slice(0, 10) || [];

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {running.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Play className="h-4 w-4 text-blue-500" />
            Running ({running.length})
          </h3>
          <div className="space-y-2">
            {running.map((run) => (
              <ExecutionRunCard key={run.id} run={run} />
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-yellow-500" />
            Queued ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((run) => (
              <ExecutionRunCard key={run.id} run={run} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent ({recent.length})
        </h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent executions</p>
        ) : (
          <div className="space-y-2">
            {recent.map((run) => (
              <ExecutionRunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ExecutionRunCard({ run }: { run: ExecutionRun }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <Card
        className="cursor-pointer transition-colors hover:bg-muted/50"
        onClick={() => setShowDetail(true)}
      >
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{run.taskTitle || `Task ${run.taskId}`}</p>
              <p className="text-xs text-muted-foreground">{run.agentName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {run.progress !== undefined && (
              <span className="text-xs text-muted-foreground">{run.progress}%</span>
            )}
            <StatusBadge status={run.status} />
          </div>
        </CardContent>
      </Card>

      <ExecutionDetailDialog
        run={run}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
}

function ExecutionDetailDialog({
  run,
  open,
  onOpenChange,
}: {
  run: ExecutionRun;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Execution Details</DialogTitle>
          <DialogDescription>
            {run.taskTitle || `Task ${run.taskId}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{run.agentName}</span>
            </div>
            <StatusBadge status={run.status} />
          </div>

          {run.startedAt && (
            <p className="text-xs text-muted-foreground">
              Started: {new Date(run.startedAt).toLocaleString()}
            </p>
          )}

          {run.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              Error: {run.error}
            </div>
          )}

          {run.status === 'failed' && (
            <ExecutionRecoveryPanel run={run} />
          )}

          {run.steps && run.steps.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Steps</h4>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {run.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span className="flex-1">{step.name}</span>
                      <StatusBadge status={step.status} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExecutionRecoveryPanel({ run }: { run: ExecutionRun }) {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
      <div className="mb-3 flex items-center gap-2">
        <XCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <span className="font-medium text-yellow-800 dark:text-yellow-200">Execution Failed</span>
      </div>

      {run.error && (
        <p className="mb-4 text-sm text-yellow-700 dark:text-yellow-300">
          {run.error}
        </p>
      )}

      <h4 className="mb-2 text-sm font-medium">Recovery Options:</h4>
      <div className="grid gap-2">
        <Button variant="outline" size="sm" className="justify-start">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Entire Task
        </Button>
        <Button variant="outline" size="sm" className="justify-start">
          <Settings2 className="mr-2 h-4 w-4" />
          Retry from Failed Step
        </Button>
        <Button variant="outline" size="sm" className="justify-start">
          <Settings2 className="mr-2 h-4 w-4" />
          Adjust Parameters and Retry
        </Button>
        <Button variant="outline" size="sm" className="justify-start">
          <X className="mr-2 h-4 w-4" />
          Assign to Human
        </Button>
      </div>
    </div>
  );
}

// Approval Center Tab
function ApprovalCenterTab() {
  const { data: approvals, isLoading } = useApprovalRequests();
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  const pendingApprovals = approvals?.filter((a) => a.status === 'pending') || [];
  const sortedApprovals = [...pendingApprovals].sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });

  const toggleApproval = (id: string) => {
    const newSet = new Set(selectedApprovals);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedApprovals(newSet);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Pending Approvals ({pendingApprovals.length})
        </h3>
        <Button
          variant={batchMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBatchMode(!batchMode)}
        >
          {batchMode ? 'Exit Batch Mode' : 'Batch Mode'}
        </Button>
      </div>

      {sortedApprovals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending approvals</p>
      ) : (
        <div className="space-y-2">
          {sortedApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              selected={selectedApprovals.has(approval.id)}
              onSelect={() => toggleApproval(approval.id)}
              batchMode={batchMode}
            />
          ))}
        </div>
      )}

      {batchMode && selectedApprovals.size > 0 && (
        <div className="sticky bottom-4 rounded-lg border bg-background p-3 shadow-lg">
          <p className="mb-2 text-sm">
            Selected {selectedApprovals.size} items
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="default">
              <ThumbsUp className="mr-1 h-4 w-4" />
              Batch Approve
            </Button>
            <Button size="sm" variant="destructive">
              <ThumbsDown className="mr-1 h-4 w-4" />
              Batch Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  approval,
  selected,
  onSelect,
  batchMode,
}: {
  approval: ApprovalRequest;
  selected: boolean;
  onSelect: () => void;
  batchMode: boolean;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-muted/50',
        selected && 'border-primary bg-primary/5'
      )}
      onClick={onSelect}
    >
      <CardContent className="flex items-start gap-3 p-3">
        {batchMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="mt-1 h-4 w-4"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{approval.taskTitle || `Task ${approval.taskId}`}</p>
            <RiskBadge level={approval.riskLevel} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {approval.action}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Bot className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{approval.agentName}</span>
          </div>
        </div>
        {!batchMode && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <ThumbsUp className="mr-1 h-3 w-3" />
              Approve
            </Button>
            <Button size="sm" variant="outline">
              <ThumbsDown className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Execution Replay Tab
function ExecutionReplayTab() {
  const { data: runs, isLoading } = useExecutionRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const completedRuns = runs?.filter((r) => ['completed', 'failed'].includes(r.status)) || [];
  const selectedRun = completedRuns.find((r) => r.id === selectedRunId);

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4">
        <Skeleton className="h-64 w-48" />
        <Skeleton className="h-64 flex-1" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-4">
      <ScrollArea className="w-64">
        <div className="space-y-2">
          {completedRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed executions</p>
          ) : (
            completedRuns.map((run) => (
              <Card
                key={run.id}
                className={cn(
                  'cursor-pointer p-2 transition-colors hover:bg-muted/50',
                  selectedRunId === run.id && 'border-primary bg-primary/5'
                )}
                onClick={() => setSelectedRunId(run.id)}
              >
                <p className="text-xs font-medium">{run.taskTitle || `Task ${run.taskId}`}</p>
                <p className="text-xs text-muted-foreground">{run.agentName}</p>
                <div className="mt-1">
                  <StatusBadge status={run.status} />
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="flex-1">
        {selectedRun ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selectedRun.taskTitle || `Task ${selectedRun.taskId}`}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <StatusBadge status={selectedRun.status} />
                  <span className="text-sm text-muted-foreground">{selectedRun.agentName}</span>
                </div>

                {selectedRun.startedAt && (
                  <p className="text-xs text-muted-foreground">
                    Started: {new Date(selectedRun.startedAt).toLocaleString()}
                  </p>
                )}

                {selectedRun.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    Completed: {new Date(selectedRun.completedAt).toLocaleString()}
                  </p>
                )}

                {selectedRun.status === 'failed' && selectedRun.error && (
                  <ExecutionRecoveryPanel run={selectedRun} />
                )}

                {selectedRun.steps && selectedRun.steps.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Steps</h4>
                    <div className="space-y-2">
                      {selectedRun.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className={cn(
                            'rounded-md border p-2',
                            step.status === 'completed' && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
                            step.status === 'failed' && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span className="text-sm">{step.name}</span>
                            {step.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {step.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                          </div>
                          {step.error && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{step.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Select an execution to view details
          </div>
        )}
      </div>
    </div>
  );
}

// Trust Management Tab
function TrustManagementTab() {
  const { data: profiles, isLoading } = useAgentTrustProfiles();

  if (isLoading) {
    return (
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No agent trust profiles
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => (
        <Card key={profile.agentId}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{profile.agentName}</CardTitle>
              <TrustLevelBadge level={profile.trustLevel} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-2xl font-bold">{profile.trustScore}</div>
              <p className="text-xs text-muted-foreground">Trust Score</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Recent Evaluations</h4>
              {profile.recentEvaluations.slice(0, 3).map((eval_) => (
                <div key={eval_.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">{eval_.taskTitle}</span>
                  <span className="text-muted-foreground">{eval_.score}</span>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="mt-4 w-full">
              <Settings2 className="mr-1 h-3 w-3" />
              Adjust Trust
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Main Page Component
export function AIExecutionCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'execution';

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <PageShell className="overflow-hidden">
      <PageHeader
        aiId="ai-hub.execution-center"
        title="AI Hub"
        description="Manage AI executions, approvals, and agent trust."
        icon={Cpu}
        iconColor="text-accent-purple"
      />

      <Tabs value={activeTab} onValueChange={setTab} className="flex flex-1 flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="execution" className="text-xs">
            <Play className="mr-1 h-3 w-3" />
            Execution Queue
          </TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="replay" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            Execution Replay
          </TabsTrigger>
          <TabsTrigger value="trust" className="text-xs">
            <Bot className="mr-1 h-3 w-3" />
            Trust Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="execution" className="flex-1 overflow-auto">
          <ExecutionQueueTab />
        </TabsContent>

        <TabsContent value="approvals" className="flex-1 overflow-auto">
          <ApprovalCenterTab />
        </TabsContent>

        <TabsContent value="replay" className="flex-1 overflow-auto">
          <ExecutionReplayTab />
        </TabsContent>

        <TabsContent value="trust" className="flex-1 overflow-auto">
          <TrustManagementTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
