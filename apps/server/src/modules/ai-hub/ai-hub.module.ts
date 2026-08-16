import { Module, forwardRef } from '@nestjs/common';
import { AiHubController } from './ai-hub.controller';
import { AiHubService } from './ai-hub.service';
import { ContextBuilderService } from './services/context-builder.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { ProviderConfigService } from './services/provider-config.service';
import { AiSdkAdapterFactory } from './adapters/ai-sdk-adapter.factory';
import { AiWorkerCoordinatorService } from './services/ai-worker-coordinator.service';
import { RuntimeModule } from '../runtime/runtime.module';
import { TaskModule } from '../task/task.module';
import { CliDispatchModule } from '../cli-dispatch/cli-dispatch.module';

@Module({
  imports: [
    forwardRef(() => RuntimeModule),
    forwardRef(() => TaskModule),
    forwardRef(() => CliDispatchModule),
  ],
  controllers: [AiHubController],
  providers: [
    AiHubService,
    ContextBuilderService,
    AdapterRegistryService,
    ProviderConfigService,
    AiSdkAdapterFactory,
    AiWorkerCoordinatorService,
  ],
  exports: [
    AiHubService,
    AiWorkerCoordinatorService,
    ContextBuilderService,
    AdapterRegistryService,
    ProviderConfigService,
  ],
})
export class AiHubModule {}
