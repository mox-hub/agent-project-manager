'use client';

import React, { createContext, memo, useCallback, useContext, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Copy, Link2, ListPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface SectionTaskBadgeContextValue {
  linkCountByAnchor: Map<string, number>;
  onBadgeClick?: (detail: { anchor: string; count: number }) => void;
}

const SectionTaskBadgeContext = createContext<SectionTaskBadgeContextValue>({
  linkCountByAnchor: new Map(),
});

export const SectionTaskBadgeProvider = SectionTaskBadgeContext.Provider;

export function useSectionTaskBadge(): SectionTaskBadgeContextValue {
  return useContext(SectionTaskBadgeContext);
}

interface MdxHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
  children?: React.ReactNode;
}

const SIZES: Record<number, string> = {
  1: 'text-3xl font-semibold leading-tight mb-4 mt-2',
  2: 'text-2xl font-semibold leading-tight mb-3 mt-6',
  3: 'text-xl font-semibold leading-tight mb-2 mt-5',
  4: 'text-lg font-semibold leading-tight mb-2 mt-4',
  5: 'text-base font-semibold leading-tight mb-2 mt-3',
  6: 'text-sm font-semibold leading-tight mb-2 mt-3',
};

interface HeadingChildState {
  collapsedAnchors: Set<string>;
  toggleCollapse: (anchor: string) => void;
  hasChildAnchors: (anchor: string, level: number) => boolean;
}

const HeadingChildContext = createContext<HeadingChildState>({
  collapsedAnchors: new Set(),
  toggleCollapse: () => {},
  hasChildAnchors: () => false,
});

export const HeadingChildProvider = HeadingChildContext.Provider;

export function useHeadingChild(): HeadingChildState {
  return useContext(HeadingChildContext);
}

function SectionTaskBadge({ anchor, count }: { anchor: string; count: number }) {
  const { onBadgeClick } = useSectionTaskBadge();
  const [hovered, setHovered] = useState(false);
  const isLinked = count > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBadgeClick?.({ anchor, count });
  };

  return (
    <button
      type="button"
      data-anchor={anchor}
      data-count={count}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={
        isLinked
          ? `本段落已关联 ${count} 个任务, 点击打开任务面板`
          : '为本段落添加任务关联'
      }
      className={cn(
        'section-task-badge group/badge inline-flex items-center gap-1 rounded-full align-middle',
        'px-2 py-0.5 text-11 font-medium leading-none transition-opacity duration-150',
        'cursor-pointer',
        isLinked
          ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
          : 'border border-dashed text-muted-foreground hover:border-solid hover:text-foreground',
        hovered ? 'opacity-100' : 'opacity-55',
      )}
    >
      {isLinked ? <span aria-hidden>📎</span> : <ListPlus size={11} />}
      <span>{isLinked ? `${count} 任务` : '任务'}</span>
    </button>
  );
}

function HeadingActions({ slug, title, level }: { slug: string; title: string; level: number }) {
  const { collapsedAnchors, toggleCollapse, hasChildAnchors } = useHeadingChild();
  const isCollapsed = collapsedAnchors.has(slug);
  const hasChildren = hasChildAnchors(slug, level);

  const handleCopyAnchor = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const url = `${window.location.origin}${window.location.pathname}#${slug}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('已复制锚点链接');
      } catch {
        toast.error('复制锚点失败');
      }
    },
    [slug],
  );

  const handleCopyMarkdown = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const hashes = '#'.repeat(level);
      const md = `${hashes} ${title}`;
      try {
        await navigator.clipboard.writeText(md);
        toast.success('已复制为 Markdown');
      } catch {
        toast.error('复制失败');
      }
    },
    [level, title],
  );

  const handleToggleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCollapse(slug);
    },
    [slug, toggleCollapse],
  );

  return (
    <span className="inline-flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      {hasChildren ? (
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={isCollapsed ? '展开子标题' : '折叠子标题'}
          title={isCollapsed ? '展开子标题' : '折叠子标题'}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
      ) : null}
      <button
        type="button"
        onClick={handleCopyAnchor}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="复制锚点链接"
        title="复制锚点链接"
      >
        <Link2 size={12} />
      </button>
      <button
        type="button"
        onClick={handleCopyMarkdown}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="复制为 Markdown"
        title="复制为 Markdown"
      >
        <Copy size={12} />
      </button>
    </span>
  );
}

export const MdxHeading = memo(function MdxHeading({
  level,
  id,
  className,
  children,
  ...props
}: MdxHeadingProps) {
  const text = typeof children === 'string' ? children : '';
  const slug = id || text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '').slice(0, 48);

  const { linkCountByAnchor } = useSectionTaskBadge();
  const showBadge = level <= 3 && !!slug;
  const count = showBadge ? linkCountByAnchor.get(slug) ?? 0 : 0;

  const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  if (!showBadge) {
    return React.createElement(
      HeadingTag,
      {
        id: slug,
        className: cn(
          'group relative scroll-mt-20 flex items-center gap-2',
          SIZES[level],
          className,
        ),
        ...props,
      },
      React.createElement(
        'span',
        {
          className: cn(
            'inline-flex h-5 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-10 font-medium text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100',
          ),
          'data-heading-level': level,
        },
        `H${level}`,
      ),
      React.createElement('span', { className: 'flex-1 min-w-0' }, children),
      React.createElement(HeadingActions, { slug, title: text, level }),
    );
  }

  return React.createElement(
    HeadingTag,
    {
      id: slug,
      className: cn(
        'group relative scroll-mt-20 flex items-center gap-2',
        SIZES[level],
        className,
      ),
      ...props,
    },
    React.createElement(
      'span',
      {
        className: cn(
          'inline-flex h-5 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-10 font-medium text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100',
        ),
        'data-heading-level': level,
      },
      `H${level}`,
    ),
    React.createElement('span', { className: 'flex-1 min-w-0' }, children),
    React.createElement(SectionTaskBadge, { anchor: slug, count }),
    React.createElement(HeadingActions, { slug, title: text, level }),
  );
});
