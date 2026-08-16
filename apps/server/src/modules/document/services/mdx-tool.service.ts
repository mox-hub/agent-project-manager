import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require('gray-matter');

export interface DocumentFrontmatter {
  title?: string;
  author?: string;
  tags?: string[];
  category?: string;
  created?: string;
  updated?: string;
  summary?: string;
  coverImage?: string;
  draft?: boolean;
  custom?: Record<string, unknown>;
}

export interface ParseResult {
  frontmatter: DocumentFrontmatter;
  body: string;
}

export interface Heading {
  id: string;
  title: string;
  level: number;
  anchor: string;
}

@Injectable()
export class MdxToolService {
  parseFrontmatter(content: string): ParseResult {
    if (!content.trim().startsWith('---')) {
      return { frontmatter: {}, body: content };
    }
    const { data, content: body } = matter(content);
    return { frontmatter: data as DocumentFrontmatter, body };
  }

  stripFrontmatter(content: string): string {
    const { body } = this.parseFrontmatter(content);
    return body;
  }

  validateMdx(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const { body } = this.parseFrontmatter(content);

      const openBraces = (body.match(/\{/g) || []).length;
      const closeBraces = (body.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push(
          `JSX brace mismatch: ${openBraces} '{' vs ${closeBraces} '}'`,
        );
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Unknown parse error');
    }

    return { valid: errors.length === 0, errors };
  }

  extractHeadings(content: string): Heading[] {
    const { body } = this.parseFrontmatter(content);
    const lines = body.replace(/\r\n/g, '\n').split('\n');
    const headings: Heading[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2].trim();
        const anchor = title
          .toLowerCase()
          .replace(/[\s]+/g, '-')
          .replace(/[^\w\u4e00-\u9fa5-]/g, '')
          .slice(0, 48);
        headings.push({ id: anchor, title, level, anchor });
      }
    }

    return headings;
  }

  renderToHtml(content: string): {
    html: string;
    frontmatter: DocumentFrontmatter;
  } {
    const { frontmatter, body } = this.parseFrontmatter(content);
    const html = this.markdownToHtml(body);
    return { html, frontmatter };
  }

  private markdownToHtml(source: string): string {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length === 0) return;
      html += `<p>${paragraphBuffer.join(' ')}</p>\n`;
      paragraphBuffer = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        const anchor = title
          .toLowerCase()
          .replace(/[\s]+/g, '-')
          .replace(/[^\w\u4e00-\u9fa5-]/g, '')
          .slice(0, 48);
        html += `<h${level} id="${anchor}">${title}</h${level}>\n`;
        continue;
      }

      if (trimmed === '') {
        flushParagraph();
        continue;
      }

      paragraphBuffer.push(trimmed);
    }

    flushParagraph();

    return html;
  }

  stringifyFrontmatter(
    body: string,
    data: Partial<DocumentFrontmatter>,
  ): string {
    return matter.stringify(body, data);
  }
}
