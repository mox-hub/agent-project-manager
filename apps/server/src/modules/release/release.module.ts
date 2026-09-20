import { Module } from '@nestjs/common';
import { ContractModule } from '../contract/contract.module';
import { GitHubModule } from '../integration/providers/github/github.module';
import { ReleaseChangelogSubscriber } from './release-changelog.subscriber';
import { ReleaseGateService } from './release-gate.service';
import { ReleasePublishService } from './release-publish.service';
import { ReleaseService } from './release.service';
import { ReleaseVersionService } from './release-version.service';
import { ReleaseController } from './release.controller';

/**
 * 发版域（契约与文档知识层 v2 纪要切片 1b + CAP-K-03 驱动型发版）：
 * Release 实体 = CHANGELOG 唯一真相 + 主线管道⑥交付执行器。
 * release.created → CHANGELOG.md 单向再生；release.approved → 自动发布执行。
 */
@Module({
  imports: [ContractModule, GitHubModule],
  controllers: [ReleaseController],
  providers: [
    ReleaseService,
    ReleaseGateService,
    ReleaseVersionService,
    ReleasePublishService,
    ReleaseChangelogSubscriber,
  ],
  exports: [ReleaseService],
})
export class ReleaseModule {}
