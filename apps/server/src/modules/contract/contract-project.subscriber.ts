import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ContractSeedService } from './contract-seed.service';

/**
 * project.created → 种生契约三件套（v2 纪要 §16 切片 1a 出口标准第一条）。
 * 种生失败不阻断项目创建，仅记录告警（诚实降级）。
 */
@Injectable()
export class ContractProjectSubscriber {
  private readonly logger = new Logger(ContractProjectSubscriber.name);

  constructor(private readonly seed: ContractSeedService) {}

  @OnEvent('project.created')
  async onProjectCreated(payload: { projectId?: string }): Promise<void> {
    if (!payload?.projectId) return;
    try {
      const result = await this.seed.seedProjectContractFiles(
        payload.projectId,
      );
      this.logger.log(
        `契约三件套种生完成: ${payload.projectId} → ${result.files
          .map((f) => `${f.path}:${f.action}`)
          .join(', ')}`,
      );
    } catch (err) {
      this.logger.warn(
        `契约三件套种生跳过: ${payload.projectId} — ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
