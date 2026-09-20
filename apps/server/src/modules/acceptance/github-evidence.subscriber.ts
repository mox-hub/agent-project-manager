import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/core/database/prisma.service';

/** 系统回流的证据提交者哨兵（submittedBy 为自由字符串，非 FK） */
const SYSTEM_SUBMITTER = 'system:github-checks';
const REVIEW_SUBMITTER = 'system:github-review';

/**
 * 验收终态词表（schema：draft|pending|in_review|passed|failed|waived）。
 * 已裁决（终态）的验收不再被系统回写 completionEvidence——守卫口径必须
 * 与 schema 状态词表一致，否则守卫形同虚设（「通过后证据被改写」）。
 */
const ACCEPTANCE_TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'passed',
  'failed',
  'waived',
]);

/**
 * GitHub 事件 → 验收证据回流（CAP-B-08 一期 + 二期）。
 *
 * 口径：只落证据，不改验收判定（与 dispatch persistCompletionEvidence 的
 * 「CI 落证据、判定归人工」哲学一致）。
 * - PR 全生命周期 → 补全 completionEvidence 的 prUrl/state：中间态（open，
 *   含 opened/reopened/synchronize）让质量把关「过程可观测」，终态
 *   （merged/closed）打通 accept-completion 对 pr 契约「仅 merged 可接收」
 *   的前置校验，消除人工手填 PR 链接；终态后到达的乱序中间态事件被忽略。
 *   验收已裁决（终态 passed/failed/waived）后不回写，防「通过后证据被改写」。
 * - check_run 终态（CI 结论）→ 落到 source='ci' 的标准的证据列表（repo 与
 *   PR 归属库一致才回流，防多仓库误配）。
 * - PR review（submitted）→ 落到 source='pr_review' 的标准的证据列表。
 *
 * 库归属：事件源自 GitHub webhook（无 x-workspace-id 头，ALS 为空），
 * 与 RemotePullRequest/IntegrationConfig 同落默认库——多库工作区的跨库
 * 回流裁决见 docs/02-架构设计/策略/决策日志.md（B-08 二期），待集成配置
 * 入工作区后统一迁移。
 */
