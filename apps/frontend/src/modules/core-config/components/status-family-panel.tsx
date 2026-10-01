import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { countBy } from '@/components/semantic/filter-chips';
import { AsyncState } from '@/components/semantic/async-state';
import { StatusDefinitionList, type StatusDefinitionLike } from '@/components/semantic/status-definition-list';
import {
  StatusDefinitionDialog,
  type StatusDefinitionDraft,
} from '@/components/semantic/status-definition-dialog';
import { SkeletonTable } from '@/components/ui/skeleton';
import { DataTableShell } from '@/components/semantic/data-table-shell';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  useStatuses,
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
} from '../hooks/use-metadata';
import { useAllTasks } from '@/modules/issue/hooks/use-project-tasks';
import { useProjectList } from '@/modules/project/hooks/use-project-list';

/** 拉满一页等效全量（与任务页 PAGE_SIZE 同口径） */
const COUNT_PAGE_SIZE = 1000;

export type StatusFamily = 'task' | 'project';

export interface StatusFamilyPanelProps {
  /** 状态族类型（task / project） */
  family: StatusFamily;
  /** 行尾工单计数（默认开） */
  withCounts?: boolean;
  /** 任务族行 hover「查看任务」深链（默认关） */
  withViewTasks?: boolean;
  /** 空态标题 */
  emptyTitle?: string;
}

/**
 * 状态族管理面板（设置·状态 / 类型详情·状态 两处收编的唯一装配）：
 * 取数 + 工单计数 + 分组列表 + 新建/编辑/流转配置/删除 + 拖拽重排，全部走真实 metadata API。
 * 非管理员自动降级为只读浏览（服务端 RolesGuard 同口径）。
 */
export function StatusFamilyPanel({
  family,
  withCounts = true,
  withViewTasks = false,
  emptyTitle,
}: StatusFamilyPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirmAction = useConfirm();
  const { isAdmin } = useAuth();
  const { data: statuses = [], isLoading, error, refetch } = useStatuses(undefined, family);
  const createStatus = useCreateStatus();
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StatusDefinitionLike | null>(null);
  const [createGroup, setCreateGroup] = useState<string | undefined>(undefined);

  // 工单计数（行尾「N 个」）：任务族按 status、项目族按 workflowStatus，各拉满一页
  const { data: tasksData } = useAllTasks(
    { page: 1, pageSize: COUNT_PAGE_SIZE },
    { enabled: withCounts && family === 'task', placeholderData: (prev) => prev },
  );
  const { data: projectsResponse } = useProjectList();
  const counts = useMemo<Record<string, number> | undefined>(() => {
    if (!withCounts) return undefined;
    if (family === 'task') {
      return Object.fromEntries(
        countBy(tasksData?.data ?? [], (task) => task.status),
      ) as Record<string, number>;
    }
    return Object.fromEntries(
      countBy(projectsResponse?.items ?? [], (p) => p.workflowStatus),
    ) as Record<string, number>;
  }, [withCounts, family, tasksData, projectsResponse]);

  const openCreate = (group: string) => {
    setEditing(null);
    setCreateGroup(group);
    setDialogOpen(true);
  };

  const openEdit = (def: StatusDefinitionLike) => {
    if (!isAdmin) return;
    setEditing(def);
    setCreateGroup(undefined);
    setDialogOpen(true);
  };

  const handleSubmit = async (draft: StatusDefinitionDraft) => {
    try {
      if (editing) {
        await updateStatus.mutateAsync({ id: editing.id, data: draft });
        toast.success(t('settings.statusSaved', '状态已保存'));
      } else {
        await createStatus.mutateAsync(draft);
        toast.success(t('settings.statusCreated', '状态已创建'));
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error((e as Error).message || t('settings.saveFailed'));
    }
  };

  const handleDelete = async (def: StatusDefinitionLike) => {
    const ok = await confirmAction({
      title: t('settings.deleteStatusTitle', '删除状态'),
      description: t('settings.deleteStatusConfirm', {
        name: def.name,
        count: counts?.[def.key] ?? 0,
      }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteStatus.mutateAsync(def.id);
      toast.success(t('settings.statusDeleted', '状态已删除'));
      setDialogOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error((e as Error).message || t('settings.deleteFailed'));
    }
  };

  // 组内落放重排：order 以 10 步长重排，仅提交位置变化的项；真实顺序由服务端回读生效
  const handleReorderCommit = async (groupDefs: StatusDefinitionLike[]) => {
    try {
      await Promise.all(
        groupDefs
          .map((def, index) => ({ id: def.id, currentOrder: def.order, order: (index + 1) * 10 }))
          .filter(({ currentOrder, order }) => currentOrder !== order)
          .map(({ id, order }) => updateStatus.mutateAsync({ id, data: { order } })),
      );
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  return (
    <>
      <AsyncState
        isLoading={isLoading}
        error={error ? t('settings.statusLoadFailed') : null}
        onRetry={() => void refetch()}
        isEmpty={statuses.length === 0}
        emptyTitle={emptyTitle ?? t('settings.noStatuses')}
        loadingFallback={
          <DataTableShell>
            <SkeletonTable rows={6} columns={3} />
          </DataTableShell>
        }
      >
        <StatusDefinitionList
          definitions={statuses}
          counts={counts}
          onCreate={isAdmin ? openCreate : undefined}
          onEdit={openEdit}
          onReorderCommit={isAdmin ? (next) => void handleReorderCommit(next) : undefined}
          onViewTasks={
            withViewTasks && family === 'task'
              ? (def) => navigate(`/app/issues?f_status=${encodeURIComponent(def.key)}`)
              : undefined
          }
        />
      </AsyncState>

      <StatusDefinitionDialog
        key={`${editing?.id ?? 'new'}-${String(dialogOpen)}`}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        type={family}
        editing={editing}
        defaultGroup={createGroup}
        definitions={statuses}
        onSubmit={handleSubmit}
        onDelete={isAdmin && editing ? handleDelete : undefined}
        saving={createStatus.isPending || updateStatus.isPending}
        deleting={deleteStatus.isPending}
      />
    </>
  );
}
