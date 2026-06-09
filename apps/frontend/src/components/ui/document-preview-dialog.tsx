/**
 * DocumentPreviewDialog - 文档预览弹窗组件
 * 左侧：目录导航，右侧：文档内容预览
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DocumentItem } from '@/modules/document/api/document-api';
import {
  FileText, BookOpen, Code2, Palette, TestTube2, FolderOpen,
  Copy, Maximize2, X, ChevronRight, Link as LinkIcon, GitBranch,
  User, Clock, Sparkles, ExternalLink, List, AlignLeft
} from 'lucide-react';

export interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentItem | null;
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

// 从 Markdown 内容解析目录结构
interface TocItem {
  level: number;
  text: string;
  id: string;
}

function parseTableOfContents(content: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
    toc.push({ level, text, id });
  }

  return toc;
}

// 简单 Markdown 渲染（处理标题、粗体、列表、代码块）
function renderMarkdown(content: string): string {
  let html = content;

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-muted rounded-lg p-4 my-3 overflow-x-auto font-mono text-xs"><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // 标题
  html = html.replace(/^###### (.+)$/gm, '<h6 class="text-xs font-semibold mt-4 mb-2 text-muted-foreground">$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5 class="text-sm font-semibold mt-4 mb-2">$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold mt-5 mb-2">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-4 border-b pb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent-blue hover:underline" target="_blank">$1</a>');

  // 列表
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$2</li>');

  // 换行
  html = html.replace(/\n\n/g, '</p><p class="my-3">');
  html = html.replace(/\n/g, '<br />');

  // 包裹段落
  if (!html.startsWith('<')) {
    html = `<p class="my-3">${html}</p>`;
  }

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
    return parseTableOfContents(document.content);
  }, [document?.content]);

  const handleCopyToClipboard = () => {
    if (!document) return;
    const text = `# ${document.title}\n\n${document.content}`;
    navigator.clipboard.writeText(text);
  };

  const handleScrollToSection = (id: string) => {
    setActiveSection(id);
  };

  if (!document) return null;

  const dialogWidth = isFullscreen ? 'max-w-[95vw] w-[95vw] h-[95vh]' : 'max-w-5xl w-[90vw] h-[85vh]';
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
              <div className={cn('shrink-0 rounded-lg p-2.5', catConfig?.color, 'bg-background border shadow-sm')}>
                <CatIcon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-lg font-semibold truncate">{document.title}</h2>
                  {document.isAIGenerated && (
                    <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0 bg-accent-purple/10 text-accent-purple border-accent-purple/20">
                      <Sparkles size={10} />
                      AI
                    </Badge>
                  )}
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px]', statusConfig.color)}>
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{document.summary}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
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
            <div className="flex flex-wrap gap-1.5 mt-2.5 pl-[52px]">
              {document.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {document.linkCount != null && document.linkCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground">
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
                        {item.text}
                      </button>
                    ))}
                  </nav>
                ) : (
                  <div className="text-[11px] text-muted-foreground text-center py-6">
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
                {/* Document Meta Info */}
                <div className="mb-4 p-3 rounded-lg bg-muted/40 border border-border/30">
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11px]">
                    <span className="text-muted-foreground">路径</span>
                    <code className="text-muted-foreground/70 truncate">{document.path}</code>
                    <span className="text-muted-foreground">模块</span>
                    <span className="text-muted-foreground/70">{document.module}</span>
                  </div>
                </div>

                {/* Document Content */}
                <div
                  className="prose prose-xs max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-accent-blue"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(document.content) }}
                />
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="px-5 py-2.5 border-t bg-muted/20 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  更新于 {new Date(document.updatedAt).toLocaleString('zh-CN')}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    className="gap-1.5 h-7 text-[11px] px-3"
                  >
                    <Copy size={12} />
                    复制
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 h-7 text-[11px] px-3"
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
