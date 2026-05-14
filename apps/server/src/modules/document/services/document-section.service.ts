// Document Section Service - 使用 Prisma
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import type { CreateDocumentSection } from '../entities/document-section.entity';

@Injectable()
export class DocumentSectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取文档的所有章节
   */
  async getSectionsByDocument(documentId: string) {
    return this.prisma.documentSection.findMany({
      where: { documentId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * 获取单个章节
   */
  async getSection(sectionId: string) {
    const section = await this.prisma.documentSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    return section;
  }

  /**
   * 获取章节嵌套结构
   */
  async getSectionsTree(documentId: string) {
    const sections = await this.getSectionsByDocument(documentId);
    return this.buildTree(sections);
  }

  /**
   * 根据锚点获取章节
   */
  async getSectionByAnchor(documentId: string, anchor: string) {
    return this.prisma.documentSection.findFirst({
      where: { documentId, anchor },
    });
  }

  /**
   * 从 Markdown 内容刷新章节索引
   */
  async refreshSections(documentId: string, sections: CreateDocumentSection[]) {
    // 删除现有章节
    await this.prisma.documentSection.deleteMany({
      where: { documentId },
    });

    // 创建新章节
    if (sections.length === 0) {
      return [];
    }

    return this.prisma.documentSection.createMany({
      data: sections.map((s, index) => ({
        ...s,
        order: index,
        wordCount: s.wordCount || 0,
      })),
    });
  }

  /**
   * 创建章节
   */
  async createSection(data: CreateDocumentSection) {
    return this.prisma.documentSection.create({
      data,
    });
  }

  /**
   * 更新章节
   */
  async updateSection(sectionId: string, data: Partial<CreateDocumentSection>) {
    const section = await this.getSection(sectionId);

    return this.prisma.documentSection.update({
      where: { id: sectionId },
      data,
    });
  }

  /**
   * 删除章节
   */
  async deleteSection(sectionId: string) {
    const result = await this.prisma.documentSection.deleteMany({
      where: { id: sectionId },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }
  }

  /**
   * 构建章节树
   */
  private buildTree(sections: any[]) {
    const map = new Map<string, any>();
    const roots: any[] = [];

    // 设置 children 数组
    sections.forEach((section) => {
      map.set(section.id, { ...section, children: [] });
    });

    // 构建关系
    sections.forEach((section) => {
      const node = map.get(section.id)!;

      if (section.parentId) {
        const parent = map.get(section.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
