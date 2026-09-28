'use client';

import { useRef } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  ListChecks,
  Table,
  Quote,
  Minus,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MdxEditorRef } from './mdx-editor';

export interface MdxToolbarAction {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  run: (editor: MdxEditorRef) => void;
}

export const MDX_TOOLBAR_ACTIONS: MdxToolbarAction[] = [
  { id: 'bold', label: '粗体', icon: Bold, shortcut: 'Ctrl+B', run: (e) => e.wrapSelection('**') },
  { id: 'italic', label: '斜体', icon: Italic, shortcut: 'Ctrl+I', run: (e) => e.wrapSelection('_') },
  { id: 'strike', label: '删除线', icon: Strikethrough, run: (e) => e.wrapSelection('~~') },
  { id: 'code', label: '行内代码', icon: Code, shortcut: 'Ctrl+E', run: (e) => e.wrapSelection('`') },
  { id: 'h1', label: '一级标题', icon: Heading1, run: (e) => e.insertText('# ', { surroundWith: '' }) },
  { id: 'h2', label: '二级标题', icon: Heading2, run: (e) => e.insertText('## ', { surroundWith: '' }) },
  { id: 'h3', label: '三级标题', icon: Heading3, run: (e) => e.insertText('### ', { surroundWith: '' }) },
  { id: 'link', label: '链接', icon: LinkIcon, run: (e) => e.insertText('[text](https://)', { surroundWith: '' }) },
  { id: 'image', label: '图片', icon: ImageIcon, run: (e) => e.insertText('![alt](https://)', { surroundWith: '' }) },
  { id: 'ul', label: '无序列表', icon: List, run: (e) => e.insertText('- ', { surroundWith: '' }) },
  { id: 'ol', label: '有序列表', icon: ListOrdered, run: (e) => e.insertText('1. ', { surroundWith: '' }) },
  { id: 'task', label: '任务列表', icon: ListChecks, run: (e) => e.insertText('- [ ] ', { surroundWith: '' }) },
  { id: 'table', label: '表格', icon: Table, run: (e) => e.insertText('| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |', { surroundWith: '' }) },
  { id: 'quote', label: '引用', icon: Quote, run: (e) => e.insertText('> ', { surroundWith: '' }) },
  { id: 'hr', label: '分割线', icon: Minus, run: (e) => e.insertText('\n---\n', { surroundWith: '' }) },
  { id: 'tag', label: '插入 frontmatter tags', icon: Tag, run: (e) => e.insertText('tags: [feature, mvp]', { surroundWith: '' }) },
];

export interface MdxToolbarProps {
  editorRef: React.MutableRefObject<MdxEditorRef | null>;
  className?: string;
}

export function MdxToolbar({ editorRef, className }: MdxToolbarProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-9 flex-wrap items-center gap-1 border-b border-border bg-muted/20 px-2 text-foreground',
        className,
      )}
    >
      {MDX_TOOLBAR_ACTIONS.map((action) => {
        const Icon = action.icon;
        const tip = action.shortcut ? `${action.label} (${action.shortcut})` : action.label;
        return (
          <button
            key={action.id}
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-hidden"
            onClick={() => action.run(editorRef.current!)}
            aria-label={action.label}
            title={tip}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
