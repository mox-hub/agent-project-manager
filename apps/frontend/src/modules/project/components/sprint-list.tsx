import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Calendar,
  MoreHorizontal,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  ListTodo,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SprintDialog } from './sprint-dialog';
import type { Sprint } from '../api/sprint-api';

interface SprintListProps {
  projectId: string;
  sprints: Sprint[] | undefined;
  isLoading?: boolean;
  onCreateSprint: (data: { name: string; goal?: string; startDate?: string; endDate?: string }) => void;
  onUpdateSprint: (sprintId: string, data: { name?: string; goal?: string; startDate?: string; endDate?: string }) => void;
  onDeleteSprint: (sprintId: string) => void;
  onStartSprint: (sprintId: string) => void;
  onCompleteSprint: (sprintId: string) => void;
  onCancelSprint: (sprintId: string) => void;
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

const statusConfig = {
  planning: { label: '计划中', color: 'bg-accent-blue/10 text-accent-blue border-accent-blue/30' },
  active: { label: '进行中', color: 'bg-accent-green/10 text-accent-green border-accent-green/30' },
  completed: { label: '已完成', color: 'bg-muted text-muted-foreground border-border/20' },
  cancelled: { label: '已取消', color: 'bg-destructive/10 text-destructive border-destructive/30/20' },
};

function SprintCard({
  sprint,
  projectId,
  onEdit,
  onDelete,
  onStart,
  onComplete,
  onCancel,
}: {
  sprint: Sprint;
  projectId: string;
  onEdit: (sprint: Sprint) => void;
  onDelete: (sprint: Sprint) => void;
  onStart: (sprintId: string) => void;
  onComplete: (sprintId: string) => void;
  onCancel: (sprintId: string) => void;
}) {
  const status = statusConfig[sprint.status];
  const taskCount = sprint._count?.tasks ?? 0;

  const getDateRange = () => {
    if (!sprint.startDate && !sprint.endDate) {
      return '未设置日期';
    }
    if (sprint.startDate && sprint.endDate) {
      return `${sprint.startDate} ~ ${sprint.endDate}`;
    }
    if (sprint.startDate) {
      return `从 ${sprint.startDate} 开始`;
    }
    return `截止 ${sprint.endDate}`;
  };

  const getDurationDays = () => {
    if (!sprint.startDate || !sprint.endDate) return null;
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const days = getDurationDays();

  return (
    <div className="group relative rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{sprint.name}</h3>
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
          </div>
          {sprint.goal && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {sprint.goal}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100">
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="end-0">
            {sprint.status === 'planning' && (
              <DropdownMenuItem onClick={() => onStart(sprint.id)}>
                <Play className="mr-2 h-4 w-4" />
                开始 Sprint
              </DropdownMenuItem>
            )}
            {sprint.status === 'active' && (
              <>
                <DropdownMenuItem onClick={() => onComplete(sprint.id)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  完成 Sprint
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCancel(sprint.id)}>
                  <XCircle className="mr-2 h-4 w-4" />
                  取消 Sprint
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => onEdit(sprint)}>
              <Edit className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(sprint)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <ListTodo className="h-3.5 w-3.5" />
          <span>{taskCount} 个任务</span>
        </div>
        {days && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{days} 天</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{getDateRange()}</span>
        </div>
      </div>

      {sprint.status === 'active' && (
        <div className="mt-3">
          <Progress value={0} className="h-1.5" />
        </div>
      )}
    </div>
  );
}

export function SprintList({
  projectId,
  sprints,
  isLoading,
  onCreateSprint,
  onUpdateSprint,
  onDeleteSprint,
  onStartSprint,
  onCompleteSprint,
  onCancelSprint,
  isCreating,
  isUpdating,
  isDeleting,
}: SprintListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);

  const sortedSprints = useMemo(() => {
    if (!sprints) return [];
    return [...sprints].sort((a, b) => {
      const statusOrder = { active: 0, planning: 1, completed: 2, cancelled: 3 };
      return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
    });
  }, [sprints]);

  const activeSprint = sortedSprints.find((s) => s.status === 'active');
  const planningSprints = sortedSprints.filter((s) => s.status === 'planning');
  const completedSprints = sortedSprints.filter(
    (s) => s.status === 'completed' || s.status === 'cancelled',
  );

  const handleCreateSubmit = (data: { name: string; goal?: string; startDate?: string; endDate?: string }) => {
    onCreateSprint(data);
    setShowCreateDialog(false);
  };

  const handleEditSubmit = (data: { name: string; goal?: string; startDate?: string; endDate?: string }) => {
    if (editingSprint) {
      onUpdateSprint(editingSprint.id, data);
      setEditingSprint(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingSprint) {
      onDeleteSprint(deletingSprint.id);
      setDeletingSprint(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!sprints || sprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <EmptyState
          title="暂无 Sprint"
          description="创建第一个 Sprint 来开始敏捷开发流程"
          action={
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              创建 Sprint
            </Button>
          }
        />

        <SprintDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={handleCreateSubmit}
          isPending={isCreating}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeSprint && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-accent-green" />
            进行中的 Sprint
          </h2>
          <SprintCard
            sprint={activeSprint}
            projectId={projectId}
            onEdit={setEditingSprint}
            onDelete={setDeletingSprint}
            onStart={onStartSprint}
            onComplete={onCompleteSprint}
            onCancel={onCancelSprint}
          />
        </div>
      )}

      {planningSprints.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-accent-blue" />
            待开始的 Sprint
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {planningSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                projectId={projectId}
                onEdit={setEditingSprint}
                onDelete={setDeletingSprint}
                onStart={onStartSprint}
                onComplete={onCompleteSprint}
                onCancel={onCancelSprint}
              />
            ))}
          </div>
        </div>
      )}

      {completedSprints.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            已结束的 Sprint
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                projectId={projectId}
                onEdit={setEditingSprint}
                onDelete={setDeletingSprint}
                onStart={onStartSprint}
                onComplete={onCompleteSprint}
                onCancel={onCancelSprint}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新建 Sprint
        </Button>
      </div>

      <SprintDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateSubmit}
        isPending={isCreating}
        mode="create"
      />

      <SprintDialog
        open={!!editingSprint}
        onOpenChange={(open) => !open && setEditingSprint(null)}
        onSubmit={handleEditSubmit}
        isPending={isUpdating}
        mode="edit"
        initialData={editingSprint ? {
          name: editingSprint.name,
          goal: editingSprint.goal || undefined,
          startDate: editingSprint.startDate || undefined,
          endDate: editingSprint.endDate || undefined,
        } : undefined}
      />
    </div>
  );
}
