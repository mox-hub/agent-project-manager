import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SubmitApprovalDto, ResolveApprovalDto } from './dto/approval.dto';

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async submitForReview(documentId: string, userId: string, dto: SubmitApprovalDto) {
    // Verify document exists and is not deleted
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.isDeleted) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Check if there's already a pending approval
    const existingApproval = await this.prisma.documentApproval.findFirst({
      where: {
        documentId,
        status: 'pending',
      },
    });

    if (existingApproval) {
      throw new BadRequestException('Document already has a pending approval');
    }

    // Update document status to reviewing
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'reviewing' },
    });

    // Create approval request
    return this.prisma.documentApproval.create({
      data: {
        documentId,
        submitterId: userId,
        status: 'pending',
        comment: dto.comment,
        version: this.getCurrentVersion(document.content),
      },
    });
  }

  async findAll(query: { status?: string; documentId?: string; submitterId?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.documentId) where.documentId = query.documentId;
    if (query.submitterId) where.submitterId = query.submitterId;

    return this.prisma.documentApproval.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            authorId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const approval = await this.prisma.documentApproval.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            content: true,
            authorId: true,
            status: true,
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException(`Approval ${id} not found`);
    }

    return approval;
  }

  async resolve(id: string, userId: string, dto: ResolveApprovalDto) {
    const approval = await this.prisma.documentApproval.findUnique({
      where: { id },
      include: { document: true },
    });

    if (!approval) {
      throw new NotFoundException(`Approval ${id} not found`);
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException(`Approval already ${approval.status}`);
    }

    // Update approval
    const updated = await this.prisma.documentApproval.update({
      where: { id },
      data: {
        status: dto.status,
        approverId: userId,
        comment: dto.comment,
        resolvedAt: new Date(),
      },
    });

    // Update document status based on decision
    const newStatus = dto.status === 'approved' ? 'published' : 'draft';
    await this.prisma.document.update({
      where: { id: approval.documentId },
      data: {
        status: newStatus,
        publishedAt: dto.status === 'approved' ? new Date() : undefined,
      },
    });

    return updated;
  }

  async cancel(id: string, userId: string) {
    const approval = await this.prisma.documentApproval.findUnique({
      where: { id },
    });

    if (!approval) {
      throw new NotFoundException(`Approval ${id} not found`);
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException(`Cannot cancel a ${approval.status} approval`);
    }

    // Only submitter or document author can cancel
    const doc = await this.prisma.document.findUnique({
      where: { id: approval.documentId },
      select: { authorId: true },
    });
    if (approval.submitterId !== userId && doc?.authorId !== userId) {
      throw new BadRequestException('Only submitter or document author can cancel approval');
    }

    // Update document status back to draft
    await this.prisma.document.update({
      where: { id: approval.documentId },
      data: { status: 'draft' },
    });

    // Delete the approval
    await this.prisma.documentApproval.delete({ where: { id } });
  }

  async getPendingApprovals(userId?: string) {
    const where: any = { status: 'pending' };
    // If userId provided, filter by documents authored by user
    if (userId) {
      where.document = { authorId: userId };
    }

    return this.prisma.documentApproval.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            authorId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getCurrentVersion(content: string): string {
    // Simple version based on content length
    const length = content?.length || 0;
    return `v${Math.floor(length / 1000)}.0`;
  }
}
