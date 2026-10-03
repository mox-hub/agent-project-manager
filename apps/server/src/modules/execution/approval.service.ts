import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { Prisma } from '@prisma/client';
import { QuickJudgeService } from '@/modules/ai-hub/quick-judge/quick-judge.service';
import {
  approvalRiskQuestions,
  extractApprovalRisk,
} from '@/modules/ai-hub/quick-judge/judge-scenarios';

export interface CreateApprovalRequestDto {
  executionRunId: string;
  projectId: string;
  issueId?: string;
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
    private readonly quickJudge: QuickJudgeService,
  ) {
    this.logger.setContext('ApprovalService');
  }

  async createApprovalRequest(dto: CreateApprovalRequestDto, _userId?: string) {
    const executionRun = await this.prisma.execution.findUnique({
      where: { id: dto.executionRunId },
    });

    if (!executionRun) {
      throw new NotFoundException('ExecutionRun not found');
    }

    const approval = await this.prisma.approvalRequest.create({
      data: {
        executionRunId: dto.executionRunId,
        projectId: dto.projectId,
        issueId: dto.issueId,
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

    await this.prisma.execution.update({
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

    // AI 风险定级初审（CAP-A-27，advisory）：fire-and-forget，结果回写 metadata.aiJudge
    // 仅供审批界面展示——**不改变 riskLevel 落库值，不触发任何自动批准**；
    // 通道未启用/失败时静默跳过（quick-judge 内部已降级为 null）。
    void this.reviewApprovalRisk(approval.id, dto, executionRun.goal).catch(
      () => {},
    );

    return approval;
  }

  /** AI 风险定级 advisory：判断结果并入审批单 metadata（供前端展示），失败零影响。 */
  private async reviewApprovalRisk(
    approvalId: string,
    dto: Pick<
      CreateApprovalRequestDto,
      'requestedAction' | 'actionType' | 'reason'
    >,
    goal?: string | null,
  ): Promise<void> {
    // 防操纵边界：state 只含系统结构化字段（动作描述/类型/目标），reason 是人填的
    // 提交说明、被排除在外。
    const state = [
      `审批请求：${dto.requestedAction}`,
      `操作类型：${dto.actionType}`,
      ...(goal ? [`关联目标：${goal}`] : []),
    ].join('\n');

    const result = await this.quickJudge.judge(
      'approval_risk',
      state,
      approvalRiskQuestions(),
    );
    if (!result) return;
    const judgement = extractApprovalRisk(result.answers);
    if (!judgement.riskLevel && judgement.safeToAutoApprove === null) return;

    try {
      const current = await this.prisma.approvalRequest.findUnique({
        where: { id: approvalId },
        select: { metadata: true },
      });
      if (!current) return;
      await this.prisma.approvalRequest.update({
        where: { id: approvalId },
        data: {
          metadata: {
            ...((current.metadata as Record<string, unknown> | null) ?? {}),
            aiJudge: {
              riskLevel: judgement.riskLevel,
              confidence: judgement.confidence,
              probabilities: judgement.probabilities,
              safeToAutoApprove: judgement.safeToAutoApprove,
              model: result.model,
              judgedAt: new Date().toISOString(),
              advisory: true,
            },
          },
        },
      });
      this.logger.log(`AI risk judgement attached to approval ${approvalId}`, {
        riskLevel: judgement.riskLevel,
        confidence: judgement.confidence,
      });
    } catch (err) {
      this.logger.warn(
        `AI risk judgement write-back failed for ${approvalId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getApprovalRequest(id: string, _userId: string) {
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
              issue: { select: { id: true, title: true } },
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
      await this.prisma.execution.update({
        where: { id: approval.executionRunId },
        data: { status: 'in_progress' },
      });
    } else {
      await this.prisma.execution.update({
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
            issue: { select: { id: true, title: true } },
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

    await this.prisma.execution.update({
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
