/**
 * 全局统一创建面板宿主 —— 挂在 ShellLayout 上，任何页面都能经 app-store 的
 * `openCreateDialog()` 唤起底部 Dock「新建」等全局入口。
 *
 * 与页面内的局部 `UnifiedCreateDialog` 分工：
 * - 页面内局部实例：承载页面上下文（如工单列表页的预设筛选、成员卡派发任务的预置负责人）；
 * - 本全局实例：只服务「与当前页面无关」的通用创建入口（Dock 新建）。
 *
 * 按需挂载（关闭即卸载）：面板内含 5 套 react-hook-form 与项目/成员查询，
 * 常挂载会让每个页面都付这份代价；base-ui Dialog 在 open=true 首次渲染时
 * 仍会走入场过渡，视觉不受影响。
 */
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
import { useAppStore } from '@/infrastructure/store/app-store';

export function GlobalCreateDialog() {
  const createDialog = useAppStore((s) => s.createDialog);
  const closeCreateDialog = useAppStore((s) => s.closeCreateDialog);

  if (!createDialog.open) return null;

  return (
    <UnifiedCreateDialog
      open
      onOpenChange={(open) => {
        if (!open) closeCreateDialog();
      }}
      defaultType={createDialog.type}
      projectId={createDialog.projectId}
      defaultAssigneeId={createDialog.assigneeId}
    />
  );
}
