import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { LinearModule } from './providers/linear/linear.module';
import { GitHubModule } from './providers/github/github.module';

@Module({
  imports: [LinearModule, GitHubModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
