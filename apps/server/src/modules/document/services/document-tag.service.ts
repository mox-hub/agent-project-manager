import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import type { Tag, Prisma } from '@prisma/client';

export interface CreateTagInput {
  name: string;
  projectId?: string | null;
  color?: string | null;
  description?: string | null;
  resourceTypes?: Prisma.InputJsonValue;
  createdBy?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateTagInput {
  name?: string;
  color?: string | null;
  description?: string | null;
  resourceTypes?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class DocumentTagService {
  constructor(private readonly prisma: PrismaService) {}

  async listTags(filter?: { projectId?: string }): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: filter?.projectId
        ? { OR: [{ projectId: filter.projectId }, { projectId: null }] }
        : undefined,
      orderBy: [{ projectId: 'asc' }, { name: 'asc' }],
    });
  }

  async getTagById(id: string): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag not found: ${id}`);
    }
    return tag;
  }

  async createTag(input: CreateTagInput): Promise<Tag> {
    if (!input.name?.trim()) {
      throw new BadRequestException('Tag name is required');
    }
    const existing = await this.prisma.tag.findFirst({
      where: { name: input.name.trim(), projectId: input.projectId ?? null },
    });
    if (existing) {
      throw new ConflictException(`Tag with this name already exists: ${input.name}`);
    }
    return this.prisma.tag.create({
      data: {
        name: input.name.trim(),
        projectId: input.projectId ?? null,
        color: input.color ?? null,
        description: input.description ?? null,
        resourceTypes: input.resourceTypes ?? (['document'] as unknown as Prisma.InputJsonValue),
        createdBy: input.createdBy ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  }

  async updateTag(id: string, input: UpdateTagInput): Promise<Tag> {
    const tag = await this.getTagById(id);
    if (input.name && input.name !== tag.name) {
      const conflict = await this.prisma.tag.findFirst({
        where: { name: input.name.trim(), projectId: tag.projectId },
      });
      if (conflict) {
        throw new ConflictException(`Tag with name ${input.name} already exists`);
      }
    }
    return this.prisma.tag.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        color: input.color,
        description: input.description,
        resourceTypes: input.resourceTypes,
        metadata: input.metadata,
      },
    });
  }

  async deleteTag(id: string): Promise<{ id: string }> {
    await this.getTagById(id);
    await this.prisma.tag.delete({ where: { id } });
    return { id };
  }

  async getTagsByDocument(documentId: string): Promise<Tag[]> {
    const links = await this.prisma.documentTag.findMany({
      where: { documentId },
      include: { tag: true },
      orderBy: { createdAt: 'asc' },
    });
    return links.map((l) => l.tag);
  }

  async addTagToDocument(documentId: string, tagId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException(`Document not found: ${documentId}`);
    const tag = await this.getTagById(tagId);
    await this.prisma.documentTag.upsert({
      where: { documentId_tagId: { documentId, tagId: tag.id } },
      create: { documentId, tagId: tag.id },
      update: {},
    });
  }

  async removeTagFromDocument(documentId: string, tagId: string): Promise<void> {
    await this.prisma.documentTag
      .delete({
        where: { documentId_tagId: { documentId, tagId } },
      })
      .catch(() => null);
  }
}
