// Section Navigation Component - 章节导航组件
import React, { memo, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ChevronRight, Search, ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentSection } from '../api/document-section-api';

interface SectionNavigationProps {
  sections: DocumentSection[];
  documentId: string;
  currentAnchor?: string;
  onSelectSection?: (section: DocumentSection) => void;
}

interface SectionItemProps {
  section: DocumentSection;
  documentId: string;
  currentAnchor?: string;
  depth: number;
  onSelectSection?: (section: DocumentSection) => void;
  expandedMap: Record<string, boolean>;
  toggleExpand: (id: string) => void;
  searchTerm: string;
}

function matchesSearch(title: string, term: string): boolean {
  if (!term.trim()) return true;
  return title.toLowerCase().includes(term.trim().toLowerCase());
}

const SectionItemComponent = memo(function SectionItemComponent({
  section,
  currentAnchor,
  onSelectSection,
  expandedMap,
  toggleExpand,
  searchTerm,
}: SectionItemProps) {
  const hasChildren = section.children && section.children.length > 0;
  const isActive = currentAnchor === section.anchor;
  const isExpanded = expandedMap[section.id] ?? true;
  const matches = matchesSearch(section.title, searchTerm);

  if (!matches && !hasChildren) {
    return null;
  }

  const handleClick = () => {
    if (hasChildren) {
      toggleExpand(section.id);
    }
    onSelectSection?.(section);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const childMatches = hasChildren
    ? section.children!.filter((c) => {
        if (matchesSearch(c.title, searchTerm)) return true;
        return c.children?.some((cc) => matchesSearch(cc.title, searchTerm)) ?? false;
      })
    : [];

  // 缩进: H1 不缩进, H2 缩进 1 级, H3 缩进 2 级... H6 缩进 5 级
  const levelDepth = Math.max(0, section.level - 1);

  return (
    <div>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isActive}
        tabIndex={0}
        className={cn(
          'group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5',
          'transition-colors duration-100',
          isActive
            ? 'bg-accent text-accent-foreground'
            : matches
            ? 'hover:bg-accent/50'
            : 'opacity-60 hover:opacity-90 hover:bg-accent/30',
        )}
        style={{ paddingLeft: `${levelDepth * 14 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-heading-level={section.level}
      >
        {hasChildren ? (
          <button
            type="button"
            className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(section.id);
            }}
            aria-label={isExpanded ? '折叠' : '展开'}
          >
            <ChevronRight
              size={14}
              className={cn('transition-transform', isExpanded && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <span
          className={cn(
            'shrink-0 rounded px-1 text-10 font-medium',
            section.level === 1
              ? 'bg-foreground/10 text-foreground'
              : section.level === 2
              ? 'bg-accent-blue/10 text-accent-blue'
              : 'text-muted-foreground',
          )}
          title={`H${section.level}`}
        >
          H{section.level}
        </span>

        <span
          className={cn(
            'flex-1 truncate text-sm',
            isActive && 'font-medium',
          )}
        >
          {highlightMatch(section.title, searchTerm)}
        </span>

        {section.wordCount > 0 && (
          <span className="shrink-0 text-10 text-muted-foreground">
            {section.wordCount}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div role="group">
          {(searchTerm.trim() ? childMatches : section.children!).map((child) => (
            <SectionItemComponent
              key={child.id}
              section={child}
              documentId={child.documentId ?? ''}
              currentAnchor={currentAnchor}
              depth={levelDepth + 1}
              onSelectSection={onSelectSection}
              expandedMap={expandedMap}
              toggleExpand={toggleExpand}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function highlightMatch(text: string, term: string): React.ReactNode {
  if (!term.trim()) return text;
  const lower = text.toLowerCase();
  const needle = term.trim().toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-accent-yellow/30 px-0.5 text-foreground">
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </>
  );
}

function flatten(items: DocumentSection[]): DocumentSection[] {
  const out: DocumentSection[] = [];
  for (const s of items) {
    out.push(s);
    if (s.children?.length) out.push(...flatten(s.children));
  }
  return out;
}

export const SectionNavigation = memo(function SectionNavigation({
  sections,
  documentId,
  currentAnchor,
  onSelectSection,
}: SectionNavigationProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const allFlat = useMemo(() => flatten(sections), [sections]);
  const allExpanded = useMemo(() => allFlat.every((s) => expandedMap[s.id] ?? true), [allFlat, expandedMap]);
  const allCollapsed = useMemo(
    () => allFlat.filter((s) => s.children?.length).every((s) => !(expandedMap[s.id] ?? true)),
    [allFlat, expandedMap],
  );

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    allFlat.forEach((s) => {
      if (s.children?.length) next[s.id] = true;
    });
    setExpandedMap(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    allFlat.forEach((s) => {
      if (s.children?.length) next[s.id] = false;
    });
    setExpandedMap(next);
  };

  // 当前锚点变化时自动展开其祖先链（渲染期间调整，避免在 effect 中同步 setState）
  const [prevAnchor, setPrevAnchor] = useState(currentAnchor);
  if (prevAnchor !== currentAnchor) {
    setPrevAnchor(currentAnchor);
    if (currentAnchor) {
      const target = allFlat.find((s) => s.anchor === currentAnchor);
      if (target) {
        const parentMap = new Map<string, string>();
        for (const s of allFlat) {
          if (s.children) {
            for (const c of s.children) parentMap.set(c.id, s.id);
          }
        }
        const toExpand: string[] = [];
        let cur: string | undefined = target.id;
        while (cur) {
          const p = parentMap.get(cur);
          if (p) toExpand.push(p);
          cur = p;
        }
        if (toExpand.length > 0) {
          setExpandedMap((prev) => {
            const next = { ...prev };
            for (const id of toExpand) next[id] = true;
            return next;
          });
        }
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-1.5 border-b border-border p-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索章节…"
            className="h-7 w-full rounded-md border border-border bg-background pl-7 pr-7 text-xs focus:border-accent-blue focus:outline-hidden"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="清除搜索"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-10 text-muted-foreground">
          <span>{allFlat.length} 章节</span>
          <button
            type="button"
            onClick={allExpanded ? collapseAll : expandAll}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted"
            disabled={allFlat.filter((s) => s.children?.length).length === 0}
          >
            {allCollapsed ? (
              <>
                <ChevronsUpDown size={11} /> 全部展开
              </>
            ) : allExpanded ? (
              <>
                <ChevronsDownUp size={11} /> 全部折叠
              </>
            ) : (
              <>
                <ChevronsUpDown size={11} /> 全部展开
              </>
            )}
          </button>
        </div>
      </div>

      <nav
        role="tree"
        aria-label="文档章节导航"
        className="flex-1 overflow-y-auto py-2"
      >
        {sections.map((section) => (
          <SectionItemComponent
            key={section.id}
            section={section}
            documentId={documentId}
            currentAnchor={currentAnchor}
            depth={0}
            onSelectSection={onSelectSection}
            expandedMap={expandedMap}
            toggleExpand={toggleExpand}
            searchTerm={searchTerm}
          />
        ))}
        {allFlat.length === 0 && (
          <EmptyState title="暂无章节" />
        )}
      </nav>
    </div>
  );
});

/**
 * 简单的扁平章节列表（无层级）
 */
export function FlatSectionList({
  sections,
  currentAnchor,
  onSelectSection,
}: SectionNavigationProps) {
  const flatten = (items: DocumentSection[]): DocumentSection[] => {
    const result: DocumentSection[] = [];
    for (const section of items) {
      result.push(section);
      if (section.children && section.children.length > 0) {
        result.push(...flatten(section.children));
      }
    }
    return result;
  };

  const flatSections = flatten(sections);

  return (
    <nav aria-label="文档章节" className="space-y-1 py-2">
      {flatSections.map((section) => {
        const isActive = currentAnchor === section.anchor;
        return (
          <button
            key={section.id}
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors duration-100',
              isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
            )}
            onClick={() => onSelectSection?.(section)}
          >
            <span className="text-10 font-medium text-muted-foreground">
              H{section.level}
            </span>
            <span
              className={cn('truncate text-sm', isActive && 'font-medium')}
            >
              {section.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
