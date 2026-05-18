import { useState } from 'react';
import { Bot, Loader2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AiAgentBadge } from '@/shared/components/ai-agent-badge';
import {
  useAvailableAgents,
  useAssignTaskToAI,
} from '../hooks/use-ai-task-operations';

interface AiAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  projectId: string;
  taskTitle: string;
  onSuccess?: () => void;
}

export function AiAssignDialog({
  open,
  onOpenChange,
  taskId,
  projectId,
  taskTitle,
  onSuccess,
}: AiAssignDialogProps) {
  const { data: agents, isLoading } = useAvailableAgents(projectId);
  const assignMutation = useAssignTaskToAI();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  function handleAssign() {
    if (!selectedAgentId) return;

    assignMutation.mutate(
      {
        taskId,
        agentSubjectId: selectedAgentId,
        projectId,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedAgentId(null);
          onSuccess?.();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot size={16} className="text-accent-purple" />
            Assign to AI Agent
          </DialogTitle>
          <DialogDescription>
            Choose an AI agent to handle &ldquo;{taskTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 size={16} className="mr-2 animate-spin" />
            Loading agents...
          </div>
        ) : !agents || agents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <Bot size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No AI agents registered for this project.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Register a runtime to connect AI agents.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => setSelectedAgentId(agent.subjectId)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedAgentId === agent.subjectId
                    ? 'border-accent-purple bg-accent-purple-light/10'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AiAgentBadge agentName={agent.subjectId} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {agent.subjectId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        via {agent.identitySource} · {agent.mappedRole ?? 'agent'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {agent.runtimeOnline ? (
                      <Badge className="border-0 bg-accent-green-light/50 text-accent-green text-xs">
                        <Radio size={10} className="mr-1" />
                        Online
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-muted text-muted-foreground text-xs">
                        Offline
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedAgentId || assignMutation.isPending}
            onClick={handleAssign}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 size={13} className="mr-1 animate-spin" />
                Dispatching...
              </>
            ) : (
              'Assign to Agent'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
