import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DocRegistryService } from './doc-registry.service';

/**
 * T0 物化提升订阅器（契约与文档知识层 v2 纪要 §11）：
 * 文档「开始被消费那刻」触发 digest 物化——published 事件与
 * DocumentTaskLink 引用（task-link service 内联 enqueue）。失败仅告警。
 */
@Injectable()
export class DocDigestT0Subscriber {
  private readonly logger = new Logger(DocDigestT0Subscriber.name);

  constructor(private readonly docRegistry: DocRegistryService) {}

  @OnEvent('document.published')
  async onDocumentPublished(payload: { documentId?: string }): Promise<void> {
    if (!payload?.documentId) return;
    try {
      const queued = await this.docRegistry.enqueueDigest(payload.documentId);
      if (queued) {
        this.logger.log(
          `T0 物化提升：文档已发布，digest 排队 ${payload.documentId}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `T0 digest 排队跳过: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
