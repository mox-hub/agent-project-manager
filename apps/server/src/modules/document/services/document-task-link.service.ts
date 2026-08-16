// Document Task Link Service - 使用 Prisma
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import type {
  CreateDocumentTaskLink,
  LinkType,
} from '../entities/document-task-link.entity';

@Injectable()
export class DocumentTaskLinkService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取文档关联的任务
   */
  async getLinksByDocument(documentId: string) {
    return this.prisma.documentTaskLink.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取章节关联的任务
   */
  async getLinksBySection(sectionId: string) {
    return this.prisma.documentTaskLink.findMany({
      where: { sectionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取任务关联的文档
   */
  async getLinksByTask(taskId: string) {
    return this.prisma.documentTaskLink.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取项目关联的文档
   */
  async getLinksByProject(projectId: string) {
    return this.prisma.documentTaskLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取单个关联
   */
  async getLinkById(linkId: string) {
    return this.prisma.documentTaskLink.findUnique({
      where: { id: linkId },
    });
  }

  /**
   * 创建关联
   */
  async createLink(data: CreateDocumentTaskLink) {
    return this.prisma.documentTaskLink.create({
      data: {
        documentId: data.documentId || null,
        sectionId: data.sectionId || null,
        taskId: data.taskId,
        projectId: data.projectId,
        linkType: data.linkType || 'references',
        note: data.note || null,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * 删除关联
   */
  async deleteLink(linkId: string) {
    const result = await this.prisma.documentTaskLink.deleteMany({
      where: { id: linkId },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Link ${linkId} not found`);
    }
  }

  /**
   * 删除文档的所有关联
   */
  async deleteLinksByDocument(documentId: string) {
    return this.prisma.documentTaskLink.deleteMany({
      where: { documentId },
    });
  }

  /**
   * 删除章节的所有关联
   */
  async deleteLinksBySection(sectionId: string) {
    return this.prisma.documentTaskLink.deleteMany({
      where: { sectionId },
    });
  }

  /**
   * 更新关联类型
   */
  async updateLinkType(linkId: string, linkType: LinkType) {
    const link = await this.prisma.documentTaskLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException(`Link ${linkId} not found`);
    }

    return this.prisma.documentTaskLink.update({
      where: { id: linkId },
      data: { linkType },
    });
  }

  /**
   * 批量创建关联
   */
  async createLinksBatch(links: CreateDocumentTaskLink[]) {
    if (links.length === 0) {
      return [];
    }

    return this.prisma.documentTaskLink.createMany({
      data: links.map((link) => ({
        documentId: link.documentId || null,
        sectionId: link.sectionId || null,
        taskId: link.taskId,
        projectId: link.projectId,
        linkType: link.linkType || 'references',
        note: link.note || null,
        createdBy: link.createdBy,
      })),
    });
  }

  /**
   * 获取关联统计
   */
  async getLinkStats(documentId: string) {
    const links = await this.getLinksByDocument(documentId);

    const byType: Record<string, number> = {};
    const byProject: Record<string, number> = {};

    links.forEach((link: any) => {
      byType[link.linkType] = (byType[link.linkType] || 0) + 1;
      byProject[link.projectId] = (byProject[link.projectId] || 0) + 1;
    });

    return {
      totalLinks: links.length,
      byType,
      byProject,
    };
  }

  /**
   * 按 sectionId 聚合文档的所有关联
   * - sections 数组按 section 出现顺序排列
   * - 每个 section 即使没有关联也返回 ({ sectionId, links: [] })
   */
  async getLinksGroupedBySection(documentId: string) {
    const sections = await this.prisma.documentSection.findMany({
      where: { documentId },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, anchor: true, order: true, level: true },
    });
    const links = await this.prisma.documentTaskLink.findMany({
      where: { documentId, sectionId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = new Map<string, any[]>();
    for (const link of links) {
      if (!link.sectionId) continue;
      const list = grouped.get(link.sectionId) ?? [];
      list.push(link);
      grouped.set(link.sectionId, list);
    }

    return sections.map((s) => ({
      sectionId: s.id,
      section: s,
      links: grouped.get(s.id) ?? [],
    }));
  }
}
