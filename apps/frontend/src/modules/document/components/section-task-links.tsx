'use client';

import { useState } from 'react';
import { Plus, X, CheckSquare, Bug, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DocumentTaskLink } from '@/modules/document/api/document-task-link-api';
import {
  useDeleteSectionTaskLink,
  useSectionTaskLinks,
} from '@/modules/document/hooks/use-section-task-links';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useCreateSectionTaskLink } from '@/modules/document/hooks/use-section-task-links';
import { TaskPickerDialog } from './task-picker-dialog';

interface SectionTaskLinksProps {
  documentId: string;
  sectionId: string;
  projectId: string;
}

const LINK_TYPE_LABELS: Record<string, string> = {
  references: '引用',
  blocks: '阻塞',
  relates: '相关',
  implements: '实现',
};

const LINK_TYPE_COLORS: Record<string, string> = {
  references: 'bg-accent-blue/10 text-accent-blue',
  blocks: 'bg-accent-red/10 text-accent-red',
  relates: 'bg-accent-yellow/10 text-accent-yellow',
  implements: 'bg-accent-green/10 text-accent-green',
};

export function SectionTaskLinks({ documentId, sectionId, projectId }: SectionTaskLinksProps) {
  const { data: links = [] } = useSectionTaskLinks(sectionId);
  const create = useCreateSectionTaskLink(sectionId);
  const remove = useDeleteSectionTaskLink(sectionId);
  const currentUserId = useAppStore((s) => s.currentUser?.id ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSelect = (taskId: string, linkType: DocumentTaskLink['linkType']) => {
    if (!currentUserId) return;
    create.mutate({
      taskId,
      projectId,
      documentId,
      sectionId,
      linkType,
      createdBy: currentUserId,
    } as any);
  };

  return (
    <div className="my-3 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-muted-foreground">
          段落关联任务 ({links.length})
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPickerOpen(true)}
          className="h-6 gap-1 px-2 text-[11px]"
        >
          <Plus size={11} /> 添加关联
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/80">此段落尚未关联任务</p>
      ) : (
        <ul className="space-y-1">
          {links.map((link) => (
            <li
              key={link.id}
              className="group flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5"
            >
              {link.task?.title?.includes('[BUG]') || link.linkType === 'blocks' ? (
                <Bug size={11} className="shrink-0 text-accent-red" />
              ) : (
                <CheckSquare size={11} className="shrink-0 text-accent-blue" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs">{link.task?.title || link.taskId}</span>
                  {link.task && (
                    <a
                      href={`/app/projects/${projectId}/tasks/${link.taskId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                {link.task && (
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{link.task.status}</span>
                    <span>·</span>
                    <span>{link.task.priority}</span>
                  </div>
                )}
              </div>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0 text-[10px] font-medium',
                  LINK_TYPE_COLORS[link.linkType],
                )}
              >
                {LINK_TYPE_LABELS[link.linkType] || link.linkType}
              </span>
              <button
                type="button"
                onClick={() => remove.mutate(link.id)}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                aria-label="删除关联"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <TaskPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        onSelect={handleSelect}
      />
    </div>
  );
}
