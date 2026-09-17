import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MessageBusService } from '../../../core/message-bus/message-bus.service';
import { RevisionImpactService } from './revision-impact.service';

/**
 * 需求修订影响订阅器（CAP-P-01 批一 P0）：
 * 订阅 document.updated，仅 content 实质修订（contentChanged）时进入影响分析；
 * 非需求类文档 / 无影响面在服务内自行收敛。旁路语义：失败仅告警不外抛
 * （对齐 DocDigestT0Subscriber 模式），不阻断文档更新主流程。
 */
@Injectable()
export class RevisionImpactSubscriber implements OnModuleDestroy {
  private static readonly EVENT = 'document.updated';
  private readonly logger = new Logger(RevisionImpactSubscriber.name);
  private readonly unsubscribe: () => void;

  constructor(
    private readonly messageBus: MessageBusService,
    private readonly revisionImpactService: RevisionImpactService,
  ) {
    this.unsubscribe = this.messageBus.subscribe(
      RevisionImpactSubscriber.EVENT,
      (payload: { documentId?: string; contentChanged?: boolean }) =>
        this.handleDocumentUpdated(payload ?? {}),
    );
  }

  onModuleDestroy() {
    this.unsubscribe();
  }

  async handleDocumentUpdated(payload: {
    documentId?: string;
    contentChanged?: boolean;
  }): Promise<void> {
    if (!payload.documentId || payload.contentChanged !== true) return;
    try {
      await this.revisionImpactService.analyzeOnUpdate(payload.documentId);
    } catch (err) {
      this.logger.warn(
        `修订影响订阅处理异常: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
