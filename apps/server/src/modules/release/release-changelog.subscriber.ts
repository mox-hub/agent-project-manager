import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReleaseService } from './release.service';

/**
 * release.created → CHANGELOG.md 单向再生（v2 纪要切片 1b 出口标准）。
 * 失败仅告警不阻断发版事件链。
 */
@Injectable()
export class ReleaseChangelogSubscriber {
  private readonly logger = new Logger(ReleaseChangelogSubscriber.name);

  constructor(private readonly releases: ReleaseService) {}

  @OnEvent('release.created')
  async onReleaseCreated(payload: {
    projectId?: string;
    releaseId?: string;
  }): Promise<void> {
    if (!payload?.projectId) return;
    try {
      const result = await this.releases.exportChangelog(payload.projectId);
      this.logger.log(
        `CHANGELOG 再生完成: project=${payload.projectId} release=${payload.releaseId} exported=${result.exported}${result.reason ? ` (${result.reason})` : ''}`,
      );
    } catch (err) {
      this.logger.warn(
        `CHANGELOG 再生跳过: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
