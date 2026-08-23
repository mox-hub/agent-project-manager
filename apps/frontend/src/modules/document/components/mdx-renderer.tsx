'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { compileMdx, extractHeadings } from '@/shared/mdx/mdx-pipeline';
import { useSectionTaskLinksByDoc } from '@/modules/document/hooks/use-section-task-links';
import { useDocumentSections } from '@/modules/document/hooks/use-document-sections';
import { SectionTaskBadgeProvider, HeadingChildProvider, MdxHeading } from '@/shared/mdx/components/mdx-heading';
import { cn } from '@/lib/utils';
import type { MdxComponent } from '@/shared/mdx/mdx-pipeline';

const BASE_MDX_COMPONENTS = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <MdxHeading level={1} {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <MdxHeading level={2} {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <MdxHeading level={3} {...props} />,
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => <MdxHeading level={4} {...props} />,
  h5: (props: React.HTMLAttributes<HTMLHeadingElement>) => <MdxHeading level={5} {...props} />,
  h6: (props: React.HTMLAttributes<HTMLHeadingElement>) => <MdxHeading level={6} {...props} />,
};

interface MdxRendererProps {
  source: string;
  className?: string;
  documentId?: string;
  projectId?: string;
  onHeadingClick?: (anchor: string) => void;
  onBadgeClick?: (detail: BadgeClickDetail) => void;
}

export const SECTION_TASK_PANEL_EVENT = 'apm:open-section-task-panel';
export const OPEN_PICKER_FOR_ANCHOR_EVENT = 'apm:open-picker-for-anchor';

export interface BadgeClickDetail {
  anchor: string;
  count: number;
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

export function MdxRenderer({
  source,
  className,
  documentId,
  onBadgeClick,
}: MdxRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [Compiled, setCompiled] = useState<MdxComponent | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  const headings = useMemo(() => extractHeadings(source), [source]);

  const [collapsedAnchors, setCollapsedAnchors] = useState<Set<string>>(() => new Set());

  // 记录上一次渲染的 source：变化时重置编译产物与错误（渲染期间调整，
  // 避免在 effect 中同步 setState 造成级联渲染）
  const [prevSource, setPrevSource] = useState(source);
  if (prevSource !== source) {
    setPrevSource(source);
    setCompiled(null);
    setCompileError(null);
  }

  const hasChildAnchors = useCallback(
    (anchor: string, level: number): boolean => {
      const idx = headings.findIndex((h) => h.anchor === anchor && h.level === level);
      if (idx === -1) return false;
      for (let i = idx + 1; i < headings.length; i += 1) {
        if (headings[i].level <= level) return false;
        if (headings[i].level === level + 1) return true;
      }
      return false;
    },
    [headings],
  );

  const toggleCollapse = useCallback((anchor: string) => {
    setCollapsedAnchors((prev) => {
      const next = new Set(prev);
      if (next.has(anchor)) next.delete(anchor);
      else next.add(anchor);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    compileMdx(source)
      .then((result) => {
        if (!cancelled) setCompiled(() => result.Component);
      })
      .catch((err) => {
        if (!cancelled) {
          setCompiled(null);
          setCompileError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  const sectionsQuery = useDocumentSections(documentId ?? '');
  const linksGroupedQuery = useSectionTaskLinksByDoc(documentId ?? '');

  const linkCountByAnchor = useMemo(() => {
    const map = new Map<string, number>();
    const sections = unwrapList<{ id: string; anchor: string }>(sectionsQuery.data);
    const groups = unwrapList<{ sectionId: string; links: unknown[] }>(linksGroupedQuery.data);
    const sectionAnchorById = new Map<string, string>();
    sections.forEach((s) => {
      if (s.anchor) sectionAnchorById.set(s.id, s.anchor);
    });
    groups.forEach((group) => {
      const anchor = sectionAnchorById.get(group.sectionId);
      if (anchor && Array.isArray(group.links) && group.links.length > 0) {
        map.set(anchor, group.links.length);
      }
    });
    return map;
  }, [sectionsQuery.data, linksGroupedQuery.data]);

  return (
    <SectionTaskBadgeProvider value={{ linkCountByAnchor, onBadgeClick }}>
      <HeadingChildProvider value={{ collapsedAnchors, toggleCollapse, hasChildAnchors }}>
        <article
          ref={contentRef}
          data-document-id={documentId}
          className={cn('mdx-content max-w-none text-foreground', className)}
        >
          {!source.trim() ? (
            <p className="text-sm text-muted-foreground italic">文档暂无内容</p>
          ) : compileError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              MDX 编译失败: {compileError}
            </div>
            ) : Compiled ? (
              <Compiled components={BASE_MDX_COMPONENTS} />
            ) : (
            <p className="text-sm text-muted-foreground">正在编译文档…</p>
          )}
        </article>
      </HeadingChildProvider>
    </SectionTaskBadgeProvider>
  );
}