@Injectable()
export class GithubEvidenceSubscriber {
  private readonly logger = new Logger(GithubEvidenceSubscriber.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('github.pull_request.updated')
  async onPullRequestUpdated(payload: {
    id?: string;
    state?: string;
  }): Promise<void> {
    if (!payload?.id) return;
    // 二期放开中间态：open（opened/reopened/synchronize）与终态都回写
    if (
      payload.state !== 'open' &&
      payload.state !== 'merged' &&
      payload.state !== 'closed'
    ) {
      return;
    }
    try {
      const pr = await this.prisma.remotePullRequest.findUnique({
        where: { id: payload.id },
        select: {
          acceptanceId: true,
          htmlUrl: true,
          number: true,
          repoFullName: true,
        },
      });
      if (!pr?.acceptanceId) return;

      const acceptance = await this.prisma.acceptance.findUnique({
        where: { id: pr.acceptanceId },
        select: {
          completionType: true,
          status: true,
          completionEvidence: true,
        },
      });
      if (!acceptance) return;
      // 仅 pr 契约消费 PR 事件；已裁决（终态 passed/failed/waived）不回写，
      // 防「通过后证据被改写」
      if (acceptance.completionType !== 'pr') return;
      if (ACCEPTANCE_TERMINAL_STATUSES.has(acceptance.status)) return;

      const existing = (acceptance.completionEvidence ?? {}) as Record<
        string,
        unknown
      >;
      // 乱序防御：终态（merged/closed）已回写后，迟到的中间态事件不覆盖
      if (
        payload.state === 'open' &&
        (existing.state === 'merged' || existing.state === 'closed')
      ) {
        return;
      }
      const evidence: Record<string, unknown> = {
        ...existing,
        prUrl: (existing.prUrl as string | undefined) ?? pr.htmlUrl,
        state: payload.state,
        prNumber: pr.number,
        prRepo: pr.repoFullName,
        prSyncedAt: new Date().toISOString(),
      };
      await this.prisma.acceptance.update({
        where: { id: pr.acceptanceId },
        data: { completionEvidence: evidence as any },
      });
      this.logger.log(
        `PR #${pr.number} ${payload.state} 回流为验收 ${pr.acceptanceId} 的完成契约证据`,
      );
    } catch (err) {
      this.logger.warn(
        `PR 状态回流跳过: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  @OnEvent('github.check_run.completed')
  async onCheckRunCompleted(payload: {
    branch?: string | null;
    checkName?: string;
    conclusion?: string;
    sha?: string;
    htmlUrl?: string | null;
    repo?: string;
  }): Promise<void> {
    if (!payload?.branch || !payload.checkName || !payload.conclusion) return;
    try {
      const pr = await this.prisma.remotePullRequest.findFirst({
        where: {
          provider: 'github',
          headBranch: payload.branch,
          // 二期 repo 校验：多仓库同名分支时 CI 结论只归属同库 PR
          ...(payload.repo ? { repoFullName: payload.repo } : {}),
          acceptanceId: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        select: { acceptanceId: true, number: true },
      });
      if (!pr?.acceptanceId) return;

      const content = `${payload.checkName}:${payload.conclusion}:${payload.sha ?? ''}`;
      const ciCriteria = await this.prisma.acceptanceCriteria.findMany({
        where: { acceptanceId: pr.acceptanceId, source: 'ci' },
        select: { id: true },
      });
      if (ciCriteria.length === 0) return;

      const duplicated = await this.prisma.acceptanceEvidence.findFirst({
        where: { criteriaId: { in: ciCriteria.map((c) => c.id) }, content },
        select: { id: true },
      });
      if (duplicated) return;

      const metadata = {
        provider: 'github',
        repo: payload.repo,
        prNumber: pr.number,
        branch: payload.branch,
        checkName: payload.checkName,
        conclusion: payload.conclusion,
        sha: payload.sha,
        htmlUrl: payload.htmlUrl,
      };
      await this.prisma.acceptanceEvidence.createMany({
        data: ciCriteria.map((c) => ({
          criteriaId: c.id,
          evidenceType: 'ci_result',
          content,
          metadata,
          submittedBy: SYSTEM_SUBMITTER,
        })),
      });
      this.logger.log(
        `check_run ${payload.checkName}=${payload.conclusion} 回流为验收 ${pr.acceptanceId} 的 ${ciCriteria.length} 条 CI 标准证据`,
      );
    } catch (err) {
      this.logger.warn(
        `check_run 回流跳过: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * PR review 证据回流（CAP-B-08 二期）：review submitted → 落到
   * source='pr_review' 的标准的证据列表（criteria 级，按 reviewId 防重）。
   */
  @OnEvent('github.pr_review.submitted')
  async onPullRequestReviewSubmitted(payload: {
    pullRequestId?: string;
    repo?: string;
    number?: number;
    reviewId?: string;
    reviewState?: string;
    reviewerLogin?: string;
    submittedAt?: string;
  }): Promise<void> {
    if (!payload?.pullRequestId || !payload.reviewState) return;
    try {
      const pr = await this.prisma.remotePullRequest.findUnique({
        where: { id: payload.pullRequestId },
        select: { acceptanceId: true, number: true },
      });
      if (!pr?.acceptanceId) return;

      const reviewCriteria = await this.prisma.acceptanceCriteria.findMany({
        where: { acceptanceId: pr.acceptanceId, source: 'pr_review' },
        select: { id: true },
      });
      if (reviewCriteria.length === 0) return;

      const content = `review:${payload.reviewId ?? ''}:${payload.reviewState}:${payload.reviewerLogin ?? ''}`;
      const duplicated = await this.prisma.acceptanceEvidence.findFirst({
        where: {
          criteriaId: { in: reviewCriteria.map((c) => c.id) },
          content,
        },
        select: { id: true },
      });
      if (duplicated) return;

      const metadata = {
        provider: 'github',
        repo: payload.repo,
        prNumber: pr.number,
        reviewState: payload.reviewState,
        reviewerLogin: payload.reviewerLogin,
        submittedAt: payload.submittedAt,
      };
      await this.prisma.acceptanceEvidence.createMany({
        data: reviewCriteria.map((c) => ({
          criteriaId: c.id,
          evidenceType: 'pr_review',
          content,
          metadata,
          submittedBy: REVIEW_SUBMITTER,
        })),
      });
      this.logger.log(
        `PR #${pr.number} review(${payload.reviewState} by ${payload.reviewerLogin}) 回流为验收 ${pr.acceptanceId} 的 ${reviewCriteria.length} 条 review 标准证据`,
      );
    } catch (err) {
      this.logger.warn(
        `pr_review 回流跳过: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
