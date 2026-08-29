/**
 * MarkdownView - 运行时 Markdown 渲染（react-markdown + remark-gfm）
 *
 * 用于任务/BUG 描述与评论正文：GFM 表格 / 任务清单 / 删除线 / 自动链接，
 * 排版为紧凑详情页风格（text-sm 基线）。文档模块的 MDX 管线（shared/mdx）面向
 * 可编译文档，不适用于任意用户输入，故此处独立轻量渲染。
 */
import { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const components: Components = {
  h1: ({ children }) => <h1 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h4>,
  h5: ({ children }) => <h5 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h5>,
  h6: ({ children }) => <h6 className="mb-1 mt-3 text-xs font-semibold first:mt-0">{children}</h6>,
  p: ({ children }) => <p className="mb-2 text-sm leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  input: (props) => (
    <input
      {...props}
      className="mr-1.5 size-3.5 translate-y-0.5 rounded-xs accent-accent-blue"
    />
  ),
  // GFM 任务清单项去掉默认列表符（ li.task-list-item 由 remark-gfm 标注）
  li: ({ children, className, ...rest }) => (
    <li
      {...rest}
      className={cn(
        'text-sm leading-relaxed',
        className?.includes('task-list-item') && 'list-none',
      )}
    >
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-border pl-3 text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...rest }) => {
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) {
      return (
        <code className={cn('font-mono text-xs', className)} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-xs bg-muted px-1 py-0.5 font-mono text-13"
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 leading-relaxed last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <Table className="my-2 border-y border-border last:mb-0 [&_th]:border-border [&_td]:border-border/60">
      {children}
    </Table>
  ),
  thead: ({ children }) => <TableHeader className="[&_th]:bg-muted/40 [&_th]:text-xs [&_th]:font-semibold">{children}</TableHeader>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableHead className="px-2.5 py-1.5 text-left">{children}</TableHead>,
  td: ({ children }) => <TableCell className="px-2.5 py-1.5">{children}</TableCell>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-blue underline underline-offset-2 hover:text-accent-blue/80"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-border" />,
  img: (props) => (
    <img {...props} className="my-2 max-w-full rounded-lg" loading="lazy" />
  ),
};

export function MarkdownView({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const memoComponents = useMemo(() => components, []);
  return (
    <div className={cn('break-words text-foreground', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={memoComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
