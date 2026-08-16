import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  AddDocumentAuthorDto,
  AddDocumentReviewerDto,
  UpdateDocumentReviewerDto,
  AddDocTaskLinkAssigneeDto,
} from './dto/document-member.dto';

@Injectable()
export class DocumentMemberService {
  private readonly logger = new Logger(DocumentMemberService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addAuthor(dto: AddDocumentAuthorDto) {
    const doc = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const role = dto.role ?? 'author';

    // 查找现有作者
    const existing = await this.prisma.documentAuthor.findFirst({
      where: {
        documentId: dto.documentId,
        memberId: dto.memberId,
        role,
      },
    });

    const result = existing
      ? existing
      : await this.prisma.documentAuthor.create({
          data: {
            documentId: dto.documentId,
            memberId: dto.memberId,
            role,
          },
        });

    // 同步主作者
    if (role === 'author') {
      await this.prisma.document.update({
        where: { id: dto.documentId },
        data: { authorId: member.userId ?? doc.authorId },
      });
    }
    return result;
  }

  async removeAuthor(documentId: string, memberId: string, role: string) {
    const existing = await this.prisma.documentAuthor.findFirst({
      where: { documentId, memberId, role },
    });
    if (!existing) throw new NotFoundException('Author binding not found');
    await this.prisma.documentAuthor.delete({ where: { id: existing.id } });
  }

  async listAuthors(documentId: string) {
    const authors = await this.prisma.documentAuthor.findMany({
      where: { documentId },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    // 手动获取Member信息
    const memberIds = [...new Set(authors.map((a) => a.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        type: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
      },
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));

    return authors.map((author) => ({
      ...author,
      member: memberMap.get(author.memberId),
    }));
  }

  async addReviewer(dto: AddDocumentReviewerDto) {
    const doc = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const existing = await this.prisma.documentReviewer.findFirst({
      where: {
        documentId: dto.documentId,
        memberId: dto.memberId,
      },
    });

    return existing
      ? existing
      : this.prisma.documentReviewer.create({
          data: {
            documentId: dto.documentId,
            memberId: dto.memberId,
            status: 'pending',
          },
        });
  }

  async updateReviewer(
    reviewerId: string,
    dto: UpdateDocumentReviewerDto,
    userId: string,
  ) {
    const r = await this.prisma.documentReviewer.findUnique({
      where: { id: reviewerId },
    });
    if (!r) throw new NotFoundException('Reviewer record not found');

    const updated = await this.prisma.documentReviewer.update({
      where: { id: reviewerId },
      data: {
        status: dto.status,
        reviewedAt: new Date(),
      },
    });

    // 同步 DocumentApproval
    if (dto.status === 'approved' || dto.status === 'rejected') {
      try {
        await this.prisma.documentApproval.create({
          data: {
            documentId: r.documentId,
            status: dto.status,
            submitterId: userId,
            approverId: r.memberId,
          },
        });
      } catch (e) {
        this.logger.warn('DocumentApproval create failed', e);
      }
    }
    return updated;
  }

  async removeReviewer(reviewerId: string) {
    const r = await this.prisma.documentReviewer.findUnique({
      where: { id: reviewerId },
    });
    if (!r) throw new NotFoundException('Reviewer not found');
    await this.prisma.documentReviewer.delete({ where: { id: reviewerId } });
  }

  async listReviewers(documentId: string) {
    const reviewers = await this.prisma.documentReviewer.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
    });

    // 手动获取Member信息
    const memberIds = [...new Set(reviewers.map((r) => r.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        type: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
      },
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));

    return reviewers.map((reviewer) => ({
      ...reviewer,
      member: memberMap.get(reviewer.memberId),
    }));
  }

  async addLinkAssignee(dto: AddDocTaskLinkAssigneeDto) {
    const link = await this.prisma.documentTaskLink.findUnique({
      where: { id: dto.documentTaskLinkId },
    });
    if (!link) throw new NotFoundException('Document task link not found');

    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const role = dto.role ?? 'owner';
    const existing = await this.prisma.documentTaskLinkAssignee.findFirst({
      where: {
        documentTaskLinkId: dto.documentTaskLinkId,
        memberId: dto.memberId,
        role,
      },
    });

    return existing
      ? existing
      : this.prisma.documentTaskLinkAssignee.create({
          data: {
            documentTaskLinkId: dto.documentTaskLinkId,
            memberId: dto.memberId,
            role,
          },
        });
  }

  async removeLinkAssignee(linkAssigneeId: string) {
    const existing = await this.prisma.documentTaskLinkAssignee.findUnique({
      where: { id: linkAssigneeId },
    });
    if (!existing) throw new NotFoundException('Link assignee not found');
    await this.prisma.documentTaskLinkAssignee.delete({
      where: { id: linkAssigneeId },
    });
  }

  async listLinkAssignees(linkId: string) {
    const assignees = await this.prisma.documentTaskLinkAssignee.findMany({
      where: { documentTaskLinkId: linkId },
    });

    // 手动获取Member信息
    const memberIds = [...new Set(assignees.map((a) => a.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        type: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
      },
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));

    return assignees.map((assignee) => ({
      ...assignee,
      member: memberMap.get(assignee.memberId),
    }));
  }
}
