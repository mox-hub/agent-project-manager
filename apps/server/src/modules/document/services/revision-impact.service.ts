import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { ProposalService } from '../../decision/proposal.service';

/**
 * 需求修订影响链路（CAP-P-01 批一 P0 最小闭环）：
 *
 * 需求类文档（category = requirement | analysis）发生实质修订（content 变化）→
 * 经 DocumentTaskLink 既有引用关系扫描受影响任务与活跃验收标准 →
 * 生成「需求修订影响」决策卡（复用 clarify kind 的既有批阅流：
 * 收件箱渲染选项卡，人选择「标记待复核」即 accept(answer=mark_pending)）→
 * 确认后（读取收敛或显式接口）将受影响验收标准经 Prisma 直写置为 pending（待复核）。
 *
 * 设计决策（详见 PR 说明）：
 * - 决策卡 kind 复用 clarify：DecisionProposal 的 kind 词表与 applier 分发是
 *   decision 模块封闭实现（并行协调约定不改其文件），clarify 是唯一
 *   「accept 走通且无隐藏领域副作用」的既有 kind，其选项交互恰好承载确认语义；
 * - 影响面口径保守（宁可漏报不误报）：只报 DocumentTaskLink 显式关联的任务、
 *   且只报仍处活跃态（draft | pending | in_review）的验收标准；
 * - 确认后动作在本域内经 PrismaService 直写 acceptanceCriteria（对齐决策模块
 *   applyPlan 直写先例，规避 acceptance 模块反向依赖成环）；
 *   已知余留：直改不触发标准版本化机制（B-01 分支另行实现）。
 */

/** 需求类文档 category 词表（schema.prisma Document.category 注释口径） */
export const REVISION_IMPACT_CATEGORIES = ['requirement', 'analysis'] as const;

/** 决策卡选项 key：标记待复核（应用副作用） */
export const REVISION_IMPACT_CHOICE_MARK = 'mark_pending';
/** 决策卡选项 key：知悉但不应用 */
export const REVISION_IMPACT_CHOICE_DISMISS = 'dismiss';

/** 参与影响扫描的验收标准活跃态（passed/failed/waived 不上报不回退） */
const ACTIVE_CRITERIA_STATUSES = ['draft', 'pending', 'in_review'];

/** 应用「标记待复核」时允许拉回 pending 的当前态（pending 已是目标态无需动） */
const RECHECKABLE_STATUSES = ['draft', 'in_review'];

export interface RevisionImpactCriteriaItem {
  id: string;
  content: string;
  status: string;
}

export interface RevisionImpactIssueItem {
  issueId: string;
  issueTitle: string;
  linkType: string;
  sectionId: string | null;
  criteria: RevisionImpactCriteriaItem[];
}

/** 决策卡 payload.revisionImpact 结构（前端展示与确认后应用共用） */
export interface RevisionImpactPayload {
  documentId: string;
  documentTitle: string;
  analyzedAt: string;
  issues: RevisionImpactIssueItem[];
  criteriaIds: string[];
}

export interface RevisionImpactCardPayload {
  question: string;
  revisionImpact: RevisionImpactPayload;
  choices: Array<{ key: string; label: string; sub?: string; guess?: boolean }>;
}

export type RevisionImpactStatus =
  'none' | 'pending_decision' | 'applied' | 'dismissed';

export interface RevisionImpactStatusResult {
  status: RevisionImpactStatus;
  proposalId?: string;
  issueCount?: number;
  criteriaCount?: number;
  analyzedAt?: string;
  /** 本次读取收敛时实际拉回 pending 的标准条数（仅 status=applied） */
  appliedCount?: number;
  detail?: string;
}

export type RevisionImpactAnalyzeResult = {
  status: 'created' | 'skipped' | 'not_applicable';
  proposalId?: string;
  issueCount?: number;
  criteriaCount?: number;
  reason?: string;
};

type ProposalRecord = {
  id: string;
  status: string;
  resolution: unknown;
  payload: unknown;
  createdAt: Date;
};

