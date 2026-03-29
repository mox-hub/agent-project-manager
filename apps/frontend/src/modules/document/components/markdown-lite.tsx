import { cn } from '@/lib/utils';

export type MarkdownHeading = {
  id: string;
  title: string;
  level: number;
};

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

type ParsedMarkdown = {
  blocks: MarkdownBlock[];
  headings: MarkdownHeading[];
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .slice(0, 48);
}

export function parseMarkdown(content: string): ParsedMarkdown {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  const headings: MarkdownHeading[] = [];

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    blocks.push({ type: 'paragraph', text: paragraphBuffer.join(' ').trim() });
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push({ type: 'list', items: [...listBuffer] });
    listBuffer = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const id = `md-${index}-${toSlug(title) || 'section'}`;
      blocks.push({ type: 'heading', level, text: title, id });
      headings.push({ id, title, level });
      return;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listBuffer.push(listMatch[1].trim());
      return;
    }

    if (trimmed.length === 0) {
      flushParagraph();
      flushList();
      return;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  });

  flushParagraph();
  flushList();

  return { blocks, headings };
}

export function MarkdownLite({
  blocks,
  className,
}: {
  blocks: MarkdownBlock[];
  className?: string;
}) {
  return (
    <div className={cn('text-foreground', className)}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h1 key={block.id} id={block.id} className="mb-4 text-3xl font-semibold leading-tight md:text-4xl">
                {block.text}
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2 key={block.id} id={block.id} className="mb-3 mt-7 text-2xl font-semibold leading-tight">
                {block.text}
              </h2>
            );
          }
          return (
            <h3 key={block.id} id={block.id} className="mb-2 mt-5 text-xl font-semibold leading-tight">
              {block.text}
            </h3>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={`list-${index}`} className="mb-4 list-disc space-y-1.5 pl-5 text-base leading-relaxed">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="mb-4 text-base leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
