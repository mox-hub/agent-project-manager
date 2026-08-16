'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckSquare, Bug, ExternalLink, Plus, X, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DocumentTaskLink } from '@/modules/document/api/document-task-link-api';
import {
  useDeleteSectionTaskLink,
  useSectionTaskLinksByDoc,
  useCreateSectionTaskLink,
} from '@/modules/document/hooks/use-section-task-links';
import { useAppStore } from '@/infrastructure/store/app-store';
import { TaskPickerDialog } from './task-picker-dialog';
import {
  SECTION_TASK_PANEL_EVENT,
  OPEN_PICKER_FOR_ANCHOR_EVENT,
} from './mdx-renderer';

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

interface SectionTaskLinksListProps {
  documentId: string;
  projectId: string;
}

interface SectionGroup {
  sectionId: string;
  section: {
    id: string;
    title: string;
    anchor: string;
    level: number;
  };
  links: DocumentTaskLink[];
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

interface PickerState {
  sectionId: string;
  projectId: string;
  documentId: string;
}

export function SectionTaskLinksList({ documentId, projectId }: SectionTaskLinksListProps) {
  const { data: groupsRaw, isLoading } = useSectionTaskLinksByDoc(documentId);
  const groups = unwrapList<SectionGroup>(groupsRaw);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const pendingAnchorRef = useRef<string | null>(null);
  const currentUserId = useAppStore((s) => s.currentUser?.id ?? '');

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ anchor: string }>).detail;
      if (!detail?.anchor) return;
      const target = groups.find((g) => g.section.anchor === detail.anchor);
      if (target) {
        setHighlightedSectionId(target.sectionId);
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>(
            `[data-section-task-id="${target.sectionId}"]`,
          );
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
    };
    window.addEventListener(SECTION_TASK_PANEL_EVENT, handler);
    return () => window.removeEventListener(SECTION_TASK_PANEL_EVENT, handler);
  }, [groups]);

  // 来自正文徽章点击: 直接打开任务选择器 (切到本标签时, 任务面板自动弹出)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ anchor: string }>).detail;
      if (!detail?.anchor) return;
      const target = groups.find((g) => g.section.anchor === detail.anchor);
      if (target) {
        setHighlightedSectionId(target.sectionId);
        setPicker({
          sectionId: target.sectionId,
          projectId,
          documentId,
        });
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>(
            `[data-section-task-id="${target.sectionId}"]`,
          );
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
      } else {
        // sections 还没准备好: 用锚点存到 "pending", groups 变化时再消费
        pendingAnchorRef.current = detail.anchor;
      }
    };
    window.addEventListener(OPEN_PICKER_FOR_ANCHOR_EVENT, handler);
    return () => window.removeEventListener(OPEN_PICKER_FOR_ANCHOR_EVENT, handler);
  }, [groups, projectId, documentId]);

  // groups 变化后消费 pendingAnchor (兜底)
  useEffect(() => {
    if (!pendingAnchorRef.current) return;
    const target = groups.find((g) => g.section.anchor === pendingAnchorRef.current);
    if (target) {
      pendingAnchorRef.current = null;
      setPicker({ sectionId: target.sectionId, projectId, documentId });
      setHighlightedSectionId(target.sectionId);
    }
  }, [groups, projectId, documentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
        加载段落关联中...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        <Link2 size={14} className="mx-auto mb-1 text-muted-foreground/60" />
        文档尚未解析出章节, 无法添加段落关联
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <SectionGroupCard
          key={group.sectionId}
          group={group}
          projectId={projectId}
          currentUserId={currentUserId}
          highlighted={highlightedSectionId === group.sectionId}
          onAdd={() =>
            setPicker({
              sectionId: group.sectionId,
              projectId,
              documentId,
            })
          }
        />
      ))}

      {picker ? (
        <TaskPickerDialog
          open
          onOpenChange={(open) => !open && setPicker(null)}
          projectId={picker.projectId}
          onSelect={(taskId, linkType) => {
            // 触发 SectionGroupCard 内的 mutation (通过 CustomEvent 转发)
            window.dispatchEvent(
              new CustomEvent('apm:create-section-link', {
                detail: {
                  sectionId: picker.sectionId,
                  documentId: picker.documentId,
                  projectId: picker.projectId,
                  taskId,
                  linkType,
                  currentUserId,
                },
              }),
            );
            setPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}

interface SectionGroupCardProps {
  group: SectionGroup;
  projectId: string;
  currentUserId: string;
  highlighted: boolean;
  onAdd: () => void;
}

function SectionGroupCard({
  group,
  projectId,
  currentUserId,
  highlighted,
  onAdd,
}: SectionGroupCardProps) {
  const remove = useDeleteSectionTaskLink(group.sectionId);
  const create = useCreateSectionTaskLink(group.sectionId);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{
        sectionId: string;
        documentId: string;
        projectId: string;
        taskId: string;
        linkType: DocumentTaskLink['linkType'];
        currentUserId: string;
      }>).detail;
      if (!detail || detail.sectionId !== group.sectionId) return;
      if (!detail.currentUserId) return;
      create.mutate({
        taskId: detail.taskId,
        projectId: detail.projectId,
        documentId: detail.documentId,
        sectionId: detail.sectionId,
        linkType: detail.linkType,
        createdBy: detail.currentUserId,
      } as any);
    };
    window.addEventListener('apm:create-section-link', handler);
    return () => window.removeEventListener('apm:create-section-link', handler);
  }, [group.sectionId, currentUserId, create]);

  return (
    <div
      data-section-task-id={group.sectionId}
      className={cn(
        'rounded-lg border border-border bg-card p-3 transition-colors',
        highlighted && 'ring-2 ring-accent-blue/40 bg-accent-blue/5',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              H{group.section.level}
            </span>
            <span className="truncate font-medium text-foreground" title={group.section.title}>
              {group.section.title}
            </span>
            <a
              href={`#${group.section.anchor}`}
              className="text-muted-foreground hover:text-foreground"
              title="跳到该段落"
            >
              <ExternalLink size={10} />
            </a>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {group.links.length === 0
              ? '尚未关联任务'
              : `已关联 ${group.links.length} 个任务`}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onAdd}
          className="h-6 gap-1 px-2 text-[11px]"
        >
          <Plus size={11} /> 添加
        </Button>
      </div>

      {group.links.length > 0 ? (
        <ul className="space-y-1">
          {group.links.map((link) => (
            <li
              key={link.id}
              className="group/li flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5"
            >
              {link.task?.title?.includes('[BUG]') || link.linkType === 'blocks' ? (
                <Bug size={11} className="shrink-0 text-accent-red" />
              ) : (
                <CheckSquare size={11} className="shrink-0 text-accent-blue" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs">
                    {link.task?.title || link.taskId}
                  </span>
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
                  LINK_TYPE_COLORS[link.linkType] ?? 'bg-muted text-muted-foreground',
                )}
              >
                {LINK_TYPE_LABELS[link.linkType] ?? link.linkType}
              </span>
              <button
                type="button"
                onClick={() => remove.mutate(link.id)}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/li:opacity-100"
                aria-label="删除关联"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
