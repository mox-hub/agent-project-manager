// Document Version Service - 使用 Prisma
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import type { CreateDocumentVersion } from '../entities/document-version.entity';
import { MarkdownParserService } from './markdown-parser.service';

@Injectable()
export class DocumentVersionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly markdownParser: MarkdownParserService,
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
   * 创建新版本
   */
  async createVersion(
    documentId: string,
    content: string,
    createdBy: string,
    summary?: string,
  ) {
    // 检查是否与最新版本内容相同
    const latest = await this.getLatestVersion(documentId);
    if (latest && latest.content === content) {
      return latest;
    }

    // 生成版本号
    const versionNumber = this.generateVersionNumber(latest?.version);

    // 解析章节并序列化
    const parsed = this.markdownParser.parseMarkdown(content);
    const sectionsJson = JSON.stringify(parsed.tableOfContents);

    return this.prisma.documentVersion.create({
      data: {
        documentId,
        version: versionNumber,
        content,
        sectionsJson,
        summary: summary || `版本 ${versionNumber}`,
        wordCount: this.markdownParser.countWords(content),
        createdBy,
      },
    });
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(versionId: string, createdBy: string) {
    const targetVersion = await this.getVersion(versionId);

    // 创建新版本，内容为回滚目标的内容
    return this.createVersion(
      targetVersion.documentId,
      targetVersion.content,
      createdBy,
      `回滚到版本 ${targetVersion.version}`,
    );
  }

  /**
   * 生成版本号 (semver)
   */
  private generateVersionNumber(currentVersion?: string): string {
    if (!currentVersion) {
      return '1.0.0';
    }

    const parts = currentVersion.split('.');
    const major = parseInt(parts[0], 10) || 0;
    const minor = parseInt(parts[1], 10) || 0;
    const patch = parseInt(parts[2], 10) || 0;

    // 默认递增 patch 版本
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
}
