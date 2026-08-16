import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { Prisma } from '@prisma/client';

export interface CreateApprovalRequestDto {
  executionRunId: string;
  projectId: string;
  taskId?: string;
  requestedAction: string;
  actionType: string;
  riskLevel: string;
  reason?: string;
  approverPolicy?: string;
  expiresAt?: Date;
}

export interface ResolveApprovalDto {
  resolution: 'approved' | 'rejected';
  resolutionNote?: string;
  approvedBy?: string;
  rejectedBy?: string;
}

export interface ApprovalFilterDto {
  status?: string;
  riskLevel?: string;
  actionType?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly messageBus: MessageBusService,
  ) {
    this.logger.setContext('ApprovalService');
  }

  async createApprovalRequest(dto: CreateApprovalRequestDto, userId?: string) {
    const executionRun = await this.prisma.executionRun.findUnique({
      where: { id: dto.executionRunId },
    });

    if (!executionRun) {
      throw new NotFoundException('ExecutionRun not found');
    }

    const approval = await this.prisma.approvalRequest.create({
      data: {
        executionRunId: dto.executionRunId,
        projectId: dto.projectId,
        taskId: dto.taskId,
        requestedAction: dto.requestedAction,
        actionType: dto.actionType,
        riskLevel: dto.riskLevel,
        reason: dto.reason,
        approverPolicy: dto.approverPolicy,
        expiresAt: dto.expiresAt,
        status: 'pending',
      },
      include: {
        executionRun: {
          select: {
            id: true,
            goal: true,
            subjectType: true,
            subjectId: true,
          },
        },
      },
    });

    await this.prisma.executionRun.update({
      where: { id: dto.executionRunId },
      data: { status: 'pending_approval' },
    });

    this.logger.log(`ApprovalRequest created: ${approval.id}`, {
      executionRunId: dto.executionRunId,
      actionType: dto.actionType,
      riskLevel: dto.riskLevel,
    });

    this.messageBus.publish('approval.request.created', {
      approvalRequestId: approval.id,
      executionRunId: dto.executionRunId,
      projectId: dto.projectId,
      riskLevel: dto.riskLevel,
      requestedAction: dto.requestedAction,
    });

    return approval;
  }

  async getApprovalRequest(id: string, userId: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        executionRun: {
          select: {
            id: true,
            goal: true,
            project: { select: { id: true, name: true, members: true } },
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('ApprovalRequest not found');
    }

    return approval;
  }

  async listApprovals(
    projectId: string,
    userId: string,
    filter: ApprovalFilterDto = {},
  ) {
    const where: Prisma.ApprovalRequestWhereInput = { projectId };

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.riskLevel) {
      where.riskLevel = filter.riskLevel;
    }
    if (filter.actionType) {
      where.actionType = filter.actionType;
    }

    const [approvals, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
        include: {
          executionRun: {
            select: {
              id: true,
              goal: true,
              subjectType: true,
              subjectId: true,
              task: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        take: filter.limit ?? 20,
        skip: filter.offset ?? 0,
      }),
      this.prisma.approvalRequest.count({ where }),
    ]);

    return { approvals, total };
  }

  async resolveApproval(id: string, dto: ResolveApprovalDto, userId: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        executionRun: true,
      },
    });

    if (!approval) {
      throw new NotFoundException('ApprovalRequest not found');
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException(`Approval already ${approval.status}`);
    }

    if (approval.expiresAt && new Date() > approval.expiresAt) {
      throw new BadRequestException('Approval request has expired');
    }

    const resolved = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: dto.resolution,
        resolutionNote: dto.resolutionNote,
        approvedBy: dto.resolution === 'approved' ? userId : undefined,
        rejectedBy: dto.resolution === 'rejected' ? userId : undefined,
        resolvedAt: new Date(),
      },
    });

    if (dto.resolution === 'approved') {
      await this.prisma.executionRun.update({
        where: { id: approval.executionRunId },
        data: { status: 'in_progress' },
      });
    } else {
      await this.prisma.executionRun.update({
        where: { id: approval.executionRunId },
        data: { status: 'blocked' },
      });
    }

    this.logger.log(`Approval ${id} resolved: ${dto.resolution}`, {
      resolvedBy: userId,
      resolutionNote: dto.resolutionNote,
    });

    this.messageBus.publish('approval.resolved', {
      approvalRequestId: id,
      executionRunId: approval.executionRunId,
      resolution: dto.resolution,
      resolvedBy: userId,
    });

    return resolved;
  }

  async getPendingApprovals(projectId: string) {
    return this.prisma.approvalRequest.findMany({
      where: {
        projectId,
        status: 'pending',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        executionRun: {
          select: {
            id: true,
            goal: true,
            subjectType: true,
            subjectId: true,
            task: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: [{ riskLevel: 'desc' }, { requestedAt: 'asc' }],
    });
  }

  async autoApprove(id: string, reason?: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });

    if (!approval || approval.status !== 'pending') {
      throw new NotFoundException('Pending ApprovalRequest not found');
    }

    if (approval.riskLevel === 'high_risk') {
      throw new BadRequestException('Cannot auto-approve high-risk actions');
    }

    return this.resolveApproval(
      id,
      {
        resolution: 'approved',
        resolutionNote: reason ?? 'Auto-approved due to trust policy',
      },
      'system',
    );
  }

  async cancelApproval(id: string, userId: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });

    if (!approval) {
      throw new NotFoundException('ApprovalRequest not found');
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('Only pending approvals can be cancelled');
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    await this.prisma.executionRun.update({
      where: { id: approval.executionRunId },
      data: { status: 'planned' },
    });

    this.messageBus.publish('approval.cancelled', {
      approvalRequestId: id,
      cancelledBy: userId,
    });

    return updated;
  }

  async getApprovalStats(projectId: string) {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.approvalRequest.count({
        where: { projectId, status: 'pending' },
      }),
      this.prisma.approvalRequest.count({
        where: { projectId, status: 'approved' },
      }),
      this.prisma.approvalRequest.count({
        where: { projectId, status: 'rejected' },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected,
    };
  }
}
