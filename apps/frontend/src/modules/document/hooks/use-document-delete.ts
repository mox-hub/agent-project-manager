// 文档删除统一流程：确认弹窗（destructive）→ 软删 mutation → 善后导航。
// 三处入口（详情页「更多」菜单 / 列表卡片视图 / 列表列表视图）共用，
// 确认文案口径与成功/失败反馈（useDeleteDocument 内 toast）保持一致。
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useDeleteDocument } from './use-document-mutations';

export interface DocumentDeleteTarget {
  id: string;
  title?: string | null;
}

interface UseDocumentDeleteFlowOptions {
  /** 删除成功后跳转（详情页回列表用；列表入口不传） */
  redirectTo?: string;
}

export function useDocumentDeleteFlow(options?: UseDocumentDeleteFlowOptions) {
  const confirmAction = useConfirm();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteDocument = useDeleteDocument();

  const confirmDelete = useCallback(
    async (target: DocumentDeleteTarget): Promise<boolean> => {
      const ok = await confirmAction({
        title: t('document.deleteConfirm.title', '删除文档'),
        description: t('document.deleteConfirm.description', {
          title: target.title || target.id,
          defaultValue: '确定要删除文档「{{title}}」吗？此操作不可撤销。',
        }),
        confirmText: t('common.delete', '删除'),
        cancelText: t('common.cancel', '取消'),
        variant: 'destructive',
      });
      if (!ok) return false;

      await deleteDocument.mutateAsync(target.id);
      if (options?.redirectTo) {
        navigate(options.redirectTo);
      }
      return true;
    },
    [confirmAction, t, deleteDocument, navigate, options?.redirectTo],
  );

  return { confirmDelete, isDeleting: deleteDocument.isPending };
}
