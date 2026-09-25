import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import {
  DecisionDto,
  DecisionListDto,
  DecisionSummaryDto,
  PROPOSAL_KIND_VALUES,
} from './dto/decision.dto';
import {
  computeProposalFingerprint,
  isApprovalStale,
} from './decision-fingerprint';

type ApprovalWithRefs = Prisma.ApprovalRequestGetPayload<{
  include: {
    project: { select: { id: true; name: true } };
    executionRun: {
      select: {
        id: true;
        goal: true;
        subjectType: true;
        subjectId: true;
        issue: { select: { id: true; title: true } };
      };
    };
  };
}>;

type AcceptanceWithRefs = Prisma.AcceptanceGetPayload<{
  include: {
    issue: {
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

/**
 * 建议类提案 kind —— 取自 DTO 单一来源，不在此另抄一份。
 * 曾漏 `release`：`?kind=release` 过滤落空（真实存在该 kind 的待决提案）。
 */
const PROPOSAL_KINDS: readonly string[] = PROPOSAL_KIND_VALUES;

export interface DecisionFilter {
  /** 请求者用户 id——可见性口径（R3 裁决）：决策卡仅对其所属项目的成员可见 */
  userId?: string;
  projectId?: string;
  kind?: string;
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
    const wantApprovals =
      filter.kind === undefined || filter.kind === 'approval';
    const wantAcceptances =
      filter.kind === undefined || filter.kind === 'acceptance';
    const wantProposals =
      filter.kind === undefined || PROPOSAL_KINDS.includes(filter.kind);

    // R3 可见性口径：考古决策卡仅项目成员可见。全局视图（无 projectId）收敛到
    // 请求者的成员项目集合；显式 projectId 同样要求成员身份（非成员查询命中
    // `in: []` 自然为空）。projectId 为 null 的系统级卡（如发版审批）不挂项目，
    // 不参与成员过滤。userId 缺失（理论上 JWT 守卫下不会发生）保持旧口径不过滤。
    const projectScope = await this.resolveProjectScope(
      filter.userId,
      filter.projectId,
    );

    const [approvals, acceptances, proposals] = await Promise.all([
      wantApprovals
        ? this.prisma.approvalRequest.findMany({
            where: {
              ...(projectScope ? { projectId: projectScope } : {}),
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
                  issue: { select: { id: true, title: true } },
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
              ...(projectScope ? { issue: { projectId: projectScope } } : {}),
            },
            include: {
              issue: {
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
      wantProposals
        ? this.prisma.decisionProposal.findMany({
            where: {
              status: 'pending',
              // 兜底改造批 4：过期提案不再进收件箱（此前永久滞留）
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              ...(projectScope ? { projectId: projectScope } : {}),
              ...(filter.kind && PROPOSAL_KINDS.includes(filter.kind)
                ? { kind: filter.kind }
                : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: MAX_PULL,
          })
        : Promise.resolve([]),
    ]);

    const items = [
      ...approvals.map((a) => this.mapApproval(a)),
      ...acceptances.map((a) => this.mapAcceptance(a)),
      ...proposals.map((p) => this.mapProposal(p)),
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

  /** 可见性口径（R3）与 listPending 一致：userId 缺失时退回旧口径不过滤 */
  private async resolveProjectScope(
    userId?: string,
    projectId?: string,
  ): Promise<string | { in: string[] } | undefined> {
    if (!userId) return projectId;
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const memberProjectIds = memberships.map((m) => m.projectId);
    if (projectId) {
      // 显式 projectId 同样要求成员身份：非成员收敛为空集合（查询自然为空）
      return memberProjectIds.includes(projectId) ? projectId : { in: [] };
    }
    return { in: memberProjectIds };
  }

  async summary(filter: DecisionFilter = {}): Promise<DecisionSummaryDto> {
    const now = new Date();
    const projectScope = await this.resolveProjectScope(
      filter.userId,
      filter.projectId,
    );
    const [approval, acceptancePending, acceptanceInReview, proposal] =
      await Promise.all([
        this.prisma.approvalRequest.count({
          where: {
            ...(projectScope ? { projectId: projectScope } : {}),
            status: 'pending',
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        }),
        this.prisma.acceptance.count({
          where: {
            status: 'pending',
            ...(projectScope ? { issue: { projectId: projectScope } } : {}),
          },
        }),
        this.prisma.acceptance.count({
          where: {
            status: 'in_review',
            ...(projectScope ? { issue: { projectId: projectScope } } : {}),
          },
        }),
        this.prisma.decisionProposal.count({
          where: {
            status: 'pending',
            ...(projectScope ? { projectId: projectScope } : {}),
          },
        }),
      ]);

    const acceptance = acceptancePending + acceptanceInReview;
    return {
      pending: approval + acceptance + proposal,
      blocking: approval,
      advisory: acceptance + proposal,
      byKind: { approval, acceptance, proposal },
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
    const issueId = a.issueId ?? a.executionRun?.issue?.id ?? undefined;
    const taskTitle = a.executionRun?.issue?.title ?? undefined;

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
      issueId,
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
      contextPath: issueId ? `/app/tasks/${issueId}` : '/app/executions',
    };
  }

  private mapAcceptance(a: AcceptanceWithRefs): DecisionDto {
    const proposerId = a.completedBy ?? a.createdBy ?? undefined;

    return {
      id: `acceptance:${a.id}`,
      kind: 'acceptance',
      sourceId: a.id,
      status: a.status,
      title: a.title ?? a.issue?.title ?? a.issueId,
      detail: a.description ?? undefined,
      urgency: 'advisory',
      projectId: a.issue?.projectId ?? undefined,
      projectName: a.issue?.project?.name,
      issueId: a.issueId,
      taskTitle: a.issue?.title,
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

  /**
   * 建议类提案 → 中性 Decision（统一 advisory：不影响其他工作推进的判断题）。
   * CAP-C-04：下发当前内容指纹（决议时回传校验「所见即所批」）与批准过期态
   * （待决列表里恒为 false——还没批准谈不上过期，字段为卡壳统一契约而存在）。
   */
  private mapProposal(
    p: Prisma.DecisionProposalGetPayload<Record<string, never>>,
  ): DecisionDto {
    const contentFingerprint = computeProposalFingerprint(p);
    return {
      id: `${p.kind}:${p.id}`,
      kind: p.kind as DecisionDto['kind'],
      sourceId: p.id,
      status: p.status,
      title: p.title,
      detail: p.detail ?? undefined,
      urgency: 'advisory',
      projectId: p.projectId ?? undefined,
      issueId: p.issueId ?? undefined,
      proposer: {
        type: (p.proposerType as DecisionDto['proposer']['type']) ?? 'system',
        id: p.proposerId ?? undefined,
      },
      payload: (p.payload as Record<string, unknown>) ?? {},
      contentFingerprint,
      approvalStale: isApprovalStale(p, contentFingerprint),
      createdAt: p.createdAt.toISOString(),
      expiresAt: p.expiresAt?.toISOString(),
      contextPath: p.issueId
        ? `/app/tasks/${p.issueId}`
        : p.projectId
          ? `/app/projects/${p.projectId}`
          : undefined,
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
      // 其余来源 proposer.type 初始为 system，命中成员后按成员类型收敛
      if (item.kind !== 'approval') item.proposer.type = info.type;
    }
  }
}
