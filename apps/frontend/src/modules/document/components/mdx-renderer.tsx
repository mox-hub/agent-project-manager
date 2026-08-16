'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { compileMdx, extractHeadings } from '@/shared/mdx/mdx-pipeline';
import { parseFrontmatter } from '@/modules/document/services/mdx-frontmatter';
import { useSectionTaskLinksByDoc } from '@/modules/document/hooks/use-section-task-links';
import { useDocumentSections } from '@/modules/document/hooks/use-document-sections';
import { SectionTaskBadgeProvider, HeadingChildProvider, MdxHeading } from '@/shared/mdx/components/mdx-heading';
import { cn } from '@/lib/utils';
import type { MdxComponent } from '@/shared/mdx/mdx-pipeline';

const BASE_MDX_COMPONENTS = {
  h1: (props: any) => <MdxHeading level={1} {...props} />,
  h2: (props: any) => <MdxHeading level={2} {...props} />,
  h3: (props: any) => <MdxHeading level={3} {...props} />,
  h4: (props: any) => <MdxHeading level={4} {...props} />,
  h5: (props: any) => <MdxHeading level={5} {...props} />,
  h6: (props: any) => <MdxHeading level={6} {...props} />,
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
  projectId: _projectId,
  onHeadingClick,
  onBadgeClick,
}: MdxRendererProps) {
  const [activeHeading, setActiveHeading] = useState<string | undefined>();
  const contentRef = useRef<HTMLDivElement>(null);
  const [Compiled, setCompiled] = useState<MdxComponent | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  const { body } = useMemo(() => parseFrontmatter(source), [source]);
  const headings = useMemo(() => extractHeadings(source), [source]);

  const [collapsedAnchors, setCollapsedAnchors] = useState<Set<string>>(() => new Set());

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
    setCompileError(null);
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

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    const headingEls = contentRef.current.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
    headingEls.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [source, Compiled]);

  const handleHeadingClick = useCallback(
    (anchor: string) => {
      window.history.pushState(null, '', '#' + anchor);
      onHeadingClick?.(anchor);
    },
    [onHeadingClick],
  );

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
