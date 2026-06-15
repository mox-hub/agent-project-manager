import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { AsyncFileSyncService } from './services/async-file-sync.service';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly asyncFileSync: AsyncFileSyncService,
  ) {}

  async create(createDocumentDto: CreateDocumentDto, userId: string) {
    console.log('[DocumentService] Creating document:', JSON.stringify(createDocumentDto, null, 2));
    console.log('[DocumentService] User ID:', userId);

    // Calculate word count
    const wordCount = this.calculateWordCount(createDocumentDto.content || '');

    try {
      const document = await this.prisma.document.create({
        data: {
          title: createDocumentDto.title,
          content: createDocumentDto.content || '',
          summary: createDocumentDto.summary,
          category: createDocumentDto.category || 'custom',
          folderId: createDocumentDto.folderId,
          projectId: createDocumentDto.projectId,
          authorId: userId,
          wordCount,
        },
        include: {
          folder: true,
          project: {
            select: { id: true, name: true },
          },
        },
      });

      console.log('[DocumentService] Document created successfully:', document.id);

      // Publish event
      this.messageBus.publish('document.created', {
        documentId: document.id,
        authorId: userId,
      });

      // 异步落盘 markdown 文件; 失败不会阻塞响应, 失败信息可在 /documents/sync/warnings 拉取
      this.asyncFileSync
        .enqueueSave({
          documentId: document.id,
          content: document.content,
          title: document.title,
        })
        .catch((err) => {
          console.error('[DocumentService] File sync enqueue failed:', err);
        });

      return document;
    } catch (error) {
      console.error('[DocumentService] Failed to create document:', error);
      throw error;
    }
  }

  async findAll(query: DocumentQueryDto, userId?: string) {
    const { q, category, status, folderId, projectId, page = 1, pageSize = 20 } = query;

    const where: any = {
      isDeleted: false,
    };

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { summary: { contains: q } },
        { content: { contains: q } },
      ];
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (folderId) {
      where.folderId = folderId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          folder: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          _count: {
            select: {
              sections: true,
              versions: true,
              links: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        folder: true,
        project: {
          select: { id: true, name: true, color: true },
        },
        sections: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            versions: true,
            links: true,
          },
        },
      },
    });

    if (!document || document.isDeleted) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document || document.isDeleted) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const updateData: any = { ...updateDocumentDto };

    // Recalculate word count if content changed
    if (updateDocumentDto.content !== undefined) {
      updateData.wordCount = this.calculateWordCount(updateDocumentDto.content);
    }

    // Set publishedAt if status changed to published
    if (updateDocumentDto.status === 'published' && document.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        folder: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Publish event
    this.messageBus.publish('document.updated', {
      documentId: id,
    });

    // 内容或标题变化时同步落盘
    if (
      updateDocumentDto.content !== undefined ||
      updateDocumentDto.title !== undefined
    ) {
      this.asyncFileSync
        .enqueueSave({
          documentId: id,
          content: updated.content,
          title: updated.title,
        })
        .catch((err) => {
          console.error('[DocumentService] File sync enqueue failed:', err);
        });
    }

    return updated;
  }

  async remove(id: string, hard = false) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    if (hard) {
      await this.prisma.document.delete({ where: { id } });
    } else {
      await this.prisma.document.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    }

    // Publish event
    this.messageBus.publish('document.deleted', {
      documentId: id,
      hard,
    });

    return { success: true };
  }

  async restore(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const restored = await this.prisma.document.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    return restored;
  }

  async getStats(projectId?: string) {
    const where: any = { isDeleted: false };
    if (projectId) {
      where.projectId = projectId;
    }

    const [total, byStatus, byCategory, recent] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.document.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      this.prisma.document.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recent,
    };
  }

  private calculateWordCount(content: string): number {
    if (!content) return 0;
    // Remove markdown syntax and count Chinese + English words
    const cleaned = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
      .replace(/[#*_~`>]/g, '') // Remove markdown symbols
      .trim();

    // Count Chinese characters (each counts as one word)
    const chineseChars = (cleaned.match(/[\u4e00-\u9fff]/g) || []).length;
    // Count English words
    const englishWords = cleaned
      .replace(/[\u4e00-\u9fff]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    return chineseChars + englishWords;
  }
}
