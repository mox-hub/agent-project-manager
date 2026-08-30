// Document Task Links Component - 文档任务关联组件
import React, { memo, useState } from 'react';
import * as Icons from 'lucide-react';
import type { DocumentTaskLink, LinkType } from '../api/document-task-link-api';
import {
  useDocumentLinks,
  useCreateDocumentLink,
  useDeleteDocumentLink,
  useUpdateLinkType,
  LINK_TYPE_LABELS,
  LINK_TYPE_COLORS,
} from '../hooks/use-document-task-links';
import { TaskPickerDialog } from './task-picker-dialog';

interface DocumentTaskLinksProps {
  documentId: string;
  projectId: string;
  currentUserId: string;
}

interface LinkedTaskCardProps {
  link: DocumentTaskLink;
  onDelete: (linkId: string) => void;
  onUpdateType: (linkId: string, type: LinkType) => void;
}

const LinkedTaskCardComponent = memo(function LinkedTaskCardComponent({
  link,
  onDelete,
  onUpdateType,
}: LinkedTaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const linkTypeLabel = LINK_TYPE_LABELS[link.linkType];
  const linkTypeColor = LINK_TYPE_COLORS[link.linkType];

  return (
    <div className="group relative rounded-lg border border-border bg-card p-3 transition-colors hover:border-border/80">
      {/* 头部：任务标题和关联类型 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{link.task?.title || `任务 ${link.taskId}`}</span>
            {link.task?.shortId && (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-10 text-muted-foreground">
                {link.task.shortId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${linkTypeColor}`}>
              {linkTypeLabel}
            </span>
            {link.task && (
              <span className="text-xs text-muted-foreground">
                {link.task.status} · {link.task.priority}
              </span>
            )}
          </div>
        </div>

        {/* 操作菜单 */}
        <div className="relative">
          <button
            type="button"
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
            onClick={() => setShowMenu(!showMenu)}
          >
            <Icons.MoreHorizontal size={16} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-border bg-popover p-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    // TODO: 跳转到任务
                    setShowMenu(false);
                  }}
                >
                  <Icons.ExternalLink size={14} />
                  打开任务
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onDelete(link.id);
                    setShowMenu(false);
                  }}
                >
                  <Icons.Trash size={14} />
                  移除关联
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 关联说明 */}
      {link.note && (
        <p className="mt-2 text-xs text-muted-foreground">{link.note}</p>
      )}
    </div>
  );
});

export const DocumentTaskLinks = memo(function DocumentTaskLinks({
  documentId,
  projectId,
  currentUserId,
}: DocumentTaskLinksProps) {
  const { data: links, isLoading, error } = useDocumentLinks(documentId);
  const createLink = useCreateDocumentLink();
  const deleteLink = useDeleteDocumentLink();
  const updateLinkType = useUpdateLinkType();
  const [pickerOpen, setPickerOpen] = useState(false);
  void currentUserId;

  const handleAddLink = async (taskId: string, linkType: LinkType = 'references') => {
    await createLink.mutateAsync({
      documentId,
      data: {
        documentId,
        taskId,
        projectId,
        linkType,
      },
    });
  };

  const handleDeleteLink = async (linkId: string) => {
    await deleteLink.mutateAsync({ documentId, linkId });
  };

  const handleUpdateType = async (linkId: string, linkType: LinkType) => {
    await updateLinkType.mutateAsync({ documentId, linkId, linkType });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        加载关联失败
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">关联任务</h3>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          onClick={() => setPickerOpen(true)}
          data-ai-component="document.task-links.add"
          data-ai-action="document.task-links.add.click"
        >
          <Icons.Plus size={14} />
          添加关联
        </button>
      </div>

      {/* 关联列表 */}
      {links && links.length > 0 ? (
        <div className="space-y-2">
          {links.map((link) => (
            <LinkedTaskCardComponent
              key={link.id}
              link={link}
              onDelete={handleDeleteLink}
              onUpdateType={handleUpdateType}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Icons.LinkIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">暂无任务关联</p>
          <p className="mt-1 text-xs text-muted-foreground">
            将文档或章节与任务关联，便于追踪
          </p>
        </div>
      )}

      <TaskPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        onSelect={handleAddLink}
      />
    </div>
  );
});

/**
 * 关联类型选择器
 */
export function LinkTypeSelector({
  value,
  onChange,
}: {
  value: LinkType;
  onChange: (type: LinkType) => void;
}) {
  const types: LinkType[] = ['references', 'blocks', 'relates', 'implements'];

  return (
    <div className="flex gap-2">
      {types.map((type) => (
        <button
          key={type}
          type="button"
          className={`
            inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium
            transition-colors
            ${value === type ? LINK_TYPE_COLORS[type] : 'bg-muted text-muted-foreground hover:bg-muted/80'}
          `}
          onClick={() => onChange(type)}
        >
          {LINK_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
