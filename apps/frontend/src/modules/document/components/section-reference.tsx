// Section Reference Component - 章节引用组件
import React, { memo, useCallback } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import * as Icons from 'lucide-react';
import type { DocumentSection } from '../api/document-section-api';

interface SectionReferenceProps {
  documentId: string;
  section?: DocumentSection;
  anchor?: string;
  showPreview?: boolean;
  onCopy?: (reference: string) => void;
  onOpenInAI?: (reference: string) => void;
}

/**
 * 生成引用字符串
 */
function generateReference(documentId: string, anchor?: string): string {
  if (anchor) {
    return `[[doc:${documentId}#${anchor}]]`;
  }
  return `[[doc:${documentId}]]`;
}

/**
 * 章节引用组件
 * 显示章节的面包屑路径和引用操作
 */
export const SectionReference = memo(function SectionReference({
  documentId,
  section,
  anchor,
  showPreview = false,
  onCopy,
  onOpenInAI,
}: SectionReferenceProps) {
  const reference = generateReference(documentId, anchor || section?.anchor);

  const { copyToClipboard, isCopied: copied } = useCopyToClipboard({
    timeout: 2000,
  });

  const handleCopy = useCallback(() => {
    copyToClipboard(reference);
    onCopy?.(reference);
  }, [copyToClipboard, reference, onCopy]);

  const handleOpenInAI = useCallback(() => {
    onOpenInAI?.(reference);
  }, [reference, onOpenInAI]);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      {/* 引用字符串 */}
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted/50 px-2 py-1 text-xs font-mono">
          {reference}
        </code>

        {/* 复制按钮 */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="复制引用"
        >
          {copied ? (
            <>
              <Icons.Check size={14} className="text-accent-green" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Icons.Copy size={14} />
              <span>复制</span>
            </>
          )}
        </button>

        {/* AI 中打开 */}
        {onOpenInAI && (
          <button
            type="button"
            onClick={handleOpenInAI}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent-purple transition-colors hover:bg-accent-purple/10"
            title="在 AI 中打开"
          >
            <Icons.Sparkles size={14} />
            <span>AI</span>
          </button>
        )}
      </div>

      {/* 面包屑路径 */}
      {(section || anchor) && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Icons.FileText size={12} />
          <span>文档</span>
          <Icons.ChevronRight size={10} />
          {section?.level && (
            <>
              <span>H{section.level}</span>
              <Icons.ChevronRight size={10} />
            </>
          )}
          <span className="truncate">{section?.title || anchor}</span>
        </div>
      )}

      {/* 内容预览 */}
      {showPreview && section?.content && (
        <div className="mt-3 rounded border border-border/50 bg-muted/30 p-2">
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {section.content}
          </p>
        </div>
      )}
    </div>
  );
});

/**
 * 引用气泡（内联显示）
 */
export function InlineSectionReference({
  documentId,
  section,
  anchor,
  onClick,
}: {
  documentId: string;
  section?: DocumentSection;
  anchor?: string;
  onClick?: () => void;
}) {
  const reference = generateReference(documentId, anchor || section?.anchor);

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 rounded-md bg-accent-purple/10 px-1.5 py-0.5 text-xs text-accent-purple transition-colors hover:bg-accent-purple/20"
      title={reference}
    >
      <Icons.FileText size={12} />
      <span className="truncate max-w-25">
        {section?.title || anchor}
      </span>
    </button>
  );
}

/**
 * 引用列表
 */
export function ReferenceList({
  references,
  onSelect,
}: {
  references: Array<{
    documentId: string;
    sectionId?: string;
    anchor?: string;
    title?: string;
  }>;
  onSelect: (ref: { documentId: string; anchor?: string }) => void;
}) {
  if (references.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <Icons.FileText className="mx-auto h-6 w-6 text-muted-foreground/50" />
        <EmptyState title="暂无引用" className="min-h-0 border-0 py-4" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {references.map((ref, index) => (
        <button
          key={`${ref.documentId}-${ref.anchor || index}`}
          type="button"
          onClick={() => onSelect(ref)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
        >
          <Icons.FileText size={14} className="shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">
            {ref.title || ref.documentId}
          </span>
          {ref.anchor && (
            <span className="shrink-0 text-xs text-muted-foreground">
              #{ref.anchor}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
