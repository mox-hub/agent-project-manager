import { Module } from '@nestjs/common';
import { AiHubController } from './ai-hub.controller';
import { AiHubService } from './ai-hub.service';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { ContextBuilderService } from './services/context-builder.service';

@Module({
  controllers: [AiHubController],
  providers: [AiHubService, OpenAIAdapter, ContextBuilderService],
  exports: [AiHubService],
})
export class AiHubModule {}
