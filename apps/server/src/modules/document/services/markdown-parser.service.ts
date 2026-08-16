// Markdown 解析服务 - 将 Markdown 解析为章节
import { Injectable } from '@nestjs/common';

export interface ParsedHeading {
  level: number;
  title: string;
  anchor: string;
  content: string;
  startLine: number;
  endLine: number;
  wordCount?: number;
}

export interface ParsedDocument {
  sections: ParsedHeading[];
  tableOfContents: TableOfContentsItem[];
}

export interface TableOfContentsItem {
  level: number;
  title: string;
  anchor: string;
  children?: TableOfContentsItem[];
}

/**
 * Markdown 解析服务
 * 将 Markdown 文本解析为结构化章节
 */
@Injectable()
export class MarkdownParserService {
  /**
   * 解析 Markdown 内容，提取章节
   */
  parseMarkdown(content: string): ParsedDocument {
    const lines = content.split('\n');
    const sections: ParsedHeading[] = [];
    const toc: TableOfContentsItem[] = [];

    let currentSection: ParsedHeading | null = null;
    let currentContent: string[] = [];
    let currentLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      currentLine = i + 1;

      // 检测 heading
      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // 保存之前的章节
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          currentSection.wordCount = this.countWords(currentSection.content);
        }

        // 创建新章节
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        const anchor = this.generateAnchor(title);

        currentSection = {
          level,
          title,
          anchor,
          content: '',
          startLine: currentLine,
          endLine: currentLine,
          wordCount: 0,
        };
        sections.push(currentSection);
        currentContent = [];

        // 添加到目录
        toc.push({
          level,
          title,
          anchor,
        });
      } else if (currentSection) {
        currentContent.push(line);
        currentSection.endLine = currentLine;
      }
    }

    // 保存最后一个章节
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      currentSection.wordCount = this.countWords(currentSection.content);
    }

    // 构建嵌套目录结构
    const nestedToc = this.buildNestedToc(toc);

    return { sections, tableOfContents: nestedToc };
  }

  /**
   * 生成锚点 slug
   */
  generateAnchor(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5-]/g, '') // 保留中英文、数字、下划线、连字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/-+/g, '-') // 多个连字符合并
      .replace(/^-|-$/g, ''); // 去除首尾连字符
  }

  /**
   * 构建嵌套的目录结构
   */
  buildNestedToc(toc: TableOfContentsItem[]): TableOfContentsItem[] {
    const result: TableOfContentsItem[] = [];
    const stack: TableOfContentsItem[] = [];

    for (const item of toc) {
      const node: TableOfContentsItem = { ...item, children: [] };

      // 弹出比当前层级小的元素
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        result.push(node);
      } else {
        const parent = stack[stack.length - 1];
        parent.children = parent.children || [];
        parent.children.push(node);
      }

      stack.push(node);
    }

    return result;
  }

  /**
   * 计算字数
   */
  countWords(text: string): number {
    if (!text) return 0;

    // 移除代码块
    let cleaned = text.replace(/```[\s\S]*?```/g, '');
    // 移除行内代码
    cleaned = cleaned.replace(/`[^`]+`/g, '');
    // 移除链接
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // 移除图片
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
    // 移除 HTML 标签
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // 计算中文字符和英文单词
    const chineseChars = (cleaned.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = cleaned
      .replace(/[\u4e00-\u9fa5]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    return chineseChars + englishWords;
  }

  /**
   * 从章节提取创建 Section 数据
   */
  extractSections(
    documentId: string,
    parsed: ParsedDocument,
  ): Array<{
    documentId: string;
    title: string;
    level: number;
    anchor: string;
    content: string | null;
    order: number;
    wordCount: number;
  }> {
    return parsed.sections.map((section, index) => ({
      documentId,
      title: section.title,
      level: section.level,
      anchor: section.anchor,
      content: section.content || null,
      order: index,
      wordCount: section.wordCount || 0,
    }));
  }

  /**
   * 获取特定章节的内容
   */
  getSectionContent(content: string, anchor: string): string | null {
    const parsed = this.parseMarkdown(content);
    const section = parsed.sections.find((s) => s.anchor === anchor);
    return section ? section.content : null;
  }
}
