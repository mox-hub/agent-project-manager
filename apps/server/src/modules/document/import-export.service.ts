import { Injectable } from '@nestjs/common';

@Injectable()
export class ImportExportService {
  parseMarkdown(content: string): {
    title: string;
    summary: string;
    content: string;
    headings: Array<{ level: number; text: string; anchor: string }>;
  } {
    const lines = content.split('\n');
    let title = '';
    let summary = '';

    // Extract title from first H1
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Extract summary from first paragraph after title
    const parts = content.split(/^#\s+.+$/m);
    if (parts.length > 1) {
      const rest = parts[1].trim();
      const paragraphs = rest.split(/\n\n+/);
      if (paragraphs.length > 0) {
        summary = paragraphs[0].replace(/^#+\s+/gm, '').substring(0, 200);
      }
    }

    // Extract headings
    const headings: Array<{ level: number; text: string; anchor: string }> = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        anchor: this.generateAnchor(match[2]),
      });
    }

    return { title, summary, content, headings };
  }

  generateAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  exportToHtml(markdown: string, title?: string): string {
    const parsed = this.parseMarkdown(markdown);
    const documentTitle = title || parsed.title || 'Untitled Document';

    // Simple markdown to HTML conversion
    const html = markdown
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Headers
      .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Lists
      .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(documentTitle)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; border-radius: 4px; }
    code { background: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px; }
    pre code { background: none; padding: 0; }
    a { color: #0066cc; }
    li { margin: 0.5em 0; }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async importFromFile(
    file: Buffer,
    filename: string,
  ): Promise<{
    title: string;
    content: string;
    summary: string;
  }> {
    const content = file.toString('utf-8');
    const parsed = this.parseMarkdown(content);

    // Use filename as fallback title
    const title = parsed.title || filename.replace(/\.(md|markdown)$/i, '');

    return {
      title,
      content: parsed.content,
      summary: parsed.summary,
    };
  }

  generateMarkdown(
    document: {
      title: string;
      content: string;
      category?: string;
      tags?: string[];
    },
    options?: {
      includeMetadata?: boolean;
      includeToc?: boolean;
    },
  ): string {
    const { title, content, category, tags } = document;
    const opts = { includeMetadata: true, includeToc: false, ...options };

    let output = '';

    if (opts.includeMetadata) {
      output += `---\n`;
      output += `title: ${title}\n`;
      if (category) output += `category: ${category}\n`;
      if (tags && tags.length > 0) output += `tags: [${tags.join(', ')}]\n`;
      output += `---\n\n`;
    }

    output += `# ${title}\n\n`;
    output += content;

    return output;
  }
}
