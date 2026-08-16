import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { EncryptionService } from '@/core/crypto/encryption.service';
import { TrustService } from '@/modules/trust/trust.service';
import { GitHubSDKService } from './github-sdk.service';
import { GitHubApiError } from './github-client';
import { PR_OUTCOME_DELTAS, type GitHubPrState } from './github.constants';
import type {
  GitHubCreatePrInput,
  GitHubPullRequest,
  GitHubPullRequestWebhookPayload,
  GitHubPullRequestReviewWebhookPayload,
  SyncSummary,
} from './github.types';

/**
 * GitHub Sync Service
 * - 测试连接（testConnection）
 * - 创建 PR（高阶 dispatch 流调用）
 * - 同步 PR 状态：从 webhook event 应用状态 → 写 PullRequest 表
 * - 触发 TrustService.applyPrOutcome()
 */
@Injectable()
export class GitHubSyncService {
  private readonly logger = new Logger(GitHubSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly encryption: EncryptionService,
    private readonly sdk: GitHubSDKService,
    private readonly trust: TrustService,
  ) {}

  /** 测试连接 */
  async testConnection(integrationId: string) {
    try {
      const client = await this.sdk.getClientForIntegration(integrationId);
      const viewer = await client.fetchViewer();
      return {
        ok: true,
        viewer: {
          login: viewer.login,
          id: viewer.id,
          name: viewer.name,
          email: viewer.email,
          avatarUrl: viewer.avatarUrl,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: (err as Error).message,
      };
    }
  }

  /**
   * 创建真实 PR（供 dispatch.service 调用：agent 提交代码后由本服务推分支/建 PR）
   * 调用方需要：
   * - 已有 octokit client 对应 repo 的写权限
   * - 分支已通过本地 git push 到 origin
   */
  async createPullRequest(integrationId: string, input: GitHubCreatePrInput) {
    const client = await this.sdk.getClientForIntegration(integrationId);
    const pr = await client.createPullRequest(input);

    // 立刻记录到 PullRequest 表（状态 open）
    await this.recordPullRequest(pr, integrationId, 'open');

    return {
      ok: true,
      pr: {
        number: pr.number,
        htmlUrl: pr.htmlUrl,
        state: pr.state,
        merged: pr.merged,
        title: pr.title,
      },
    };
  }

  /**
   * 处理 pull_request webhook event：
   * - 写 PullRequest 状态
   * - 若状态变化触发 trust 评估
   */
  async handlePullRequestEvent(
    payload: GitHubPullRequestWebhookPayload,
  ): Promise<{ recorded: boolean; trustApplied: boolean }> {
    const { action, pull_request: pr, repository } = payload;

    // 用 fullName 找到对应的 integrationConfig
    const integration = await this.findIntegrationByRepo(repository.full_name);
    if (!integration) {
      this.logger.warn(
        `pull_request webhook for unknown repo ${repository.full_name}, skipping`,
      );
      return { recorded: false, trustApplied: false };
    }

    // 映射 → apm state
    const apmState = this.mapPrState(pr.state, pr.merged);

    // upsert 记录
    const existing = await this.prisma.remotePullRequest.findFirst({
      where: { provider: 'github', externalId: String(pr.id) },
    });

    let stored;
    if (existing) {
      stored = await this.prisma.remotePullRequest.update({
        where: { id: existing.id },
        data: {
          state: apmState,
          isMerged: pr.merged,
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          htmlUrl: pr.html_url,
          action: action,
          updatedAt: new Date(),
        },
      });
    } else {
      stored = await this.prisma.remotePullRequest.create({
        data: {
          provider: 'github',
          externalId: String(pr.id),
          number: pr.number,
          title: pr.title,
          repoFullName: repository.full_name,
          state: apmState,
          isMerged: pr.merged,
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          htmlUrl: pr.html_url,
          action,
          headBranch: pr.head.ref,
          baseBranch: pr.base.ref,
          integrationId: integration.id,
        },
      });
    }

    this.messageBus.publish('github.pull_request.updated', {
      id: stored.id,
      provider: 'github',
      repo: repository.full_name,
      number: pr.number,
      state: apmState,
      action,
    });

    // 对关键终结动作触发信任评分
    const triggersTrust =
      (action === 'closed' && pr.merged) ||
      action === 'closed' ||
      (pr.state === 'closed' && !pr.merged);

    if (triggersTrust) {
      await this.applyTrustFromPr(stored);
      return { recorded: true, trustApplied: true };
    }

    return { recorded: true, trustApplied: false };
  }

  /**
   * 处理 pull_request_review webhook event：
   * - CHANGES_REQUESTED → 立刻扣分（无需等 PR 关闭）
   */
  async handlePullRequestReviewEvent(
    payload: GitHubPullRequestReviewWebhookPayload,
  ): Promise<{ recorded: boolean; trustApplied: boolean }> {
    const reviewRaw = payload.review as unknown as {
      id: number;
      state: string;
      user: { login: string };
      submitted_at?: string;
      submittedAt?: string;
      body?: string | null;
    };
    const { repository, action } = payload;
    const prNumber = payload.pull_request.number;
    const submittedAtIso = reviewRaw.submitted_at ?? reviewRaw.submittedAt;
    if (!submittedAtIso) {
      this.logger.warn(
        `pull_request_review webhook missing submitted_at (delivery ignored)`,
      );
      return { recorded: false, trustApplied: false };
    }
    const submittedAt = new Date(submittedAtIso);
    if (Number.isNaN(submittedAt.getTime())) {
      this.logger.warn(
        `pull_request_review webhook invalid submitted_at: ${submittedAtIso}`,
      );
      return { recorded: false, trustApplied: false };
    }

    if (action !== 'submitted') return { recorded: false, trustApplied: false };

    const stored = await this.prisma.remotePullRequest.findFirst({
      where: {
        provider: 'github',
        repoFullName: repository.full_name,
        number: prNumber,
      },
    });
    if (!stored) {
      this.logger.warn(
        `pull_request_review webhook for unknown PR ${repository.full_name}#${prNumber}`,
      );
      return { recorded: false, trustApplied: false };
    }

    // 记录 review
    await this.prisma.githubPullRequestReview.create({
      data: {
        pullRequestId: stored.id,
        externalReviewId: String(reviewRaw.id),
        state: reviewRaw.state,
        reviewerLogin: reviewRaw.user.login,
        submittedAt,
        body: reviewRaw.body ?? null,
      },
    });

    // CHANGES_REQUESTED → 同步扣 correctness
    if (reviewRaw.state === 'CHANGES_REQUESTED') {
      // 单独走一次 applyPrOutcome 用 -4 校正
      await this.trust.applyPrOutcome({
        agentId: stored.agentId ?? undefined,
        projectId: stored.projectId ?? undefined,
        prState: 'changes_requested',
        repoFullName: repository.full_name,
        prNumber,
        reviewerLogin: reviewRaw.user.login,
        source: 'review',
      });
      return { recorded: true, trustApplied: true };
    }

    return { recorded: true, trustApplied: false };
  }

  /** 列出 PR 同步日志 */
  async getSyncLogs(integrationId: string, limit = 50) {
    return this.prisma.integrationSyncLog.findMany({
      where: { integrationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** 同步调用（手动触发，兜底 webhook 失败） */
  async syncPullRequest(
    integrationId: string,
    repoFullName: string,
    prNumber: number,
  ): Promise<SyncSummary> {
    const startedAt = new Date().toISOString();
    try {
      const client = await this.sdk.getClientForIntegration(integrationId);
      const [owner, repo] = repoFullName.split('/');
      const pr = await client.fetchPullRequest(owner, repo, prNumber);
      const apmState = this.mapPrState(pr.state, pr.merged);

      // write log
      await this.prisma.integrationSyncLog.create({
        data: {
          integrationId,
          resourceType: 'pull_request',
          resourceId: String(pr.id),
          action: 'pull',
          direction: 'inbound',
          status: 'success',
          message: `Synced PR #${pr.number}`,
        },
      });

      return {
        ok: true,
        errors: [],
        startedAt,
        finishedAt: new Date().toISOString(),
      };
    } catch (err) {
      await this.prisma.integrationSyncLog.create({
        data: {
          integrationId,
          resourceType: 'pull_request',
          resourceId: `${repoFullName}#${prNumber}`,
          action: 'pull',
          direction: 'inbound',
          status: 'failed',
          message: (err as Error).message,
        },
      });
      return {
        ok: false,
        errors: [(err as Error).message],
        startedAt,
        finishedAt: new Date().toISOString(),
      };
    }
  }

  // =================== 私有 ===================

  private async recordPullRequest(
    pr: GitHubPullRequest,
    integrationId: string,
    state: GitHubPrState | 'open',
  ) {
    const apmState = this.mapPrState(pr.state, pr.merged);
    const existing = await this.prisma.remotePullRequest.findFirst({
      where: { provider: 'github', externalId: String(pr.id) },
    });

    const data = {
      provider: 'github' as const,
      externalId: String(pr.id),
      number: pr.number,
      title: pr.title,
      repoFullName: pr.head.repo.fullName,
      state: apmState,
      isMerged: pr.merged,
      mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
      closedAt: pr.closedAt ? new Date(pr.closedAt) : null,
      htmlUrl: pr.htmlUrl,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      integrationId,
    };

    if (existing) {
      return this.prisma.remotePullRequest.update({
        where: { id: existing.id },
        data: { ...data, action: 'created' },
      });
    }
    return this.prisma.remotePullRequest.create({ data });
  }

  private async findIntegrationByRepo(fullName: string) {
    return this.prisma.integrationConfig.findFirst({
      where: { provider: 'github', enabled: true },
    });
  }

  private mapPrState(state: 'open' | 'closed', merged: boolean): GitHubPrState {
    if (merged) return 'merged';
    if (state === 'closed') return 'closed';
    return 'open';
  }

  private async applyTrustFromPr(prRow: {
    id: string;
    state: string;
    agentId?: string | null;
    projectId?: string | null;
    repoFullName: string;
    number: number;
  }) {
    if (!prRow.agentId || !prRow.projectId) {
      this.logger.debug(
        `PR ${prRow.repoFullName}#${prRow.number} has no agent binding; skip trust`,
      );
      return;
    }
    await this.trust.applyPrOutcome({
      agentId: prRow.agentId,
      projectId: prRow.projectId,
      prState: prRow.state as GitHubPrState,
      repoFullName: prRow.repoFullName,
      prNumber: prRow.number,
      source: 'webhook',
    });
  }
}