@Injectable()
export class RevisionImpactService {
  private readonly logger = new Logger(RevisionImpactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly proposalService: ProposalService,
  ) {}

  /**
   * 文档更新事件入口（subscriber 调用）：需求类文档 content 实质修订时
   * 扫描影响面并生成决策卡。旁路语义：失败仅告警，不阻断文档更新主流程。
   */
  async analyzeOnUpdate(documentId: string): Promise<void> {
    try {
      await this.analyze(documentId);
    } catch (err) {
      this.logger.warn(
        `修订影响分析跳过: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * 影响分析（事件自动触发与手动触发共用）：
   * 非需求类 / 内容无实质变化之外的场景返回 not_applicable；
   * 已有同文档待决卡时 skipped（避免修订频繁导致卡片轰炸，余留见 PR）。
   */
  async analyze(documentId: string): Promise<RevisionImpactAnalyzeResult> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, isDeleted: false },
      select: {
        id: true,
        title: true,
        category: true,
        projectId: true,
        content: true,
      },
    });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    if (
      !REVISION_IMPACT_CATEGORIES.includes(
        document.category as (typeof REVISION_IMPACT_CATEGORIES)[number],
      )
    ) {
      return {
        status: 'not_applicable',
        reason: `category=${document.category} 非需求类（requirement|analysis）`,
      };
    }

    const impact = await this.collectImpact(documentId, document.title);
    if (impact.criteriaIds.length === 0) {
      return {
        status: 'not_applicable',
        reason: '无关联任务或无活跃验收标准',
      };
    }

    const existing = await this.findPendingCard(documentId);
    if (existing) {
      return {
        status: 'skipped',
        proposalId: existing.id,
        issueCount: impact.issues.length,
        criteriaCount: impact.criteriaIds.length,
        reason: '已存在待决的修订影响卡',
      };
    }

    const issueLine = impact.issues
      .map((i) => `「${i.issueTitle}」${i.criteria.length} 条`)
      .join('、');
    const question = `需求文档《${document.title}》已修订，${impact.issues.length} 个关联任务、共 ${impact.criteriaIds.length} 条验收标准可能受影响（${issueLine}）。是否将受影响标准标记为待复核？`;

    const cardPayload: RevisionImpactCardPayload = {
      question,
      revisionImpact: {
        documentId: document.id,
        documentTitle: document.title,
        analyzedAt: new Date().toISOString(),
        issues: impact.issues,
        criteriaIds: impact.criteriaIds,
      },
      choices: [
        {
          key: REVISION_IMPACT_CHOICE_MARK,
          label: '标记待复核',
          sub: `将 ${impact.criteriaIds.length} 条受影响验收标准状态置为待复核（pending）`,
          guess: true,
        },
        {
          key: REVISION_IMPACT_CHOICE_DISMISS,
          label: '知悉，暂不处理',
          sub: '保留标准现状，仅记录本次修订知悉',
        },
      ],
    };

    const proposal = await this.proposalService.create({
      kind: 'clarify',
      title: `需求修订影响确认：《${document.title}》`,
      detail: `修订影响面：${impact.issues.length} 个任务 / ${impact.criteriaIds.length} 条活跃验收标准（经文档任务关联扫描，保守口径）。确认后标准将标记为待复核。`,
      payload: cardPayload as unknown as Record<string, unknown>,
      projectId: document.projectId ?? undefined,
      proposerType: 'system',
    });

    this.logger.log(
      `修订影响卡已创建: ${proposal.id}（${impact.issues.length} 任务 / ${impact.criteriaIds.length} 标准）`,
    );
    return {
      status: 'created',
      proposalId: proposal.id,
      issueCount: impact.issues.length,
      criteriaCount: impact.criteriaIds.length,
    };
  }

  /**
   * 文档侧修订影响状态（GET 读取即收敛）：
   * - 存在待决卡 → pending_decision（等人在决策收件箱批阅）；
   * - 卡已 accept 且选择「标记待复核」→ 幂等应用（活跃标准拉回 pending）并返回 applied；
   * - 卡被驳回或选择「知悉」→ dismissed；
   * - 从未生成 → none。
   */
  async getStatus(documentId: string): Promise<RevisionImpactStatusResult> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, isDeleted: false },
      select: { id: true, category: true },
    });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    if (
      !REVISION_IMPACT_CATEGORIES.includes(
        document.category as (typeof REVISION_IMPACT_CATEGORIES)[number],
      )
    ) {
      return { status: 'none' };
    }

    const pending = await this.findPendingCard(documentId);
    if (pending) {
      const impact = extractImpact(pending.payload);
      return {
        status: 'pending_decision',
        proposalId: pending.id,
        issueCount: impact?.issues.length ?? 0,
        criteriaCount: impact?.criteriaIds.length ?? 0,
        analyzedAt: impact?.analyzedAt,
        detail: '请在决策收件箱批阅「需求修订影响」卡',
      };
    }

    const confirmed = await this.findLatestCard(documentId, 'accepted');
    if (confirmed) {
      const answer = extractAnswer(confirmed.resolution);
      const impact = extractImpact(confirmed.payload);
      if (answer !== REVISION_IMPACT_CHOICE_MARK || !impact) {
        return {
          status: 'dismissed',
          proposalId: confirmed.id,
          issueCount: impact?.issues.length ?? 0,
          criteriaCount: impact?.criteriaIds.length ?? 0,
        };
      }
      const appliedCount = await this.applyMarkPending(impact);
      return {
        status: 'applied',
        proposalId: confirmed.id,
        issueCount: impact.issues.length,
        criteriaCount: impact.criteriaIds.length,
        appliedCount,
        analyzedAt: impact.analyzedAt,
      };
    }

    // 已驳回：本次修订不处理（留痕语义与「知悉」一致）
    const rejected = await this.findLatestCard(documentId, 'rejected');
    if (rejected) {
      const impact = extractImpact(rejected.payload);
      return {
        status: 'dismissed',
        proposalId: rejected.id,
        issueCount: impact?.issues.length ?? 0,
        criteriaCount: impact?.criteriaIds.length ?? 0,
      };
    }

    return { status: 'none' };
  }

  /** 扫描影响面：DocumentTaskLink 显式关联 → 关联任务的活跃验收标准 */
  private async collectImpact(
    documentId: string,
    documentTitle: string,
  ): Promise<{ issues: RevisionImpactIssueItem[]; criteriaIds: string[] }> {
    const links = await this.prisma.documentTaskLink.findMany({
      where: { documentId },
      select: {
        issueId: true,
        linkType: true,
        sectionId: true,
      },
    });
    if (links.length === 0) {
      return { issues: [], criteriaIds: [] };
    }

    const issueIds = [...new Set(links.map((l) => l.issueId))];
    const issues = await this.prisma.issue.findMany({
      where: { id: { in: issueIds } },
      select: { id: true, title: true },
    });
    const titleById = new Map(issues.map((i) => [i.id, i.title]));

    // 同一任务可能被多条链接引用（文档级 + 章节级）：取引用并聚合链接元数据
    const linkMetaByIssue = new Map<
      string,
      { linkType: string; sectionId: string | null }
    >();
    for (const link of links) {
      const prev = linkMetaByIssue.get(link.issueId);
      linkMetaByIssue.set(link.issueId, {
        // 文档级关联优先展示；否则保留首个
        linkType:
          prev?.sectionId == null && prev ? prev.linkType : link.linkType,
        sectionId: prev?.sectionId ?? link.sectionId,
      });
    }

    const acceptances = await this.prisma.acceptance.findMany({
      where: { issueId: { in: issueIds } },
      select: { id: true, issueId: true },
    });
    const acceptanceIds = acceptances.map((a) => a.id);
    const criteriaByIssue = new Map<string, RevisionImpactCriteriaItem[]>();
    if (acceptanceIds.length > 0) {
      const criteria = await this.prisma.acceptanceCriteria.findMany({
        where: {
          acceptanceId: { in: acceptanceIds },
          status: { in: ACTIVE_CRITERIA_STATUSES },
        },
        select: {
          id: true,
          content: true,
          status: true,
          acceptance: { select: { issueId: true } },
        },
      });
      for (const c of criteria) {
        const issueId = c.acceptance?.issueId;
        if (!issueId) continue;
        const list = criteriaByIssue.get(issueId) ?? [];
        list.push({ id: c.id, content: c.content, status: c.status });
        criteriaByIssue.set(issueId, list);
      }
    }

    const result: RevisionImpactIssueItem[] = [];
    const criteriaIds: string[] = [];
    for (const issueId of issueIds) {
      const criteria = criteriaByIssue.get(issueId) ?? [];
      if (criteria.length === 0) continue; // 无活跃标准的任务不上报（保守口径）
      const meta = linkMetaByIssue.get(issueId)!;
      result.push({
        issueId,
        issueTitle: titleById.get(issueId) ?? issueId,
        linkType: meta.linkType,
        sectionId: meta.sectionId,
        criteria,
      });
      criteriaIds.push(...criteria.map((c) => c.id));
    }

    // 参数 documentTitle 供调用方组装文案，此处保留签名稳定性
    void documentTitle;
    return { issues: result, criteriaIds };
  }

  /** 确认后动作：受影响活跃标准置 pending（幂等；经 Prisma 直写，跨模块约定） */
  private async applyMarkPending(
    impact: RevisionImpactPayload,
  ): Promise<number> {
    if (impact.criteriaIds.length === 0) return 0;
    const result = await this.prisma.acceptanceCriteria.updateMany({
      where: {
        id: { in: impact.criteriaIds },
        status: { in: RECHECKABLE_STATUSES },
      },
      data: { status: 'pending' },
    });
    this.logger.log(
      `修订影响确认应用: ${result.count}/${impact.criteriaIds.length} 条标准已置待复核`,
    );
    return result.count;
  }

  /**
   * 同文档待决卡查找。DecisionProposal.payload 的 path 过滤仅 Postgres 支持
   * （本项目 SQLite），故限定 kind+status 后内存过滤，量级可控。
   */
  private async findPendingCard(
    documentId: string,
  ): Promise<ProposalRecord | null> {
    const cards = await this.prisma.decisionProposal.findMany({
      where: { kind: 'clarify', status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        status: true,
        resolution: true,
        payload: true,
        createdAt: true,
      },
    });
    return (
      cards.find((c) => extractImpact(c.payload)?.documentId === documentId) ??
      null
    );
  }

  /** 最近一张已决议卡（accepted/rejected 均可能，由调用方按 answer 分流） */
  private async findLatestCard(
    documentId: string,
    status: 'accepted' | 'rejected',
  ): Promise<ProposalRecord | null> {
    const cards = await this.prisma.decisionProposal.findMany({
      where: { kind: 'clarify', status },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        status: true,
        resolution: true,
        payload: true,
        createdAt: true,
      },
    });
    return (
      cards.find((c) => extractImpact(c.payload)?.documentId === documentId) ??
      null
    );
  }
}

/** 从决策卡 payload 提取修订影响清单（结构不符返回 null） */
export function extractImpact(payload: unknown): RevisionImpactPayload | null {
  const p = payload as { revisionImpact?: RevisionImpactPayload } | null;
  const impact = p?.revisionImpact;
  if (
    impact &&
    typeof impact === 'object' &&
    typeof impact.documentId === 'string' &&
    Array.isArray(impact.criteriaIds)
  ) {
    return impact;
  }
  return null;
}

/** 从决议落痕提取 clarify 选项 answer */
export function extractAnswer(resolution: unknown): string | undefined {
  const r = resolution as { answer?: unknown } | null;
  return typeof r?.answer === 'string' ? r.answer : undefined;
}
