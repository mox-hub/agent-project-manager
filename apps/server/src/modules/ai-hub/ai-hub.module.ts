import { Module, forwardRef } from '@nestjs/common';
import { AiHubController } from './ai-hub.controller';
import { AiHubService } from './ai-hub.service';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { ContextBuilderService } from './services/context-builder.service';
import { AiWorkerCoordinatorService } from './services/ai-worker-coordinator.service';
import { RuntimeModule } from '../runtime/runtime.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [forwardRef(() => RuntimeModule), forwardRef(() => TaskModule)],
  controllers: [AiHubController],
  providers: [
    AiHubService,
    OpenAIAdapter,
    ContextBuilderService,
    AiWorkerCoordinatorService,
  ],
  exports: [AiHubService, AiWorkerCoordinatorService, ContextBuilderService],
})
export class AiHubModule {}
