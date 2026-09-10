import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/core/database/prisma.service';

/** 系统回流的证据提交者哨兵（submittedBy 为自由字符串，非 FK） */
const SYSTEM_SUBMITTER = 'system:github-checks';

/**
 * GitHub 事件 → 验收证据回流（CAP-B-08 一期）。
 *
 * 口径：只落证据，不改验收判定（与 dispatch persistCompletionEvidence 的
 * 「CI 落证据、判定归人工」哲学一致）。
 * - PR 终态（merged/closed）→ 补全 completionEvidence 的 prUrl/state，
 *   打通 accept-completion 对 pr 契约「仅 merged 可接收」的前置校验，
 *   消除人工手填 PR 链接。
 * - check_run 终态（CI 结论）→ 落到 source='ci' 的标准的证据列表。
 *
 * 库归属：事件源自 GitHub webhook（无 x-workspace-id 头，ALS 为空），
 * 与 RemotePullRequest/IntegrationConfig 同落默认库；多库工作区的
 * 跨库回流是已知边界，待集成配置入工作区后统一裁决。
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
    if (payload.state !== 'merged' && payload.state !== 'closed') return;
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
      // 仅 pr 契约消费 PR 终态；已裁决（accepted/abandoned）不回写
      if (acceptance.completionType !== 'pr') return;
      if (acceptance.status === 'accepted' || acceptance.status === 'abandoned')
        return;

      const existing = (acceptance.completionEvidence ?? {}) as Record<
        string,
        unknown
      >;
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
        `PR 终态回流跳过: ${err instanceof Error ? err.message : String(err)}`,
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
}
