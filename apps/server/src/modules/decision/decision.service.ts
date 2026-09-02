import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import {
  DecisionDto,
  DecisionListDto,
  DecisionSummaryDto,
} from './dto/decision.dto';

type ApprovalWithRefs = Prisma.ApprovalRequestGetPayload<{
  include: {
    project: { select: { id: true; name: true } };
    executionRun: {
      select: {
        id: true;
        goal: true;
        subjectType: true;
        subjectId: true;
        task: { select: { id: true; title: true } };
      };
    };
  };
}>;

type AcceptanceWithRefs = Prisma.AcceptanceGetPayload<{
  include: {
    task: {
      select: {
        id: true;
        title: true;
        projectId: true;
        project: { select: { id: true; name: true } };
      };
    };
  };
}>;

/**
 * 统一待决决策聚合：把分散的审批门禁（ApprovalRequest）与验收判断（Acceptance）
 * 投影为中性 Decision 列表，供决策收件箱与上下文内嵌卡片消费。
 *
 * urgency 路由策略（卡片文法 2×2 路由的当前实现，后续按决策类型细化）：
 * - pending ApprovalRequest → blocking：其 ExecutionRun 已停在 pending_approval，执行事实性暂停；
 * - pending/in_review Acceptance → advisory：不影响其他工作推进的人工判断题。
 */

const MAX_PULL = 200;

export interface DecisionFilter {
  projectId?: string;
  kind?: 'approval' | 'acceptance';
  limit?: number;
  offset?: number;
}

interface ProposerInfo {
  name?: string;
  type: 'ai_agent' | 'human';
}

@Injectable()
export class DecisionService {
  private readonly logger = new Logger(DecisionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listPending(filter: DecisionFilter = {}): Promise<DecisionListDto> {
    const now = new Date();
    const wantApprovals = filter.kind !== 'acceptance';
    const wantAcceptances = filter.kind !== 'approval';

    const [approvals, acceptances] = await Promise.all([
      wantApprovals
        ? this.prisma.approvalRequest.findMany({
            where: {
              ...(filter.projectId ? { projectId: filter.projectId } : {}),
              status: 'pending',
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            include: {
              project: { select: { id: true, name: true } },
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
            take: MAX_PULL,
          })
        : Promise.resolve([]),
      wantAcceptances
        ? this.prisma.acceptance.findMany({
            where: {
              status: { in: ['pending', 'in_review'] },
              ...(filter.projectId
                ? { task: { projectId: filter.projectId } }
                : {}),
            },
            include: {
              task: {
                select: {
                  id: true,
                  title: true,
                  projectId: true,
                  project: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
            take: MAX_PULL,
          })
        : Promise.resolve([]),
    ]);

    const items = [
      ...approvals.map((a) => this.mapApproval(a)),
      ...acceptances.map((a) => this.mapAcceptance(a)),
    ];

    await this.fillProposerNames(items);

    // 排序：blocking 优先（先清门禁），同级按发起时间倒序
    items.sort((x, y) => {
      if (x.urgency !== y.urgency) return x.urgency === 'blocking' ? -1 : 1;
      return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
    });

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    const paged = items.slice(offset, offset + limit);
    const blocking = items.filter((i) => i.urgency === 'blocking').length;

    return {
      items: paged,
      total: items.length,
      blocking,
      advisory: items.length - blocking,
    };
  }

  async summary(projectId?: string): Promise<DecisionSummaryDto> {
    const now = new Date();
    const [approval, acceptancePending, acceptanceInReview] = await Promise.all(
      [
        this.prisma.approvalRequest.count({
          where: {
            ...(projectId ? { projectId } : {}),
            status: 'pending',
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        }),
        this.prisma.acceptance.count({
          where: {
            status: 'pending',
            ...(projectId ? { task: { projectId } } : {}),
          },
        }),
        this.prisma.acceptance.count({
          where: {
            status: 'in_review',
            ...(projectId ? { task: { projectId } } : {}),
          },
        }),
      ],
    );

    const acceptance = acceptancePending + acceptanceInReview;
    return {
      pending: approval + acceptance,
      blocking: approval,
      advisory: acceptance,
      byKind: { approval, acceptance },
    };
  }

  private mapApproval(a: ApprovalWithRefs): DecisionDto {
    const subjectType = a.executionRun?.subjectType;
    const proposerType: DecisionDto['proposer']['type'] =
      subjectType === 'platform_ai_member'
        ? 'ai_agent'
        : subjectType === 'human'
          ? 'human'
          : 'system';
    const taskId = a.taskId ?? a.executionRun?.task?.id ?? undefined;
    const taskTitle = a.executionRun?.task?.title ?? undefined;

    return {
      id: `approval:${a.id}`,
      kind: 'approval',
      sourceId: a.id,
      status: a.status,
      title: a.requestedAction,
      detail: a.reason ?? a.executionRun?.goal ?? undefined,
      urgency: 'blocking',
      projectId: a.projectId,
      projectName: a.project?.name,
      taskId,
      taskTitle,
      riskLevel: a.riskLevel,
      actionType: a.actionType,
      proposer: { type: proposerType, id: a.executionRun?.subjectId },
      payload: {
        actionType: a.actionType,
        riskLevel: a.riskLevel,
        approverPolicy: a.approverPolicy,
        executionRun: a.executionRun
          ? { id: a.executionRun.id, goal: a.executionRun.goal }
          : null,
      },
      createdAt: a.requestedAt.toISOString(),
      expiresAt: a.expiresAt?.toISOString(),
      contextPath: taskId ? `/app/tasks/${taskId}` : '/app/executions',
    };
  }

  private mapAcceptance(a: AcceptanceWithRefs): DecisionDto {
    const proposerId = a.completedBy ?? a.createdBy ?? undefined;

    return {
      id: `acceptance:${a.id}`,
      kind: 'acceptance',
      sourceId: a.id,
      status: a.status,
      title: a.title ?? a.task?.title ?? a.taskId,
      detail: a.description ?? undefined,
      urgency: 'advisory',
      projectId: a.task?.projectId ?? undefined,
      projectName: a.task?.project?.name,
      taskId: a.taskId,
      taskTitle: a.task?.title,
      proposer: { type: 'system', id: proposerId },
      payload: {
        completionType: a.completionType,
        priority: a.priority,
        completionEvidence: a.completionEvidence,
      },
      createdAt: a.createdAt.toISOString(),
      contextPath: `/app/acceptance/${a.id}`,
    };
  }

  /** 批量回填提案者展示名（Member 同时承载人与 AI 员工，一次查询） */
  private async fillProposerNames(items: DecisionDto[]): Promise<void> {
    const ids = [
      ...new Set(
        items.map((i) => i.proposer.id).filter((id): id is string => !!id),
      ),
    ];
    if (ids.length === 0) return;

    const members = await this.prisma.member.findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true, type: true },
    });
    const byId = new Map<string, ProposerInfo>(
      members.map((m) => [
        m.id,
        {
          name: m.displayName,
          type: m.type === 'ai_agent' ? 'ai_agent' : 'human',
        },
      ]),
    );

    for (const item of items) {
      const info = item.proposer.id ? byId.get(item.proposer.id) : undefined;
      if (!info) continue;
      item.proposer.name = info.name;
      // approval 的执行主体是 platform_ai_member 时已判为 ai_agent；
      // acceptance 侧 proposer.type 初始为 system，命中成员后按成员类型收敛
      if (item.kind === 'acceptance') item.proposer.type = info.type;
    }
  }
}
