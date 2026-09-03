import { Module, forwardRef } from '@nestjs/common';
import { AiHubController } from './ai-hub.controller';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AiHubService } from './ai-hub.service';
import { ContextBuilderService } from './services/context-builder.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { ProviderConfigService } from './services/provider-config.service';
import { AiSdkAdapterFactory } from './adapters/ai-sdk-adapter.factory';
import { AiWorkerCoordinatorService } from './services/ai-worker-coordinator.service';
import { RuntimeModule } from '../runtime/runtime.module';
import { TaskModule } from '../task/task.module';
import { CliDispatchModule } from '../cli-dispatch/cli-dispatch.module';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports: [
    forwardRef(() => RuntimeModule),
    forwardRef(() => TaskModule),
    forwardRef(() => CliDispatchModule),
    forwardRef(() => ExecutionModule),
  ],
  controllers: [AiHubController, AssistantController],
  providers: [
    AiHubService,
    AssistantService,
    ContextBuilderService,
    AdapterRegistryService,
    ProviderConfigService,
    AiSdkAdapterFactory,
    AiWorkerCoordinatorService,
  ],
  exports: [
    AiHubService,
    AssistantService,
    AiWorkerCoordinatorService,
    ContextBuilderService,
    AdapterRegistryService,
    ProviderConfigService,
  ],
})
export class AiHubModule {}
