import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { ProfileService } from './profile.service';
import {
  PROFILE_DRAFT_ARTIFACT_TYPE,
  tryParseProfileDraft,
  validateProfileDraft,
} from './profile-draft.schema';

/**
 * 考古推式消化（v2 纪要切片 2「消化器事件驱动」最小形态）：
 * 考古执行到 completed 时自动 ingest，前端轮询触发不再是唯一入口
 * （页面没开/轮询失败也能落草稿）。ingest 本身内容去重，与前端显式调用幂等共存。
 * 注意事件监听顺序不保证：若本监听先于 dispatch 落终态执行，则延迟重试一次。
 */
@Injectable()
export class ArchaeologyAutoIngestSubscriber {
  private readonly logger = new Logger(ArchaeologyAutoIngestSubscriber.name);
  private static readonly RETRY_DELAY_MS = 5000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
  ) {}

  @OnEvent('runtime.execution.result')
  async onExecutionResult(payload: {
    executionRunId?: string;
    status?: string;
  }): Promise<void> {
    if (!payload?.executionRunId || payload.status !== 'completed') return;
    try {
      await this.tryIngest(payload.executionRunId, false);
    } catch (err) {
      this.logger.warn(
        `auto ingest skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async tryIngest(
    executionId: string,
    retried: boolean,
  ): Promise<void> {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: { artifacts: true },
    });
    if (!execution?.projectId) return;

    // 执行行尚未被 dispatch 监听落到终态 → 延迟重试一次（产物可能还没持久化）
    if (execution.status !== 'completed' && !retried) {
      setTimeout(() => {
        this.tryIngest(executionId, true).catch((err: unknown) =>
          this.logger.warn(
            `auto ingest retry failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }, ArchaeologyAutoIngestSubscriber.RETRY_DELAY_MS);
      return;
    }

    const hasDraftArtifact = execution.artifacts.some(
      (a) => a.artifactType === PROFILE_DRAFT_ARTIFACT_TYPE,
    );
    let draftReady = hasDraftArtifact;
    if (!draftReady) {
      // 兜底：产物直接内嵌在 output（文本内嵌 JSON 也算）
      const candidate = tryParseProfileDraft(execution.output);
      draftReady = validateProfileDraft(candidate).valid;
    }
    if (!draftReady) return;

    const result = await this.profileService.ingestArchaeology(
      execution.projectId,
      execution.id,
      execution.createdBy ?? 'system',
    );
    this.logger.log(
      `auto ingest ${execution.id}: created=${result.created} skipped=${result.skipped}`,
    );
  }
}
