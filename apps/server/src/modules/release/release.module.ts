import { Module } from '@nestjs/common';
import { ContractModule } from '../contract/contract.module';
import { ReleaseChangelogSubscriber } from './release-changelog.subscriber';
import { ReleaseService } from './release.service';

/**
 * 发版域（契约与文档知识层 v2 纪要切片 1b）：
 * Release 实体 = CHANGELOG 唯一真相；release.created 事件经 message-bus
 * 驱动 CHANGELOG.md 单向再生。V1 无 REST 面（API 随发版页开放）。
 */
@Module({
  imports: [ContractModule],
  providers: [ReleaseService, ReleaseChangelogSubscriber],
  exports: [ReleaseService],
})
export class ReleaseModule {}
