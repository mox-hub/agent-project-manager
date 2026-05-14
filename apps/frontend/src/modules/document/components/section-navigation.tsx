// Section Navigation Component - 章节导航组件
import React, { memo, useState } from 'react';
import * as Icons from 'lucide-react';
import type { DocumentSection } from '../api/document-section-api';
import { generateSectionUrl } from '../hooks/use-document-sections';

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
}

const SectionItemComponent = memo(function SectionItemComponent({
  section,
  documentId,
  currentAnchor,
  depth,
  onSelectSection,
}: SectionItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = section.children && section.children.length > 0;
  const isActive = currentAnchor === section.anchor;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onSelectSection?.(section);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isActive}
        tabIndex={0}
        className={`
          group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5
          transition-colors duration-100
          ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* 展开/折叠图标 */}
        {hasChildren ? (
          <button
            type="button"
            className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <Icons.ChevronRight
              size={14}
              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Heading 图标 */}
        <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
          H{section.level}
        </span>

        {/* 标题 */}
        <span className={`flex-1 truncate text-sm ${isActive ? 'font-medium' : ''}`}>
          {section.title}
        </span>

        {/* 字数 */}
        {section.wordCount > 0 && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {section.wordCount}
          </span>
        )}
      </div>

      {/* 子章节 */}
      {hasChildren && isExpanded && (
        <div role="group">
          {section.children!.map((child) => (
            <SectionItemComponent
              key={child.id}
              section={child}
              documentId={documentId}
              currentAnchor={currentAnchor}
              depth={depth + 1}
              onSelectSection={onSelectSection}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const SectionNavigation = memo(function SectionNavigation({
  sections,
  documentId,
  currentAnchor,
  onSelectSection,
}: SectionNavigationProps) {
  return (
    <nav
      role="tree"
      aria-label="文档章节导航"
      className="h-full overflow-y-auto py-2"
    >
      {sections.map((section) => (
        <SectionItemComponent
          key={section.id}
          section={section}
          documentId={documentId}
          currentAnchor={currentAnchor}
          depth={0}
          onSelectSection={onSelectSection}
        />
      ))}
    </nav>
  );
});

/**
 * 简单的扁平章节列表
 */
export function FlatSectionList({
  sections,
  documentId,
  currentAnchor,
  onSelectSection,
}: SectionNavigationProps) {
  const flattenSections = (items: DocumentSection[]): DocumentSection[] => {
    const result: DocumentSection[] = [];
    for (const section of items) {
      result.push(section);
      if (section.children && section.children.length > 0) {
        result.push(...flattenSections(section.children));
      }
    }
    return result;
  };

  const flatSections = flattenSections(sections);

  return (
    <nav aria-label="文档章节" className="space-y-1 py-2">
      {flatSections.map((section) => {
        const isActive = currentAnchor === section.anchor;
        return (
          <button
            key={section.id}
            type="button"
            className={`
              flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left
              transition-colors duration-100
              ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}
            `}
            onClick={() => onSelectSection?.(section)}
          >
            <span className="text-[10px] font-medium text-muted-foreground">
              H{section.level}
            </span>
            <span
              className={`truncate text-sm ${isActive ? 'font-medium' : ''}`}
            >
              {section.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
