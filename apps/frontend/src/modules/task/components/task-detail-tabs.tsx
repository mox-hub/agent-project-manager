import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Activity, Bot, CheckCircle, Clock, XCircle } from 'lucide-react';
import { ContextPreviewButton } from './context-preview-dialog';

export interface ExecutionRun {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  agentId?: string;
  agentName?: string;
  startedAt?: string;
  completedAt?: string;
  result?: string;
  error?: string;
  steps?: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

interface TaskExecutionTabProps {
  taskId: string;
}

function ExecutionStatusBadge({ status }: { status: ExecutionRun['status'] }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
    running: { label: 'Running', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  } as const;

  const { label, className } = config[status] || config.pending;

  return (
    <Badge variant="outline" className={cn('text-xs', className)}>
      {status === 'running' && <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {label}
    </Badge>
  );
}

function ExecutionTimelineItem({ run, isLast }: { run: ExecutionRun; isLast: boolean }) {
  const statusIcon = {
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    running: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    cancelled: <XCircle className="h-4 w-4 text-gray-500" />,
  }[run.status];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border bg-background">
          {statusIcon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          {run.agentName && (
            <div className="flex items-center gap-1 text-sm">
              <Bot className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{run.agentName}</span>
            </div>
          )}
          <ExecutionStatusBadge status={run.status} />
        </div>
        {run.startedAt && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Started: {new Date(run.startedAt).toLocaleString()}
          </p>
        )}
        {run.completedAt && (
          <p className="text-xs text-muted-foreground">
            Completed: {new Date(run.completedAt).toLocaleString()}
          </p>
        )}
        {run.error && (
          <p className="mt-1 text-xs text-red-500">
            Error: {run.error}
          </p>
        )}
        {run.result && (
          <p className="mt-1 text-sm text-muted-foreground">
            {run.result}
          </p>
        )}
      </div>
    </div>
  );
}

function useTaskExecutionRuns(taskId: string) {
  return useQuery({
    queryKey: ['taskExecutionRuns', taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<ExecutionRun[]> => {
      const response = await fetch(`/_api/tasks/${taskId}/execution-runs`);
      if (!response.ok) throw new Error('Failed to fetch execution runs');
      return response.json();
    },
  });
}

export function TaskExecutionTab({ taskId }: TaskExecutionTabProps) {
  const { data: runs, isLoading } = useTaskExecutionRuns(taskId);

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No execution runs yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          AI execution history will appear here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {runs.map((run, index) => (
          <ExecutionTimelineItem
            key={run.id}
            run={run}
            isLast={index === runs.length - 1}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

export function TaskDetailSheetTabs({ taskId }: TaskDetailSheetProps) {
  const [activeTab, setActiveTab] = useState('execution');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
      <TabsList variant="line" className="w-full justify-start border-b px-2">
        <TabsTrigger value="execution" className="text-xs">
          <Activity className="mr-1 h-3 w-3" />
          Execution
        </TabsTrigger>
        <TabsTrigger value="approvals" className="text-xs">
          <CheckCircle className="mr-1 h-3 w-3" />
          Approvals
        </TabsTrigger>
        <TabsTrigger value="ai-suggestion" className="text-xs">
          <Bot className="mr-1 h-3 w-3" />
          AI Suggestion
        </TabsTrigger>
        <TabsTrigger value="discussion" className="text-xs">
          <Activity className="mr-1 h-3 w-3" />
          Discussion
        </TabsTrigger>
      </TabsList>

      <TabsContent value="execution" className="flex-1 overflow-hidden">
        <TaskExecutionTab taskId={taskId} />
      </TabsContent>

      <TabsContent value="approvals" className="flex-1 overflow-hidden">
        <TaskApprovalsTab taskId={taskId} />
      </TabsContent>

      <TabsContent value="ai-suggestion" className="flex-1 overflow-hidden">
        <TaskAiSuggestionTab taskId={taskId} />
      </TabsContent>

      <TabsContent value="discussion" className="flex-1 overflow-hidden">
        <TaskDiscussionTab taskId={taskId} />
      </TabsContent>
    </Tabs>
  );
}

interface TaskDetailSheetProps {
  taskId: string;
}

function TaskApprovalsTab({ taskId }: TaskDetailSheetProps) {
  const { data: approvals, isLoading } = useQuery({
    queryKey: ['taskApprovals', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const response = await fetch(`/_api/tasks/${taskId}/approvals`);
      if (!response.ok) throw new Error('Failed to fetch approvals');
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="p-4"><Skeleton className="h-20 w-full" /></div>;
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No approval requests</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {approvals.map((approval: any) => (
          <div key={approval.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Badge variant={approval.status === 'approved' ? 'default' : 'destructive'}>
                {approval.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(approval.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-sm">{approval.description}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function TaskAiSuggestionTab({ taskId }: TaskDetailSheetProps) {
  const { data: task } = useTaskDetail(taskId);

  if (!task?.aiSuggestion) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bot className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No AI suggestion yet</p>
        <Button variant="outline" size="sm" className="mt-3">
          <Bot className="mr-1 h-3 w-3" />
          Request AI Suggestion
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3">
        <div className="rounded-lg border-l-4 border-l-accent-purple bg-accent-purple/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-accent-purple" />
            <span className="text-sm font-medium">AI Suggestion</span>
          </div>
          <pre className="text-xs whitespace-pre-wrap">
            {typeof task.aiSuggestion === 'string'
              ? task.aiSuggestion
              : JSON.stringify(task.aiSuggestion, null, 2)}
          </pre>
        </div>
        <ContextPreviewButton taskId={taskId} />
      </div>
    </ScrollArea>
  );
}

function useTaskDetail(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const response = await fetch(`/_api/tasks/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    },
  });
}

function TaskDiscussionTab({ taskId }: TaskDetailSheetProps) {
  const { data: activities } = useTaskActivities(taskId);
  const [newComment, setNewComment] = useState('');

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No discussion yet</p>
        <div className="mt-3 w-full px-3">
          <textarea
            className="w-full rounded-md border p-2 text-sm"
            placeholder="Add a comment..."
            rows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <Button size="sm" className="mt-2 w-full" disabled={!newComment.trim()}>
            Send
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-2">
        {activities.map((activity: any) => (
          <div key={activity.id} className="flex gap-2">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {activity.actorId?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {activity.actorId || 'System'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {activity.summary || activity.type}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 border-t bg-background p-2">
        <textarea
          className="w-full rounded-md border p-2 text-sm"
          placeholder="Add a comment..."
          rows={2}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button size="sm" className="mt-2" disabled={!newComment.trim()}>
          Send
        </Button>
      </div>
    </ScrollArea>
  );
}

function useTaskActivities(taskId: string) {
  return useQuery({
    queryKey: ['taskActivities', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const response = await fetch(`/_api/tasks/${taskId}/activities`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
  });
}
