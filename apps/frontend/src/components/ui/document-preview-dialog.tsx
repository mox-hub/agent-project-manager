/**
 * DocumentPreviewDialog - 文档预览弹窗组件
 * 左侧：目录导航，右侧：文档内容预览
 */

import { useState, useMemo } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Document } from '@/modules/document/api/document-api';
import { MdxRenderer } from '@/modules/document/components/mdx-renderer';
import { extractHeadings } from '@/shared/mdx/mdx-pipeline';
import {
  FileText, BookOpen, Code2, Palette, TestTube2, FolderOpen,
  Copy, Maximize2, X, Link as LinkIcon, GitBranch,
  User, Clock, Sparkles, ExternalLink, List, AlignLeft
} from 'lucide-react';

export interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  requirement: { label: '需求文档', icon: FileText, color: 'text-accent-blue' },
  design: { label: '设计文档', icon: Palette, color: 'text-accent-purple' },
  api: { label: 'API文档', icon: Code2, color: 'text-accent-green' },
  testing: { label: '测试文档', icon: TestTube2, color: 'text-accent-yellow' },
  guide: { label: '用户指南', icon: BookOpen, color: 'text-accent-blue' },
  custom: { label: '自定义', icon: FolderOpen, color: 'text-muted-foreground' },
};

const STATUS_CONFIG = {
  draft: { label: '草稿', color: 'bg-muted text-muted-foreground' },
  reviewing: { label: '审核中', color: 'bg-accent-yellow-light text-accent-yellow' },
  published: { label: '已发布', color: 'bg-accent-green-light text-accent-green' },
};

// 目录现在直接复用 MDX 管道里的 extractHeadings (与 mdx-renderer 同源, slug 算法一致)

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  document,
}: DocumentPreviewDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const catConfig = CATEGORY_CONFIG[document?.category ?? 'custom'];
  const CatIcon = catConfig?.icon ?? FileText;
  const statusConfig = STATUS_CONFIG[document?.status ?? 'draft'];

  const toc = useMemo(() => {
    if (!document?.content) return [];
    return extractHeadings(document.content);
  }, [document?.content]);

  const { copyToClipboard } = useCopyToClipboard();

  const handleCopyToClipboard = () => {
    if (!document) return;
    const text = `# ${document.title}\n\n${document.content}`;
    copyToClipboard(text);
  };

  const handleScrollToSection = (id: string) => {
    setActiveSection(id);
  };

  if (!document) return null;

  const dialogWidth = isFullscreen ? 'max-w-dialog w-dialog h-dialog-screen' : 'max-w-5xl w-dialog-wide h-[85vh]';
  const sidebarWidth = isFullscreen ? 'w-64' : 'w-56';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        keepDefaultWidth={false}
        className={cn(
          'flex flex-col p-0 overflow-hidden transition-all duration-300',
          dialogWidth
        )}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b shrink-0 bg-gradient-to-r from-accent-blue/5 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={cn('shrink-0 rounded-lg p-2.5', catConfig?.color, 'bg-background border shadow-xs')}>
                <CatIcon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-lg font-semibold truncate">{document.title}</h2>
                  {document.isAIGenerated && (
                    <Badge variant="secondary" className="gap-1 text-10 px-1.5 py-0 bg-accent-purple/10 text-accent-purple border-accent-purple/20">
                      <Sparkles size={10} />
                      AI
                    </Badge>
                  )}
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-10', statusConfig.color)}>
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{document.summary}</p>
                <div className="flex items-center gap-3 mt-1.5 text-11 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CatIcon size={11} className={catConfig?.color} />
                    {catConfig?.label}
                  </span>
                  {document.currentVersion && (
                    <span className="flex items-center gap-1">
                      <GitBranch size={11} />
                      {document.currentVersion}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <User size={11} />
                    {document.updatedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(document.updatedAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyToClipboard}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Copy to clipboard"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                <Maximize2 className={cn('h-3.5 w-3.5', isFullscreen && 'rotate-180')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5 pl-13">
              {document.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted/80 px-2 py-0.5 text-11 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {document.linkCount != null && document.linkCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-11 text-muted-foreground">
                  <LinkIcon size={10} />
                  {document.linkCount} 关联
                </span>
              )}
            </div>
          )}
        </div>

        {/* Body - Two Column Layout */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Left Sidebar - Table of Contents */}
          <div className={cn(
            'shrink-0 border-r bg-muted/15 overflow-hidden flex flex-col',
            sidebarWidth
          )}>
            <div className="px-3 py-2.5 border-b bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <List size={12} />
                目录
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {toc.length > 0 ? (
                  <nav className="space-y-0.5">
                    {toc.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleScrollToSection(item.id)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded text-xs transition-all truncate',
                          activeSection === item.id
                            ? 'bg-accent-blue/10 text-accent-blue font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                        style={{ paddingLeft: `${(item.level - 1) * 10 + 8}px` }}
                      >
                        {item.title}
                      </button>
                    ))}
                  </nav>
                ) : (
                  <div className="text-11 text-muted-foreground text-center py-6">
                    <AlignLeft size={18} className="mx-auto mb-1.5 opacity-40" />
                    <p>暂无目录</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Content - Document Preview */}
          <div className="flex-1 overflow-hidden flex flex-col bg-background min-w-0">
            <ScrollArea className="flex-1">
              <div className="p-5 max-w-3xl">
                {/* Document Content - 走真正的 MDX 管道, 与 view page 一致 */}
                <MdxRenderer
                  source={document.content}
                  documentId={document.id}
                  className="tracking-[0.01em]"
                />
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="px-5 py-2.5 border-t bg-muted/20 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-11 text-muted-foreground">
                  更新于 {new Date(document.updatedAt).toLocaleString('zh-CN')}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    className="gap-1.5 h-7 text-11 px-3"
                  >
                    <Copy size={12} />
                    复制
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 h-7 text-11 px-3"
                    onClick={() => window.open(`/app/documents/${document.id}`, '_blank')}
                  >
                    <ExternalLink size={12} />
                    编辑器
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
