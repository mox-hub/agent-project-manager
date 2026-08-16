/**
 * Document ContextPack Integration Service
 *
 * 集成 Document 模块作为 ContextPack 的知识层数据源
 * ContextPack 四层策展中的 Layer 3: 知识层
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';

export interface DocumentContext {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
  tags: string[];
  relevance: number;
  lastUpdated: string;
}

export interface DocumentContextPack {
  projectId: string;
  documents: DocumentContext[];
  totalTokens: number;
  sources: { type: 'document'; count: number }[];
}

export interface DocumentSearchOptions {
  projectId: string;
  query?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  minRelevance?: number;
}

@Injectable()
export class DocumentContextService {
  private readonly DEFAULT_CONTEXT_LIMIT = 10;
  private readonly TOKEN_ESTIMATE_CHARS = 4; // ~4 chars per token

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('DocumentContextService');
  }

  /**
   * 获取项目文档上下文
   * 用于 ContextPack Layer 3: 知识层
   */
  async getProjectDocumentContext(
    projectId: string,
    options?: { limit?: number; query?: string },
  ): Promise<DocumentContextPack> {
    const limit = options?.limit || this.DEFAULT_CONTEXT_LIMIT;

    this.logger.log(`Fetching document context for project ${projectId}`, {
      limit,
      query: options?.query,
    });

    const documents = await this.findRelevantDocuments({
      projectId,
      query: options?.query,
      limit,
    });

    const contexts: DocumentContext[] = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      summary: doc.summary || undefined,
      content: doc.content,
      category: doc.category,
      tags: doc.tags || [],
      relevance: 1.0, // 文档默认相关性为1.0，可根据搜索相关性调整
      lastUpdated: doc.updatedAt.toISOString(),
    }));

    const totalTokens = this.estimateTokens(contexts);

    this.logger.log(
      `Retrieved ${contexts.length} documents, estimated ${totalTokens} tokens`,
      {
        projectId,
        documentCount: contexts.length,
        totalTokens,
      },
    );

    return {
      projectId,
      documents: contexts,
      totalTokens,
      sources: [{ type: 'document', count: contexts.length }],
    };
  }

  /**
   * 搜索相关文档
   */
  async findRelevantDocuments(options: DocumentSearchOptions): Promise<
    Array<{
      id: string;
      title: string;
      summary: string | null;
      content: string;
      category: string;
      tags: string[];
      updatedAt: Date;
    }>
  > {
    const {
      projectId,
      query,
      category,
      tags,
      limit = this.DEFAULT_CONTEXT_LIMIT,
    } = options;

    const where: any = {
      projectId,
      isDeleted: false,
    };

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { summary: { contains: query } },
        { content: { contains: query } },
      ];
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    // 获取文档及其标签
    const documents = await this.prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        summary: true,
        content: true,
        category: true,
        updatedAt: true,
        tags: {
          select: {
            tag: {
              select: { name: true },
            },
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    // 处理标签筛选和映射
    return documents
      .filter((doc) => {
        if (tags && tags.length > 0) {
          const docTags = doc.tags.map((t) => t.tag.name);
          return tags.some((tag) => docTags.includes(tag));
        }
        return true;
      })
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        summary: doc.summary,
        content: doc.content,
        category: doc.category,
        tags: doc.tags.map((t) => t.tag.name),
        updatedAt: doc.updatedAt,
      }));
  }

  /**
   * 获取文档片段（用于长文档截取）
   */
  async getDocumentSections(
    documentId: string,
    options?: { maxTokens?: number },
  ): Promise<{ sections: string[]; totalTokens: number }> {
    const maxTokens = options?.maxTokens || 8000;

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { content: true },
    });

    if (!document) {
      return { sections: [], totalTokens: 0 };
    }

    const content = document.content;
    const totalTokens = Math.ceil(content.length / this.TOKEN_ESTIMATE_CHARS);

    // 按段落分割
    const paragraphs = content.split(/\n\n+/);
    const sections: string[] = [];
    let currentSection = '';
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = Math.ceil(
        paragraph.length / this.TOKEN_ESTIMATE_CHARS,
      );

      if (currentTokens + paragraphTokens > maxTokens && currentSection) {
        sections.push(currentSection.trim());
        currentSection = '';
        currentTokens = 0;
      }

      currentSection += paragraph + '\n\n';
      currentTokens += paragraphTokens;
    }

    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }

    return { sections, totalTokens };
  }

  /**
   * 计算文档相关性分数
   * 基于关键词匹配和上下文相关性
   */
  calculateRelevance(document: DocumentContext, query: string): number {
    if (!query) return 1.0;

    const keywords = this.extractKeywords(query);
    const docText =
      `${document.title} ${document.summary || ''} ${document.content}`.toLowerCase();
    const docKeywords = this.extractKeywords(docText);

    let score = 0;
    for (const keyword of keywords) {
      if (docText.includes(keyword.toLowerCase())) {
        score += 1;
      }
      if (docKeywords.includes(keyword.toLowerCase())) {
        score += 0.5;
      }
    }

    // 归一化到 0-1
    return Math.min(1, score / Math.max(keywords.length, 1));
  }

  /**
   * 发布文档事件到消息总线
   */
  publishDocumentEvent(
    action: 'created' | 'updated' | 'published' | 'deleted',
    documentId: string,
    projectId: string,
    actor?: { type: 'human' | 'agent'; id: string },
  ): void {
    this.logger.logEvent(`document.${action}`, {
      documentId,
      projectId,
      actorType: actor?.type,
      actorId: actor?.id,
    });
  }

  /**
   * 估算token数量
   */
  private estimateTokens(contexts: DocumentContext[]): number {
    let totalChars = 0;
    for (const ctx of contexts) {
      totalChars += ctx.title.length;
      totalChars += ctx.summary?.length || 0;
      totalChars += ctx.content.length;
    }
    return Math.ceil(totalChars / this.TOKEN_ESTIMATE_CHARS);
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }
}
