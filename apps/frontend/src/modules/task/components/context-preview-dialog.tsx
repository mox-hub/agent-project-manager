import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, FileText, Database, Code, MessageSquare, Layers } from 'lucide-react';

interface ContextPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
}

interface ContextPackSnapshot {
  id: string;
  projectId: string;
  taskId?: string;
  snapshotType: string;
  systemContext?: {
    projectName: string;
    projectType: string;
    techStack: string[];
    teamRoles: Record<string, string[]>;
  };
  projectContext?: {
    activeTasks: Array<{ id: string; title: string; status: string }>;
    milestones: Array<{ id: string; name: string; status: string }>;
    blockers: Array<{ taskId: string; description: string }>;
  };
  sessionContext?: {
    conversationHistory: Array<{ id: string; role: string; preview: string }>;
    artifacts: Array<{ id: string; type: string; name: string }>;
  };
  runtimeContext?: {
    workspacePath?: string;
    currentFiles: Array<{ path: string; relevance: number }>;
  };
  tokenUsage?: {
    system: number;
    project: number;
    session: number;
    runtime: number;
    total: number;
    budget: number;
  };
  sources?: {
    databases: Array<{ type: string; id: string; name: string }>;
    documents: Array<{ type: string; id: string; name: string }>;
    files: Array<{ type: string; id: string; name: string }>;
    apis: Array<{ type: string; id: string; name: string }>;
  };
  createdAt: string;
}

function ContextLayerSection({
  title,
  icon: Icon,
  children,
  defaultExpanded = true
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium">{title}</span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && <div className="border-t p-3">{children}</div>}
    </div>
  );
}

function TokenUsageBar({ usage, budget }: { usage: number; budget: number }) {
  const percentage = Math.min((usage / budget) * 100, 100);
  const getColor = () => {
    if (percentage > 80) return 'bg-destructive';
    if (percentage > 60) return 'bg-accent-yellow';
    return 'bg-accent-green';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{usage.toLocaleString()} tokens</span>
        <span>{percentage.toFixed(1)}% of {budget.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ContextPreviewDialog({ open, onOpenChange, taskId }: ContextPreviewDialogProps) {
  const { data: snapshot, isLoading } = useQuery<ContextPackSnapshot>({
    queryKey: ['context-preview', taskId],
    enabled: open && !!taskId,
    queryFn: async () => {
      const response = await fetch(`/_api/context/snapshot/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch context');
      return response.json();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-dialog-scroll flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Context Preview
          </DialogTitle>
          <DialogDescription>
            AI execution context snapshot for this task
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : snapshot ? (
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-4">
              {/* Token Usage */}
              {snapshot.tokenUsage && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <h4 className="text-sm font-medium mb-2">Token Usage</h4>
                  <div className="space-y-2">
                    <TokenUsageBar
                      usage={snapshot.tokenUsage.total}
                      budget={snapshot.tokenUsage.budget}
                    />
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">{snapshot.tokenUsage.system}</span>
                        <br />
                        System
                      </div>
                      <div>
                        <span className="font-medium">{snapshot.tokenUsage.project}</span>
                        <br />
                        Project
                      </div>
                      <div>
                        <span className="font-medium">{snapshot.tokenUsage.session}</span>
                        <br />
                        Session
                      </div>
                      <div>
                        <span className="font-medium">{snapshot.tokenUsage.runtime}</span>
                        <br />
                        Runtime
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* System Context */}
              {snapshot.systemContext && (
                <ContextLayerSection title="System Context" icon={Layers}>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">Project:</span>
                      <span className="font-medium">{snapshot.systemContext.projectName}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline">{snapshot.systemContext.projectType}</Badge>
                    </div>
                    {snapshot.systemContext.techStack?.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Tech Stack:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {snapshot.systemContext.techStack.map((tech, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ContextLayerSection>
              )}

              {/* Project Context */}
              {snapshot.projectContext && (
                <ContextLayerSection title="Project Context" icon={Database}>
                  <div className="space-y-3 text-sm">
                    {snapshot.projectContext.activeTasks?.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Active Tasks ({snapshot.projectContext.activeTasks.length})</span>
                        <ul className="mt-1 space-y-1">
                          {snapshot.projectContext.activeTasks.slice(0, 5).map((task) => (
                            <li key={task.id} className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  task.status === 'in_progress'
                                    ? 'border-accent-blue/30 text-accent-blue'
                                    : 'border-muted'
                                }`}
                              >
                                {task.status}
                              </Badge>
                              <span className="truncate">{task.title}</span>
                            </li>
                          ))}
                          {snapshot.projectContext.activeTasks.length > 5 && (
                            <li className="text-muted-foreground">
                              +{snapshot.projectContext.activeTasks.length - 5} more...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {snapshot.projectContext.milestones?.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Milestones ({snapshot.projectContext.milestones.length})</span>
                        <ul className="mt-1 space-y-1">
                          {snapshot.projectContext.milestones.map((m) => (
                            <li key={m.id} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{m.status}</Badge>
                              <span>{m.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </ContextLayerSection>
              )}

              {/* Session Context */}
              {snapshot.sessionContext && (
                <ContextLayerSection title="Session Context" icon={MessageSquare}>
                  <div className="space-y-2 text-sm">
                    {snapshot.sessionContext.conversationHistory?.length > 0 ? (
                      <>
                        <span className="text-muted-foreground">
                          Recent Messages ({snapshot.sessionContext.conversationHistory.length})
                        </span>
                        <ul className="mt-1 space-y-1">
                          {snapshot.sessionContext.conversationHistory.slice(0, 3).map((msg) => (
                            <li key={msg.id} className="flex gap-2 rounded bg-muted/50 p-2">
                              <Badge variant="outline" className="text-xs h-fit">
                                {msg.role === 'user' ? 'User' : 'AI'}
                              </Badge>
                              <span className="text-xs truncate">{msg.preview}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <span className="text-muted-foreground">No conversation history</span>
                    )}
                    {snapshot.sessionContext.artifacts?.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">
                          Artifacts ({snapshot.sessionContext.artifacts.length})
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {snapshot.sessionContext.artifacts.map((a) => (
                            <Badge key={a.id} variant="secondary" className="text-xs">
                              {a.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ContextLayerSection>
              )}

              {/* Runtime Context */}
              {snapshot.runtimeContext && (
                <ContextLayerSection title="Runtime Context" icon={Code}>
                  <div className="space-y-2 text-sm">
                    {snapshot.runtimeContext.workspacePath && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">Workspace:</span>
                        <code className="text-xs bg-muted px-1 rounded">{snapshot.runtimeContext.workspacePath}</code>
                      </div>
                    )}
                    {snapshot.runtimeContext.currentFiles?.length > 0 ? (
                      <div>
                        <span className="text-muted-foreground">
                          Current Files ({snapshot.runtimeContext.currentFiles.length})
                        </span>
                        <ul className="mt-1 space-y-1">
                          {snapshot.runtimeContext.currentFiles.slice(0, 5).map((file) => (
                            <li key={file.path} className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <code className="text-xs truncate flex-1">{file.path}</code>
                              <Badge variant="outline" className="text-xs">
                                {(file.relevance * 100).toFixed(0)}%
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No files loaded</span>
                    )}
                  </div>
                </ContextLayerSection>
              )}

              {/* Sources */}
              {snapshot.sources && (
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(snapshot.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No context snapshot available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Context will be captured when AI executes this task
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ContextPreviewButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Layers className="mr-1 h-3 w-3" />
        View Context Preview
      </Button>
      <ContextPreviewDialog open={open} onOpenChange={setOpen} taskId={taskId} />
    </>
  );
}
