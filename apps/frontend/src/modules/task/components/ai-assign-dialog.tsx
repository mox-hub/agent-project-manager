import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, Loader2, Radio, Terminal } from 'lucide-react';
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
  useProjectMembers,
} from '@/modules/team-member/hooks';
import { useProjectRoles } from '@/modules/project-role';
import { useAssignTaskToAI } from '../hooks/use-ai-task-operations';
import { toast } from '@/components/ui/toast';

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
  // 拉项目成员（AI 员工），PM 视角直接选 AI 员工
  const { data: members, isLoading } = useProjectMembers(projectId, {
    type: 'ai_agent',
  });
  const { data: rolesData } = useProjectRoles(projectId);
  const assignTaskToAI = useAssignTaskToAI();
  const qc = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // 角色按 executionRole 索引
  const roleByExecutionRole = new Map(
    (rolesData?.projectRoles ?? []).map((r) => [r.executionRole, r] as const),
  );

  function handleAssign() {
    if (!selectedMemberId) return;

    assignTaskToAI.mutate(
      {
        taskId,
        agentSubjectId: selectedMemberId,
        projectId,
      },
      {
        onSuccess: (data: any) => {
          if (data?.executionRunId) {
            toast.success(
              `已派发任务到 AI 员工 (ExecutionRun ${data.executionRunId.slice(0, 8)}…)`,
            );
          } else {
            toast.success('已将任务指派给 AI 员工');
          }
          if (data?.dispatchError) {
            toast.warning(
              `指派成功但 CLI 派发失败: ${data.dispatchError}`,
              { duration: 8000 },
            );
          }
          // 两级审计 gate：派发黄牌警告（审计 red，不阻断执行）
          if (data?.auditWarning) {
            toast.warning(data.auditWarning, { duration: 8000 });
          }
          onOpenChange(false);
          setSelectedMemberId(null);
          qc.invalidateQueries({ queryKey: ['task', taskId] });
          qc.invalidateQueries({ queryKey: ['tasks'] });
          qc.invalidateQueries({ queryKey: ['acceptance'] });
          onSuccess?.();
        },
        onError: (err) => {
          toast.error(
            '派发失败: ' + (err instanceof Error ? err.message : '未知错误'),
          );
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
            派发任务给 AI 员工
          </DialogTitle>
          <DialogDescription>
            选择项目中的 AI 员工按角色绑定 CLI 自动执行：
            <span className="font-medium"> {taskTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 size={16} className="mr-2 animate-spin" />
            加载 AI 员工…
          </div>
        ) : !members || members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <Bot size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              项目中还没有 AI 员工。
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              请先到成员管理创建 AI 员工并加入项目。
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {members.map((m: any) => {
              const role = m.defaultExecutionRole
                ? (roleByExecutionRole.get(m.defaultExecutionRole) as
                    | { defaultCliProviderId?: string | null }
                    | undefined)
                : null;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedMemberId === m.id
                      ? 'border-accent-purple bg-accent-purple-light/10'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AiAgentBadge
                        agentName={m.displayName ?? m.handle}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {m.displayName}
                          {m.handle && (
                            <span className="text-muted-foreground">
                              {' '}
                              @{m.handle}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {m.defaultExecutionRole && (
                            <Badge variant="secondary" className="text-xs">
                              {m.defaultExecutionRole}
                            </Badge>
                          )}
                          {role?.defaultCliProviderId && (
                            <Badge
                              variant="outline"
                              className="text-xs gap-1"
                            >
                              <Terminal className="h-3 w-3" />
                              {role.defaultCliProviderId}
                            </Badge>
                          )}
                          {m.defaultCliProviderId && (
                            <Badge className="text-xs gap-1">
                              <Terminal className="h-3 w-3" />
                              {m.defaultCliProviderId} (override)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {m.status === 'active' ? (
                      <Badge className="border-0 bg-accent-green-light/50 text-accent-green text-xs">
                        <Radio size={10} className="mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-muted text-muted-foreground text-xs">
                        {m.status}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            size="sm"
            disabled={!selectedMemberId || assignTaskToAI.isPending}
            onClick={handleAssign}
          >
            {assignTaskToAI.isPending ? (
              <>
                <Loader2 size={13} className="mr-1 animate-spin" />
                派发中…
              </>
            ) : (
              '派发并执行'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
