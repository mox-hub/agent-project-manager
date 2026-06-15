// Document Version Service - 使用 Prisma
// 主路径仍是 DB DocumentVersion 表, Git 仅作为冗余同步层。
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import type { CreateDocumentVersion } from '../entities/document-version.entity';
import { MarkdownParserService } from './markdown-parser.service';
import { DocsGitService } from './docs-git.service';

export interface CreateVersionOptions {
  content: string;
  summary?: string;
  createdBy: string;
  isAuto?: boolean;
  customVersionLabel?: string;
}

@Injectable()
export class DocumentVersionService {
  private readonly logger = new Logger(DocumentVersionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly markdownParser: MarkdownParserService,
    private readonly docsGit: DocsGitService,
  ) {}

  /**
   * 获取文档的版本历史
   */
  async getVersionsByDocument(documentId: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取特定版本
   */
  async getVersion(versionId: string) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    return version;
  }

  /**
   * 获取最新版本
   */
  async getLatestVersion(documentId: string) {
    return this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 创建新版本 (主路径, 同时尝试 Git 同步)
   */
  async createVersion(
    documentId: string,
    content: string,
    createdBy: string,
    summary?: string,
  ) {
    return this.createVersionWithOptions(documentId, {
      content,
      summary,
      createdBy,
    });
  }

  /**
   * 创建版本 (含自动快照/重命名能力)
   */
  async createVersionWithOptions(documentId: string, options: CreateVersionOptions) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // 与最新版本内容相同 → 返回现有版本, 不创建
    const latest = await this.getLatestVersion(documentId);
    if (latest && latest.content === options.content) {
      return latest;
    }

    const versionNumber = options.customVersionLabel ?? this.generateVersionNumber(latest?.version);
    const parsed = this.markdownParser.parseMarkdown(options.content);
    const sectionsJson = JSON.stringify(parsed.tableOfContents);

    const created = await this.prisma.documentVersion.create({
      data: {
        documentId,
        version: versionNumber,
        content: options.content,
        sectionsJson,
        summary: options.summary || (options.isAuto ? `自动快照 ${versionNumber}` : `版本 ${versionNumber}`),
        wordCount: this.markdownParser.countWords(options.content),
        createdBy: options.createdBy,
      },
    });

    // 同步到 Git (失败不阻塞, 但记录 warn)
    try {
      if (!doc.projectId) {
        this.logger.warn(`Document ${documentId} has no projectId, skip git sync`);
        return created;
      }
      const author = await this.resolveAuthor(options.createdBy);
      const fileName = this.resolveRepoFileName(doc);
      await this.docsGit.commitFile({
        projectId: doc.projectId,
        documentId,
        fileName,
        content: options.content,
        message: options.isAuto
          ? `auto: ${doc.title} → ${versionNumber}`
          : `${doc.title} ${versionNumber}${options.summary ? ': ' + options.summary : ''}`,
        author,
      });
    } catch (err) {
      // Git 同步失败不影响主流程
      // eslint-disable-next-line no-console
      console.warn('[DocumentVersionService] git sync failed:', err);
    }

    return created;
  }

  /**
   * 重命名版本
   */
  async renameVersion(versionId: string, newLabel: string) {
    if (!newLabel || !newLabel.trim()) {
      throw new BadRequestException('版本名不能为空');
    }
    const version = await this.getVersion(versionId);
    return this.prisma.documentVersion.update({
      where: { id: versionId },
      data: { version: newLabel.trim() },
    });
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(versionId: string, createdBy: string) {
    const targetVersion = await this.getVersion(versionId);

    return this.createVersionWithOptions(targetVersion.documentId, {
      content: targetVersion.content,
      createdBy,
      summary: `回滚到版本 ${targetVersion.version}`,
      customVersionLabel: `rollback-${this.nextRollbackLabel()}`,
    });
  }

  private nextRollbackLabel(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  /**
   * 生成版本号 (semver, 递增 patch)
   */
  private generateVersionNumber(currentVersion?: string): string {
    if (!currentVersion) return '1.0.0';
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0], 10) || 0;
    const minor = parseInt(parts[1], 10) || 0;
    const patch = parseInt(parts[2], 10) || 0;
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * 获取版本统计
   */
  async getVersionStats(documentId: string) {
    const versions = await this.getVersionsByDocument(documentId);

    if (versions.length === 0) {
      return {
        totalVersions: 0,
        latestVersion: null as string | null,
        oldestVersion: null as string | null,
        wordCountChange: 0,
      };
    }

    const latest = versions[0];
    const oldest = versions[versions.length - 1];

    return {
      totalVersions: versions.length,
      latestVersion: latest.version,
      oldestVersion: oldest.version,
      wordCountChange: latest.wordCount - oldest.wordCount,
    };
  }

  private resolveRepoFileName(doc: { id: string; title: string }): string {
    const slug = doc.title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'document';
    return `${doc.id}_${slug}.md`;
  }

  private async resolveAuthor(userId: string): Promise<{ name: string; email: string }> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        return {
          name: user.displayName || user.username || 'APM User',
          email: user.email || `${userId}@apm.local`,
        };
      }
    } catch {
      // ignore
    }
    return { name: 'APM User', email: `${userId}@apm.local` };
  }
}
