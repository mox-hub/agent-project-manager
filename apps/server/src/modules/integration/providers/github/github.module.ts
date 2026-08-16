import { Module } from '@nestjs/common';
import { GitHubController } from './github.controller';
import { GitHubSyncService } from './github-sync.service';
import { GitHubSDKService } from './github-sdk.service';
import { TrustModule } from '@/modules/trust/trust.module';

@Module({
  imports: [TrustModule],
  controllers: [GitHubController],
  providers: [GitHubSyncService, GitHubSDKService],
  exports: [GitHubSyncService, GitHubSDKService],
})
export class GitHubModule {}
