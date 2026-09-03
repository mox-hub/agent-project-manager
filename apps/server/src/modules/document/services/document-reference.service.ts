// Document Reference Service - 使用 Prisma
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import type {
  CreateDocumentReference,
  ReferenceSourceType,
} from '../entities/document-reference.entity';

@Injectable()
export class DocumentReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建引用
   */
  async createReference(data: CreateDocumentReference) {
    return this.prisma.documentReference.create({
      data: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        documentId: data.documentId,
        sectionId: data.sectionId || null,
        anchor: data.anchor || null,
        context: data.context || null,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * 根据来源获取引用
   */
  async getReferencesBySource(sourceType: string, sourceId: string) {
    return this.prisma.documentReference.findMany({
      where: { sourceType, sourceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 根据文档获取引用
   */
  async getReferencesByDocument(documentId: string) {
    return this.prisma.documentReference.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 根据章节获取引用
   */
  async getReferencesBySection(sectionId: string) {
    return this.prisma.documentReference.findMany({
      where: { sectionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 删除引用
   */
  async deleteReference(referenceId: string) {
    return this.prisma.documentReference.deleteMany({
      where: { id: referenceId },
    });
  }

  /**
   * 删除来源的所有引用
   */
  async deleteReferencesBySource(sourceType: string, sourceId: string) {
    return this.prisma.documentReference.deleteMany({
      where: { sourceType, sourceId },
    });
  }

  /**
   * 批量创建引用
   */
  async createReferencesBatch(references: CreateDocumentReference[]) {
    if (references.length === 0) {
      return [];
    }

    return this.prisma.documentReference.createMany({
      data: references.map((ref) => ({
        sourceType: ref.sourceType,
        sourceId: ref.sourceId,
        documentId: ref.documentId,
        sectionId: ref.sectionId || null,
        anchor: ref.anchor || null,
        context: ref.context || null,
        createdBy: ref.createdBy,
      })),
    });
  }

  /**
   * 获取引用统计
   */
  async getReferenceStats(documentId: string) {
    const references = await this.getReferencesByDocument(documentId);

    const bySourceType: Record<string, number> = {};
    references.forEach((ref: any) => {
      bySourceType[ref.sourceType] = (bySourceType[ref.sourceType] || 0) + 1;
    });

    return {
      totalReferences: references.length,
      bySourceType,
    };
  }

  /**
   * 生成引用字符串
   */
  generateReferenceString(
    documentId: string,
    sectionId?: string,
    anchor?: string,
  ): string {
    let ref = `[[doc:${documentId}`;
    if (sectionId) {
      ref += `:${sectionId}`;
    }
    if (anchor) {
      ref += `#${anchor}`;
    }
    ref += ']]';
    return ref;
  }

  /**
   * 解析引用字符串
   */
  parseReferenceString(
    reference: string,
  ): { documentId: string; sectionId?: string; anchor?: string } | null {
    // 注意：JS 里 `[^]]` 是「任意字符+]」而非「非 ]」（Annex B），必须转义 `]`
    const match = reference.match(
      /\[\[doc:([^:#]+)(?::([^\]]+))?(?:#([^\]]+))?\]\]/,
    );
    if (!match) return null;

    return {
      documentId: match[1],
      sectionId: match[2] || undefined,
      anchor: match[3] || undefined,
    };
  }
}
