import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import simpleGit from 'simple-git';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { GitHubSDKService } from '../integration/providers/github/github-sdk.service';
import { ContractWorkspaceResolver } from '../contract/contract-workspace-fs';
import { assertReleaseTransition } from './release-status';
import { ReleaseService } from './release.service';

export interface ExecutionStep {
  step: string;
  status: 'ok' | 'skipped' | 'failed';
  detail: string;
  at: string;
}

/**
 * 发布执行（CAP-K-03）：approved → publishing → released / failed。
 * 步骤：CHANGELOG 导出 → 本地 tag + push（有工作区才做）→ GitHub Release
 * （有 github 集成且能从 git remote 解析出 owner/repo 才做）→ release.created
 * 广播。每步如实落 executionLog，失败置 failed（可重开 draft 重走），绝不静默半态。
 * 触发：决策卡 accept 后的 release.approved 事件（人确认即授权），
 * 以及 approved 后的手动重试端点。
 */
@Injectable()
export class ReleasePublishService {
  private readonly logger = new Logger(ReleasePublishService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly releases: ReleaseService,
    private readonly resolver: ContractWorkspaceResolver,
    private readonly githubSdk: GitHubSDKService,
  ) {}

  @OnEvent('release.approved')
  async onReleaseApproved(payload: { releaseId?: string }): Promise<void> {
    if (!payload?.releaseId) return;
    try {
      await this.publish(payload.releaseId);
    } catch (err) {
      this.logger.warn(
        `自动发布失败（决策卡已通过）: release=${payload.releaseId} ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** 执行发布。仅 approved 可进 publishing，CAS 抢占保证并发互斥。 */
  async publish(releaseId: string) {
    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
    });
    if (!release) throw new BadRequestException(`发版不存在: ${releaseId}`);
    assertReleaseTransition(release.status, 'publishing');

    // CAS 抢占 publishing：并发发布只有一个能成功
    const claimed = await this.prisma.release.updateMany({
      where: { id: releaseId, status: 'approved' },
      data: { status: 'publishing', failureReason: null, executionLog: [] },
    });
    if (claimed.count === 0) {
      throw new BadRequestException(
        '发版状态已变化（可能正在发布），请刷新后重试',
      );
    }

    const log: ExecutionStep[] = [];
    const pushLog = (entry: ExecutionStep) => {
      log.push(entry);
      return this.prisma.release.update({
        where: { id: releaseId },
        data: { executionLog: log as unknown as object[] },
      });
    };
    const okEntry = (step: string, detail: string): ExecutionStep => ({
      step,
      status: 'ok',
      detail,
      at: new Date().toISOString(),
    });
    const skipEntry = (step: string, detail: string): ExecutionStep => ({
      step,
      status: 'skipped',
      detail,
      at: new Date().toISOString(),
    });
    const failEntry = (step: string, detail: string): ExecutionStep => ({
      step,
      status: 'failed',
      detail,
      at: new Date().toISOString(),
    });

    // ① CHANGELOG 单向再生导出（无工作区诚实跳过）
    let changelogOk = true;
    try {
      const result = await this.releases.exportChangelog(release.projectId);
      await pushLog(
        result.exported
          ? okEntry('changelog', `已导出 ${result.path}`)
          : skipEntry('changelog', '项目无工作区，跳过 CHANGELOG 导出'),
      );
    } catch (err) {
      changelogOk = false;
      await pushLog(
        failEntry(
          'changelog',
          err instanceof Error ? err.message : String(err),
        ),
      );
    }

    // ② 本地打 tag 并推送（无工作区跳过；已存在的 tag 视为漂移，失败）
    let tagOk = true;
    let tagPushed = false;
    const root = await this.resolver.resolveRoot(release.projectId);
    let remoteUrl: string | null = null;
    if (!root) {
      await pushLog(skipEntry('tag', '项目无工作区，跳过本地 tag'));
    } else {
      const git = simpleGit(root);
      try {
        const tagName = `v${release.version}`;
        const tags = await git.tags();
        if (tags.all.includes(tagName)) {
          throw new Error(`tag ${tagName} 已存在于本地仓库（只前滚不回退）`);
        }
        await git.addTag(tagName);
        await git.pushTags('origin');
        tagPushed = true;
        await pushLog(okEntry('tag', `已创建并推送 ${tagName}`));
      } catch (err) {
        tagOk = false;
        await pushLog(
          failEntry('tag', err instanceof Error ? err.message : String(err)),
        );
      }
      try {
        const url = await git.remote(['get-url', 'origin']);
        remoteUrl = typeof url === 'string' ? url.trim() : null;
      } catch {
        remoteUrl = null;
      }
    }

    // ③ GitHub Release（有集成 + remote 可解析 owner/repo 才做）
    let githubOk = true;
    let githubReleased = false;
    const ownerRepo = this.parseOwnerRepo(remoteUrl);
    const integration = ownerRepo
      ? await this.findGithubIntegration(release.projectId)
      : null;
    if (!ownerRepo || !integration) {
      await pushLog(
        skipEntry(
          'github-release',
          !ownerRepo
            ? '无法从 git remote 解析 GitHub 仓库，跳过 GitHub Release'
            : '项目未启用 GitHub 集成，跳过 GitHub Release',
        ),
      );
    } else {
      try {
        const client = await this.githubSdk.getClientForIntegration(
          integration.id,
        );
        const [owner, repo] = ownerRepo;
        await client.createTagRef({
          owner,
          repo,
          tag: `v${release.version}`,
        });
        const created = await client.createRelease({
          owner,
          repo,
          tagName: `v${release.version}`,
          name: release.name ?? `v${release.version}`,
          body: release.notes ?? undefined,
        });
        githubReleased = true;
        await pushLog(
          okEntry(
            'github-release',
            `GitHub Release 已创建: ${created.htmlUrl}`,
          ),
        );
      } catch (err) {
        githubOk = false;
        await pushLog(
          failEntry(
            'github-release',
            err instanceof Error ? err.message : String(err),
          ),
        );
      }
    }

    const ok = changelogOk && tagOk && githubOk;
    const published = await this.prisma.release.update({
      where: { id: releaseId },
      data: {
        status: ok ? 'released' : 'failed',
        releasedAt: ok ? new Date() : null,
        failureReason: ok ? null : '发布执行存在失败步骤，详见 executionLog',
        gitTag: tagPushed ? `v${release.version}` : release.gitTag,
        tagPushed,
        githubReleased,
        executionLog: log as unknown as object[],
      },
    });
    if (ok) {
      this.messageBus.publish('release.created', {
        projectId: release.projectId,
        releaseId,
      });
      this.logger.log(
        `发版完成: project=${release.projectId} version=${release.version}`,
      );
    } else {
      this.logger.warn(
        `发版失败: release=${releaseId} ${log
          .filter((l) => l.status === 'failed')
          .map((l) => l.detail)
          .join('；')}`,
      );
    }
    return published;
  }

  /** 项目 github 集成：project 作用域优先，回落全局 */
  private async findGithubIntegration(projectId: string) {
    const scoped = await this.prisma.integrationConfig.findFirst({
      where: {
        provider: 'github',
        enabled: true,
        scope: 'project',
        projectId,
      },
    });
    if (scoped) return scoped;
    return this.prisma.integrationConfig.findFirst({
      where: { provider: 'github', enabled: true, scope: 'global' },
    });
  }

  /** 从 git remote url 解析 [owner, repo]；解析不了返回 null（诚实跳过 GitHub 步骤） */
  private parseOwnerRepo(remoteUrl: string | null): [string, string] | null {
    if (!remoteUrl) return null;
    const m = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?\/?$/i);
    if (!m) return null;
    return [m[1], m[2]];
  }
}
