import { useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { useSprints, useCreateSprint, useUpdateSprint, useDeleteSprint, useStartSprint, useCompleteSprint, useCancelSprint } from '../hooks/use-sprints';
import { SprintList } from '../components/sprint-list';
import { useConfirm } from '@/shared/confirm/use-confirm';

export function SprintPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const confirmAction = useConfirm();

  const { data: sprints, isLoading } = useSprints(projectId);
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();
  const deleteSprint = useDeleteSprint();
  const startSprint = useStartSprint();
  const completeSprint = useCompleteSprint();
  const cancelSprint = useCancelSprint();

  const handleCreateSprint = async (data: { name: string; goal?: string; startDate?: string; endDate?: string }) => {
    if (!projectId) return;
    await createSprint.mutateAsync({ projectId, data });
  };

  const handleUpdateSprint = async (sprintId: string, data: { name?: string; goal?: string; startDate?: string; endDate?: string }) => {
    if (!projectId) return;
    await updateSprint.mutateAsync({ projectId, sprintId, data });
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!projectId) return;
    const ok = await confirmAction({
      title: '删除 Sprint',
      description: '确定要删除这个 Sprint 吗？相关任务不会被删除。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (!ok) return;
    await deleteSprint.mutateAsync({ projectId, sprintId });
  };

  const handleStartSprint = async (sprintId: string) => {
    if (!projectId) return;
    await startSprint.mutateAsync({ projectId, sprintId });
  };

  const handleCompleteSprint = async (sprintId: string) => {
    if (!projectId) return;
    const ok = await confirmAction({
      title: '完成 Sprint',
      description: '确定要完成这个 Sprint 吗？',
      confirmText: '完成',
      cancelText: '取消',
    });
    if (!ok) return;
    await completeSprint.mutateAsync({ projectId, sprintId });
  };

  const handleCancelSprint = async (sprintId: string) => {
    if (!projectId) return;
    const ok = await confirmAction({
      title: '取消 Sprint',
      description: '确定要取消这个 Sprint 吗？任务将保留在项目中。',
      confirmText: '取消',
      cancelText: '返回',
      variant: 'destructive',
    });
    if (!ok) return;
    await cancelSprint.mutateAsync({ projectId, sprintId });
  };

  return (
    <PageShell className="overflow-hidden">
      <PageHeader
        title="Sprint 管理"
        description="管理项目的迭代周期和冲刺计划"
      />
      <div className="p-6">
        <SprintList
          projectId={projectId || ''}
          sprints={sprints}
          isLoading={isLoading}
          onCreateSprint={handleCreateSprint}
          onUpdateSprint={handleUpdateSprint}
          onDeleteSprint={handleDeleteSprint}
          onStartSprint={handleStartSprint}
          onCompleteSprint={handleCompleteSprint}
          onCancelSprint={handleCancelSprint}
          isCreating={createSprint.isPending}
          isUpdating={updateSprint.isPending}
          isDeleting={deleteSprint.isPending}
        />
      </div>
    </PageShell>
  );
}
